const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function load(file, deps = {}, fetch, apiUrl = 'http://localhost:8001') {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: key => { if (!(key in deps)) throw new Error('Unexpected dependency ' + key); return deps[key]; }, fetch, process: { env: { EXPO_PUBLIC_API_URL: apiUrl } }, AbortController, AbortSignal, URLSearchParams, setTimeout, clearTimeout });
  return exports;
}
const alice = { token: 'fixture', user: { id: 'alice', role: 'ALUMNO' } }, bob = { token: 'fixture-bob', user: { id: 'bob', role: 'ALUMNO' } };
const context = { type: 'mensaje', aula: { id: 'a', nombre: 'Aula', periodo: 'TEST', estado: 'ACTIVA' }, peerId: 'teacher' };
function storage() {
  const data = new Map(), memory = { getItem: async key => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); }, removeItem: async key => { data.delete(key); }, getAllKeys: async () => [...data.keys()] };
  const api = load('src/services/api.ts');
  const store = load('src/storage/drafts.ts', { '@react-native-async-storage/async-storage': { __esModule: true, default: memory }, '@/services/api': api });
  return { data, memory, api, store };
}
function entry(api, resource, status = 'POR_ENVIAR') { return { version: 1, api: api.API_URL, userId: alice.user.id, kind: 'comunicacion', resource, title: 'Mensaje de prueba', context, value: { texto: 'Consulta de prueba', solicitudId: 'operation-00000000001', confirmado: status === 'POR_ENVIAR' ? 'si' : '' }, status, updatedAt: '2026-10-23T12:00:00Z' }; }
test('communication drafts stay isolated by API and account and support reload', async () => {
  const { memory, api, store } = storage(), resource = JSON.stringify(['mensaje', 'a', 'teacher']), key = store.draftKey(alice, 'comunicacion', resource);
  await store.writeDraft(key, entry(api, resource, 'BORRADOR'));
  assert.equal((await store.listDrafts(alice)).length, 1); assert.equal((await store.listDrafts(bob)).length, 0);
  await assert.rejects(store.readDraft(bob, key));
  const otherApi = load('src/storage/drafts.ts', { '@react-native-async-storage/async-storage': { __esModule: true, default: memory }, '@/services/api': { ...api, API_URL: 'http://localhost:8002' } });
  assert.equal((await otherApi.listDrafts(alice)).length, 0);
  const reloaded = load('src/storage/drafts.ts', { '@react-native-async-storage/async-storage': { __esModule: true, default: memory }, '@/services/api': api });
  assert.equal((await reloaded.readDraft(alice, key)).value.texto, 'Consulta de prueba');
});
test('only confirmed communication is sent; failures keep the operation and concurrent retries share a flight', async () => {
  const { api, store } = storage(), resource = JSON.stringify(['mensaje', 'a', 'teacher']), key = store.draftKey(alice, 'comunicacion', resource);
  let fail = true; const calls = [];
  const communication = load('src/services/communication-drafts.ts', { './api': api, './comunidad': { contentText: value => { if (!value.trim()) throw new Error('empty'); return value.trim(); } }, './mensajes': { enviarMensaje: async (_s, _a, _p, value, operation) => { calls.push(operation); if (fail) { fail = false; throw new api.ApiError(0, 'Uncertain'); } return { id: 'saved', texto: value.texto }; } } });
  const sync = load('src/services/sync-drafts.ts', { './api': api, './horas': {}, './aulas': {}, '@/storage/drafts': store, './communication-drafts': communication });
  await store.writeDraft(key, entry(api, resource, 'BORRADOR'));
  assert.equal((await sync.syncPendingDrafts(alice)).sent, 0); assert.equal(calls.length, 0);
  await store.writeDraft(key, entry(api, resource));
  const first = await sync.syncPendingDrafts(alice); assert.equal(first.sent, 0); assert.equal(first.failures.length, 1);
  assert.equal((await store.readDraft(alice, key)).status, 'POR_ENVIAR');
  await Promise.all([sync.syncDraft(alice, key), sync.syncDraft(alice, key)]);
  assert.deepEqual(calls, ['operation-00000000001', 'operation-00000000001']); assert.equal((await store.listDrafts(alice)).length, 0);
});
test('an incompatible communication destination stays pending and never dispatches', async () => {
  const { api, store } = storage(), resource = 'bad-destination', key = store.draftKey(alice, 'comunicacion', resource);
  const communication = load('src/services/communication-drafts.ts', { './api': api, './comunidad': {}, './mensajes': {} });
  const sync = load('src/services/sync-drafts.ts', { './api': api, './horas': {}, './aulas': {}, '@/storage/drafts': store, './communication-drafts': communication });
  await store.writeDraft(key, { ...entry(api, resource), context: { type: 'mensaje', aula: null } });
  await assert.rejects(sync.syncDraft(alice, key), error => error.status === 400);
  assert.equal((await store.readDraft(alice, key)).status, 'POR_ENVIAR');
});
test('private pages encode their context and reject another recipient or duplicate identifiers', async () => {
  let body, lastUrl;
  const fetch = async url => { lastUrl = url; return { ok: true, status: 200, json: async () => body }; };
  const api = load('src/services/api.ts', {}, fetch), community = load('src/services/comunidad.ts', { './api': api });
  const messages = load('src/services/mensajes.ts', { './api': api, './comunidad': community });
  const pages = load('src/services/module-pages.ts', { './api': api, './comunidad': community, './mensajes': messages });
  const row = { id: 'm', aulaId: 'a/1', remitenteId: 'teacher', remitenteNombre: 'Docente', destinatarioId: 'alice', texto: 'Privado', mio: false, leido: false, fecha: '2026-10-23T12:00:00Z' };
  body = { items: [row], total: 30, siguiente: 'next', noLeidos: 30 };
  assert.equal((await pages.getDirectMessagePage(alice, 'a/1', 'teacher', new AbortController().signal)).noLeidos, 30);
  assert.ok(lastUrl.includes('/aulas/a%2F1/mensajes/teacher/pagina?limite=20'));
  body = { ...body, items: [{ ...row, destinatarioId: 'bob' }] };
  await assert.rejects(pages.getDirectMessagePage(alice, 'a/1', 'teacher', new AbortController().signal), error => error.status === 502);
  body = { ...body, items: [row, row] };
  await assert.rejects(pages.getDirectMessagePage(alice, 'a/1', 'teacher', new AbortController().signal), error => error.status === 502);
});
