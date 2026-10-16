const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, fetch, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, {
    exports, process: { env: {} }, fetch, AbortController, setTimeout, clearTimeout,
    require: name => { if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`); return dependencies[name]; },
  });
  return exports;
}
const service = fetch => load('src/services/notificaciones.ts', fetch, { './api': load('src/services/api.ts', fetch) });
const session = { token: 'example', user: { id: 'user-1', role: 'ALUMNO' } };
const item = { id: 'notice-1', userId: 'user-1', tipo: 'TAREA_ASIGNADA', titulo: 'Informe', mensaje: 'Revisa tu aula.', leida: false, fecha: '2026-10-16T12:00:00Z' };
const signal = () => new AbortController().signal;
const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });

test('all account roles query their own notifications with a bearer token', async () => {
  for (const role of ['ALUMNO', 'PROFESOR', 'ADMIN', 'SUPERVISOR']) {
    const api = service(async (url, options) => {
      assert.ok(url.endsWith('/api/v1/notificaciones')); assert.equal(options.method, 'GET');
      assert.equal(options.headers.Authorization, 'Bearer example');
      return response([item]);
    });
    assert.equal((await api.getNotificaciones({ ...session, user: { ...session.user, role } }, signal()))[0].id, item.id);
  }
});

test('an empty notification list is valid and new type names remain readable', async () => {
  assert.equal((await service(async () => response([])).getNotificaciones(session, signal())).length, 0);
  assert.equal((await service(async () => response([{ ...item, tipo: 'NUEVO_TIPO' }])).getNotificaciones(session, signal()))[0].tipo, 'NUEVO_TIPO');
});

test('foreign, malformed and duplicate notifications are rejected', async () => {
  for (const data of [null, {}, [{ ...item, userId: 'another-user' }], [{ ...item, leida: 'false' }], [{ ...item, mensaje: null }], [item, item]]) {
    await assert.rejects(service(async () => response(data)).getNotificaciones(session, signal()), error => error.status === 502);
  }
});

test('marking one notification sends a PUT without a body and accepts only its 204 acknowledgement', async () => {
  const notice = { ...item, id: 'notice/one?x=2' };
  const api = service(async (url, options) => {
    assert.ok(url.endsWith(`/notificaciones/${encodeURIComponent(notice.id)}/read`));
    assert.equal(options.method, 'PUT'); assert.equal(options.headers.Authorization, 'Bearer example');
    assert.equal(options.body, undefined); assert.equal(options.headers['Content-Type'], undefined);
    return { ok: true, status: 204, json: async () => { throw new Error('A 204 has no JSON body'); } };
  });
  await api.markNotificacionRead(session, notice, signal());
  assert.equal(notice.leida, false, 'The service must not mutate the existing UI snapshot');
});

test('mark-all uses the published endpoint and never supplies a user ID', async () => {
  const api = service(async (url, options) => {
    assert.ok(url.endsWith('/notificaciones/read-all')); assert.equal(options.method, 'PUT');
    assert.equal(options.body, undefined);
    return response(undefined, 204);
  });
  await api.markAllNotificacionesRead(session, signal());
});

test('a foreign notification cannot be marked by the client', async () => {
  let calls = 0;
  const api = service(async () => { calls++; return response(undefined, 204); });
  await assert.rejects(api.markNotificacionRead(session, { ...item, userId: 'another-user' }, signal()), error => error.status === 403);
  assert.equal(calls, 0);
});

test('unexpected successful responses and rejected writes are not reported as read', async () => {
  for (const status of [200, 201, 202, 401, 403, 500]) {
    let calls = 0;
    const api = service(async () => { calls++; return response({ detail: 'private server detail' }, status); });
    await assert.rejects(api.markNotificacionRead(session, item, signal()), error => error.status === (status < 400 ? 502 : status) && !error.message.includes('private'));
    assert.equal(calls, 1, 'Writes must not be automatically repeated');
  }
});

test('a pending write can be cancelled when its account leaves', async () => {
  const controller = new AbortController();
  const api = service(async (_, options) => new Promise((_, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
  }));
  const pending = api.markAllNotificacionesRead(session, controller.signal);
  controller.abort();
  await assert.rejects(pending, error => error.status === 0);
});
