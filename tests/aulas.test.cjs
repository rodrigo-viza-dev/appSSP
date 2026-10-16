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
function service(fetch) {
  return load('src/services/aulas.ts', fetch, { './api': load('src/services/api.ts', fetch) });
}
const session = { token: 'example', user: { id: 'student-1', role: 'ALUMNO' } };
const signal = () => new AbortController().signal;
const response = data => ({ ok: true, status: 200, json: async () => data });
const aula = { id: 'aula-1', nombre: 'Comunicación', profesorNombre: 'Docente', ciclo: '2026-II', estado: 'ACTIVA', progreso: 25, semanaActual: 4, semanasTotales: 16 };
const tarea = { id: 'task-1', aulaId: 'aula-1', titulo: 'Informe', descripcion: 'Descripción', fechaLimite: null, createdAt: '2026-10-16T12:00:00Z', entrega: null };

test('aula requests encode the identifier and send a private GET', async () => {
  const id = 'aula/uno?ciclo=2';
  const api = service(async (url, options) => {
    assert.equal(url, `https://back-cs-de-la-com.vercel.app/api/v1/alumno/aulas/${encodeURIComponent(id)}`);
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, 'Bearer example');
    assert.equal(options.body, undefined);
    return response({ ...aula, id });
  });
  assert.equal((await api.getAula(session, id, signal())).nombre, 'Comunicación');
});

test('other roles and empty links never request student resources', async () => {
  const api = service(async () => { throw new Error('No request expected'); });
  await assert.rejects(api.getAula({ ...session, user: { role: 'ADMIN' } }, aula.id, signal()), error => error.status === 403);
  await assert.rejects(api.getTareas(session, ' ', signal()), error => error.status === 400);
  await assert.rejects(api.getTarea(session, aula.id, '', signal()), error => error.status === 400);
});

test('task detail uses the published list and handles a missing task', async () => {
  const api = service(async url => { assert.ok(url.endsWith('/alumno/aulas/aula-1/tareas')); return response([tarea]); });
  assert.equal((await api.getTarea(session, aula.id, tarea.id, signal())).id, tarea.id);
  await assert.rejects(api.getTarea(session, aula.id, 'missing', signal()), error => error.status === 404);
});

test('empty tasks and ungraded results remain valid empty data', async () => {
  const api = service(async url => response(url.endsWith('/tareas') ? [] : { promedio: null, tareasTotal: 0, tareasEntregadas: 0, detalle: [] }));
  assert.equal((await api.getTareas(session, aula.id, signal())).length, 0);
  assert.equal((await api.getCalificaciones(session, aula.id, signal())).promedio, null);
});

test('a zero grade and its feedback survive the API contract', async () => {
  const entrega = { id: 'delivery-1', tareaId: tarea.id, alumnoId: session.user.id, descripcion: 'Mi informe', comentario: '', archivoId: null, estado: 'CALIFICADA', nota: 0, retroalimentacion: 'Revisar fuentes', createdAt: '2026-10-16T12:00:00Z' };
  const api = service(async url => response(url.endsWith('/tareas') ? [{ ...tarea, entrega }] : {
    promedio: 0, tareasTotal: 1, tareasEntregadas: 1,
    detalle: [{ tareaId: tarea.id, tareaTitulo: tarea.titulo, nota: 0, retroalimentacion: entrega.retroalimentacion, estado: 'CALIFICADA', entregadaEn: entrega.createdAt }],
  }));
  assert.equal((await api.getTareas(session, aula.id, signal()))[0].entrega.nota, 0);
  const notas = await api.getCalificaciones(session, aula.id, signal());
  assert.equal(notas.promedio, 0);
  assert.equal(notas.detalle[0].retroalimentacion, 'Revisar fuentes');
});

test('malformed and mismatched resources are rejected before display', async () => {
  for (const payload of [null, {}, [{ ...tarea, aulaId: 'another-aula' }], [{ ...tarea, entrega: {} }]]) {
    await assert.rejects(service(async () => response(payload)).getTareas(session, aula.id, signal()), error => error.status === 502);
  }
  await assert.rejects(service(async () => response({ ...aula, progreso: 150 })).getAula(session, aula.id, signal()), error => error.status === 502);
  await assert.rejects(service(async () => response({ ...aula, estado: ['ACTIVA'] })).getAula(session, aula.id, signal()), error => error.status === 502);
  await assert.rejects(service(async () => response({ promedio: 0, detalle: null })).getCalificaciones(session, aula.id, signal()), error => error.status === 502);
});

test('an embedded delivery must belong to the task and current student', async () => {
  const entrega = { id: 'delivery', tareaId: tarea.id, alumnoId: 'another-student', descripcion: '', comentario: '', archivoId: null, estado: 'ENTREGADA', nota: null, retroalimentacion: null, createdAt: '' };
  await assert.rejects(service(async () => response([{ ...tarea, entrega }])).getTareas(session, aula.id, signal()), error => error.status === 502);
  await assert.rejects(service(async () => response([{ ...tarea, entrega: { ...entrega, alumnoId: session.user.id, tareaId: 'another-task' } }])).getTareas(session, aula.id, signal()), error => error.status === 502);
});

test('authorization, missing-resource errors and cancellation are preserved', async () => {
  for (const status of [401, 403, 404]) {
    await assert.rejects(service(async () => ({ ok: false, status })).getAula(session, aula.id, signal()), error => error.status === status);
  }
  const controller = new AbortController();
  const api = service(async (_, options) => new Promise((_, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  const pending = api.getAula(session, aula.id, controller.signal);
  controller.abort();
  await assert.rejects(pending, error => error.status === 0);
});

test('academic dates use Lima time while a date-only deadline keeps its day', () => {
  const { academicDate } = load('src/features/aulas/presentation.ts');
  const result = academicDate('2026-10-17T02:30:00Z');
  assert.match(result, /16/);
  assert.ok(result.includes('21:30') || result.includes('9:30'), result);
  assert.equal(academicDate('2026-10-17T02:30:00'), result);
  assert.match(academicDate('2026-10-17'), /17/);
  assert.equal(academicDate(null), 'Sin fecha límite');
  assert.equal(academicDate('invalid'), 'Fecha no disponible');
});
