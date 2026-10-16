const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, fetch, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, process: { env: {} }, fetch, AbortController, setTimeout, clearTimeout,
    require: name => { if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`); return dependencies[name]; },
  });
  return exports;
}
const service = fetch => load('src/services/centro.ts', fetch, { './api': load('src/services/api.ts', fetch) });
const session = { token: 'example', user: { id: 'student-1', role: 'ALUMNO' } };
const signal = () => new AbortController().signal;
const centroDraft = { razonSocial: 'Centro de prueba', ruc: '20123456789', direccion: 'Calle de prueba 123', sector: 'Comunicaciones', telefono: '+51 999 111 222', email: 'contacto@example.org' };
const centro = { ...centroDraft, id: 'centro-1', practicanteId: session.user.id, fechaRegistro: '2026-10-16T12:00:00Z' };
const supervisorDraft = { nombres: 'Ana', apellidos: 'Prueba', cargo: 'Supervisora', telefono: '999111222', email: 'supervision@example.org' };
const supervisor = { ...supervisorDraft, id: 'supervisor-1', empresaId: centro.id, userId: null };
const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });

test('own centro and its supervisor allow an explicit empty response', async () => {
  const paths = [];
  const api = service(async (url, options) => {
    paths.push(url); assert.equal(options.method, 'GET'); assert.equal(options.headers.Authorization, 'Bearer example');
    return response(null);
  });
  assert.equal(await api.getCentro(session, signal()), null);
  assert.equal(await api.getSupervisor(session, centro, signal()), null);
  assert.ok(paths[0].endsWith('/empresa/mine'));
  assert.ok(paths[1].endsWith('/empresa/centro-1/supervisor'));
});

test('centro registration normalizes contacts and sends only the published fields', async () => {
  const api = service(async (url, options) => {
    assert.ok(url.endsWith('/api/v1/empresa')); assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer example');
    assert.deepEqual(JSON.parse(options.body), centroDraft);
    return response(centro, 201);
  });
  const result = await api.registerCentro(session, { ...centroDraft, razonSocial: `  ${centroDraft.razonSocial}  `, email: ' CONTACTO@EXAMPLE.ORG ', practicanteId: 'another-user', role: 'ADMIN' }, signal());
  assert.equal(result.practicanteId, session.user.id);
});

test('invalid required fields, RUC, email and phone never reach the server', async () => {
  let calls = 0;
  const api = service(async () => { calls++; return response(centro); });
  for (const invalid of [{ razonSocial: ' ' }, { ruc: '123' }, { ruc: '2012345678a' }, { direccion: '' }, { sector: '' }, { email: 'invalid' }, { telefono: '123' }, { telefono: '999<script>111' }, { direccion: 'x'.repeat(241) }]) {
    await assert.rejects(api.registerCentro(session, { ...centroDraft, ...invalid }, signal()), error => error.status === 400);
  }
  for (const invalid of [{ nombres: '' }, { apellidos: '' }, { cargo: '' }, { email: 'invalid' }]) {
    await assert.rejects(api.registerSupervisor(session, centro, { ...supervisorDraft, ...invalid }, signal()), error => error.status === 400);
  }
  assert.equal(calls, 0);
});

test('other roles and foreign centros never request registration or supervisor data', async () => {
  let calls = 0;
  const api = service(async () => { calls++; return response(null); });
  const admin = { ...session, user: { ...session.user, role: 'ADMIN' } };
  const foreign = { ...centro, practicanteId: 'another-student' };
  await assert.rejects(api.getCentro(admin, signal()), error => error.status === 403);
  await assert.rejects(api.registerCentro(admin, centroDraft, signal()), error => error.status === 403);
  await assert.rejects(api.getSupervisor(session, foreign, signal()), error => error.status === 403);
  await assert.rejects(api.registerSupervisor(session, foreign, supervisorDraft, signal()), error => error.status === 403);
  assert.equal(calls, 0);
});

test('supervisor registration encodes the owned centro ID and does not assign an account', async () => {
  const owned = { ...centro, id: 'centro/one?x=2' };
  const api = service(async (url, options) => {
    assert.ok(url.endsWith(`/empresa/${encodeURIComponent(owned.id)}/supervisor`));
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), supervisorDraft);
    return response({ ...supervisor, empresaId: owned.id }, 201);
  });
  assert.equal((await api.registerSupervisor(session, owned, { ...supervisorDraft, userId: 'admin', empresaId: 'foreign' }, signal())).userId, null);
});

test('malformed or mismatched responses are rejected without exposing another record', async () => {
  for (const payload of [[], {}, { ...centro, practicanteId: 'another-user' }]) {
    await assert.rejects(service(async () => response(payload)).getCentro(session, signal()), error => error.status === 502);
  }
  await assert.rejects(service(async () => response({ ...supervisor, empresaId: 'foreign' })).getSupervisor(session, centro, signal()), error => error.status === 502);
  await assert.rejects(service(async () => response(null, 201)).registerCentro(session, centroDraft, signal()), error => error.status === 502);
});

test('an optional supervisor account remains optional in the response', async () => {
  const { userId, ...withoutAccount } = supervisor;
  assert.equal((await service(async () => response(withoutAccount)).getSupervisor(session, centro, signal())).userId, undefined);
});

test('conflicts, rejected input and expired sessions retain their distinct status', async () => {
  for (const status of [400, 401, 403, 409, 422, 500]) {
    const api = service(async () => response({ detail: 'private database detail' }, status));
    await assert.rejects(api.registerCentro(session, centroDraft, signal()), error => error.status === status && !error.message.includes('database'));
    await assert.rejects(api.registerSupervisor(session, centro, supervisorDraft, signal()), error => error.status === status && !error.message.includes('database'));
  }
});

test('a failed registration is never automatically repeated', async () => {
  let calls = 0;
  const api = service(async () => { calls++; throw new Error('connection failed after sending'); });
  await assert.rejects(api.registerCentro(session, centroDraft, signal()), error => error.status === 0);
  assert.equal(calls, 1);
});
