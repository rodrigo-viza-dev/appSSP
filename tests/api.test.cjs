const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(fetch) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/services/api.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, process: { env: {} }, fetch, AbortController, setTimeout, clearTimeout });
  return exports;
}
test('login sends credentials as JSON without a bearer token', async () => {
  const api = load(async (url, options) => {
    assert.equal(url, 'https://back-cs-de-la-com.vercel.app/api/v1/auth/login');
    assert.equal(options.method, 'POST'); assert.equal(options.headers.Authorization, undefined);
    assert.deepEqual(JSON.parse(options.body), { email: 'test@example.org', password: 'test' });
    return { ok: true, status: 200, json: async () => ({ token: 'example' }) };
  });
  assert.equal((await api.request('/auth/login', undefined, { email: 'test@example.org', password: 'test' })).token, 'example');
});
test('401 and 403 stay distinct and never expose server detail', async () => {
  for (const status of [401, 403]) {
    const api = load(async () => ({ ok: false, status, json: async () => ({ detail: 'private' }) }));
    await assert.rejects(api.request('/private', 'example'), error => error.status === status && !error.message.includes('private'));
  }
});
test('network failure produces a recoverable connection error', async () => {
  const api = load(async () => { throw new TypeError('fetch failed'); });
  await assert.rejects(api.request('/aulas'), error => error.status === 0 && error.message.includes('conectar'));
});
test('student dashboard uses private endpoints and bearer token', async () => {
  const paths = [];
  const api = load(async (url, options) => {
    paths.push(url); assert.equal(options.headers.Authorization, 'Bearer example');
    return { ok: true, status: 200, json: async () => url.endsWith('/actual') ? null : [] };
  });
  const result = await api.getDashboard({ token: 'example', user: { role: 'ALUMNO' } }, new AbortController().signal);
  assert.equal(result.kind, 'ALUMNO'); assert.equal(result.practica, null); assert.equal(paths.length, 2);
  assert.ok(paths.some(path => path.endsWith('/alumno/mis-aulas')));
});
test('unknown roles and incomplete identity cannot start a session', () => {
  const api = load();
  const user = { id: '1', nombres: 'Test', apellidos: 'Test', email: 'test@example.org', role: 'ADMIN' };
  assert.equal(api.isSession({ token: 'example', user }), true);
  assert.equal(api.isSession({ token: 'example', user: { ...user, role: 'OTHER' } }), false);
  assert.equal(api.isSession({ token: '', user }), false);
  assert.equal(api.isSession({ token: 'example', user: { role: 'ADMIN' } }), false);
});
