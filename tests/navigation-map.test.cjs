const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/shared/navigation-map.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: api });
test('student main routes and original detail stack are preserved', () => {
  assert.equal(api.mapAppHref('ALUMNO', '/panel', '/panel'), '/alumno/inicio');
  assert.equal(api.mapAppHref('ALUMNO', '/alumno/mas', '/mis-horas?practicaId=p'), '/alumno/bitacora?practicaId=p');
  const result = api.mapAppHref('ALUMNO', '/alumno/avisos/aviso', { pathname: '/tarea', params: { aulaId: 'a', tareaId: 't' } });
  assert.equal(result.pathname, '/alumno/avisos/tarea'); assert.equal(result.params.tareaId, 't');
  assert.equal(api.mapAppHref('ALUMNO', '/documentos', '/documentos?aulaId=a'), '/alumno/aulas/documentos?aulaId=a');
});
test('staff primary tabs depend on the current role', () => {
  assert.equal(api.mapAppHref('PROFESOR', '/panel', '/docencia'), '/equipo/trabajo');
  assert.equal(api.mapAppHref('SUPERVISOR', '/panel', '/mis-horas'), '/equipo/revision');
  assert.equal(api.mapAppHref('ADMIN', '/panel', '/reportes'), '/equipo/revision');
  for (const role of ['PROFESOR', 'SUPERVISOR', 'ADMIN']) assert.equal(api.mapAppHref(role, '/panel', '/mis-avisos'), '/equipo/avisos');
});
test('deep links keep their exact resource and query rather than selecting a different practice', () => {
  const value = api.mapAppHref('SUPERVISOR', '/mis-horas', { pathname: '/mis-horas', params: { practicaId: 'specific-practice' } });
  assert.equal(value.pathname, '/equipo/revision/mis-horas'); assert.equal(value.params.practicaId, 'specific-practice');
  assert.equal(api.mapAppHref('SUPERVISOR', '/equipo/trabajo/expediente', '/mis-horas?practicaId=a%2Fb'), '/equipo/trabajo/mis-horas?practicaId=a%2Fb');
  assert.equal(api.mapAppHref('PROFESOR', '/equipo/revision', '/expediente?practicaId=p'), '/equipo/revision/expediente?practicaId=p');
});
test('teacher and admin details stay inside the tab from which they opened', () => {
  assert.equal(api.mapAppHref('PROFESOR', '/equipo/trabajo/aula-docente', '/mensajes?aulaId=a'), '/equipo/trabajo/mensajes?aulaId=a');
  assert.equal(api.mapAppHref('ADMIN', '/equipo/trabajo', '/administracion'), '/equipo/trabajo/administracion');
  assert.equal(api.mapAppHref('ADMIN', '/equipo/mas', '/auditoria'), '/equipo/mas/auditoria');
  assert.equal(api.mapAppHref('ADMIN', '/administracion', '/administracion'), '/equipo/trabajo/administracion');
});
test('view permissions exclude private messaging and management from unrelated roles', () => {
  assert.equal(api.staffAllows('PROFESOR', 'mensajes'), true); assert.equal(api.staffAllows('ADMIN', 'mensajes'), false);
  assert.equal(api.staffAllows('SUPERVISOR', 'mis-horas'), true); assert.equal(api.staffAllows('PROFESOR', 'mis-horas'), false);
  assert.equal(api.staffAllows('SUPERVISOR', 'administracion'), false); assert.equal(api.staffAllows('PROFESOR', 'asignaciones'), false);
  assert.equal(api.staffAllows('ALUMNO', 'expediente'), false);
});
test('anonymous and already mapped links stay unchanged', () => {
  const href = { pathname: '/expediente', params: { practicaId: 'p' } };
  assert.equal(api.mapAppHref(undefined, '/', href), href);
  assert.equal(api.mapAppHref('ADMIN', '/equipo/mas', '/equipo/trabajo'), '/equipo/trabajo');
  assert.equal(api.mapAppHref('SUPERVISOR', '/equipo/mas', '/mensajes'), '/mensajes');
});
