// Run with Windows Node, Expo web, and the same Playwright setup as test:navigation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');

async function withTimeout(promise) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Timed out waiting for the delayed request')), 15000);
    })]);
  } finally { clearTimeout(timer); }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const origin = process.env.SSP_WEB_URL || 'http://localhost:5173';
  const user = { id: 'student-1', nombres: 'Prueba', apellidos: 'Local', email: 'prueba@unsa.edu.pe', role: 'ALUMNO' };
  const aulas = [
    { id: 'aula-1', nombre: 'Comunicación institucional', profesorNombre: 'Docente de prueba', ciclo: '2026-II', estado: 'ACTIVA', progreso: 25, semanaActual: 4, semanasTotales: 16 },
    { id: 'aula-2', nombre: 'Producción audiovisual', profesorNombre: 'Otra docente', ciclo: '2026-II', estado: 'ACTIVA', progreso: 0, semanaActual: 1, semanasTotales: 16 },
  ];
  const pending = { id: 'task-1', aulaId: 'aula-1', titulo: 'Informe de campo', descripcion: 'Describe las actividades de la semana.', fechaLimite: null, createdAt: '2026-10-16T12:00:00Z', entrega: null };
  const graded = { ...pending, id: 'task-2', titulo: 'Informe inicial', fechaLimite: '2026-10-17T02:30:00Z', entrega: {
    id: 'delivery-1', tareaId: 'task-2', alumnoId: user.id, descripcion: 'Mi informe inicial.', comentario: 'Incluye fuentes de consulta.', archivoId: 'file-1', estado: 'CALIFICADA', nota: 0, retroalimentacion: 'Revisar fuentes y citas.', createdAt: '2026-10-16T12:00:00Z',
  } };
  const emptyGrades = { promedio: null, tareasTotal: 0, tareasEntregadas: 0, detalle: [] };
  const grades = { promedio: 0, tareasTotal: 2, tareasEntregadas: 1, detalle: [
    { tareaId: graded.id, tareaTitulo: graded.titulo, nota: 0, retroalimentacion: graded.entrega.retroalimentacion, estado: 'CALIFICADA', entregadaEn: graded.entrega.createdAt },
  ] };
  let aulaMode = 'normal';
  let tasksMode = 'normal';
  let gradesMode = 'normal';
  let expired = false;
  let releaseDelayed;
  let startedDelayed;
  let finishedDelayed;
  let delayedFinished;

  // These are contract fixtures. No authenticated production request or write is made.
  await page.route('https://back-cs-de-la-com.vercel.app/api/v1/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let body;
    let status = 200;
    if (path.endsWith('/auth/login')) body = { token: 'local-student-token', user };
    else {
      assert.equal(request.method(), 'GET');
      assert.equal(request.headers().authorization, 'Bearer local-student-token');
      if (expired) { status = 401; body = { detail: 'Expired' }; }
      else if (path.endsWith('/notificaciones')) body = [];
      else if (path.endsWith('/alumno/mis-aulas')) body = aulas;
      else if (path.endsWith('/practicas/actual')) body = null;
      else if (path === '/api/v1/alumno/aulas/aula-1') {
        status = aulaMode === 'missing' ? 404 : aulaMode === 'forbidden' ? 403 : 200;
        body = status === 200 ? aulas[0] : { detail: 'Private backend detail' };
      } else if (path === '/api/v1/alumno/aulas/aula-2') body = aulas[1];
      else if (path === '/api/v1/alumno/aulas/aula-1/tareas') {
        if (tasksMode === 'delayed') {
          const gate = new Promise(resolve => { releaseDelayed = resolve; });
          delayedFinished = new Promise(resolve => { finishedDelayed = resolve; });
          startedDelayed();
          await gate;
          try { await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }); }
          catch (error) { if (!request.failure()) throw error; }
          finally { finishedDelayed(); }
          return;
        }
        status = tasksMode === 'error' ? 500 : 200;
        body = tasksMode === 'empty' ? [] : tasksMode === 'invalid' ? [{ ...pending, aulaId: 'another-aula' }] : status === 200 ? [pending, graded] : {};
      } else if (path === '/api/v1/alumno/aulas/aula-1/calificaciones') body = gradesMode === 'empty' ? emptyGrades : grades;
      else if (path === '/api/v1/alumno/aulas/aula-2/tareas') body = [];
      else if (path === '/api/v1/alumno/aulas/aula-2/calificaciones') body = emptyGrades;
      else throw new Error(`Unexpected API request: ${path}`);
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });

  const button = name => page.getByRole('button', { name, exact: true });
  const back = () => button('Volver').click();
  const visibleText = text => page.getByText(text, { exact: true }).filter({ visible: true });
  try {
    await page.goto(`${origin}/aula?id=aula-1`, { waitUntil: 'networkidle' });
    await button('Explorar demo').waitFor();
    await page.goto(`${origin}/tarea?aulaId=aula-1&tareaId=task-1`, { waitUntil: 'networkidle' });
    await button('Explorar demo').waitFor();
    await page.getByLabel('Correo de tu cuenta SSP', { exact: true }).fill(user.email);
    await page.getByLabel('Contraseña', { exact: true }).fill('local-test-only');
    await button('Ingresar').click();
    await button(`Abrir aula: ${aulas[0].nombre}`).click();
    await visibleText('25% de avance registrado').waitFor();
    await button(`Ver tarea: ${pending.titulo}`).click();
    await visibleText('Todavía no tienes una entrega registrada para esta tarea.').waitFor();
    await visibleText('Sin fecha límite').waitFor();
    await back();
    await button('Calificaciones').click();
    await visibleText('Nota: 0').waitFor();
    await visibleText('0').waitFor();
    await button(`Ver tarea: ${graded.titulo}`).click();
    await visibleText('Nota: 0').waitFor();
    await visibleText(graded.entrega.retroalimentacion).waitFor();
    await visibleText(graded.entrega.descripcion).waitFor();
    fs.mkdirSync('.expo/dev/screenshots', { recursive: true });
    await page.screenshot({ path: '.expo/dev/screenshots/incremento-02-tarea.png', fullPage: true });
    console.log('PASS: protected routes, aula, task, delivery, zero grade and feedback');

    await back();
    await button('Tareas').click();
    tasksMode = 'error';
    await button('Actualizar aula').click();
    await page.getByRole('alert').waitFor();
    await button('Calificaciones').click();
    await visibleText('Nota: 0').waitFor();
    await button('Tareas').click();
    tasksMode = 'normal';
    await button('Reintentar').click();
    await button(`Ver tarea: ${pending.titulo}`).waitFor();
    await page.screenshot({ path: '.expo/dev/screenshots/incremento-02-aula.png', fullPage: true });
    console.log('PASS: failed tasks do not hide grades, and retry recovers');

    tasksMode = 'empty'; gradesMode = 'empty';
    await button('Actualizar aula').click();
    await visibleText('Aún no hay tareas publicadas en esta aula.').waitFor();
    await button('Calificaciones').click();
    await visibleText('Sin calificaciones').waitFor();
    console.log('PASS: empty tasks and ungraded averages have explicit empty states');

    aulaMode = 'missing';
    await button('Actualizar aula').click();
    await visibleText('El aula no está disponible o ya no estás inscrito.').waitFor();
    aulaMode = 'forbidden';
    await button('Reintentar').click();
    await visibleText('No tienes permiso para esta acción.').waitFor();
    assert.equal(await button('Explorar demo').count(), 0, '403 must preserve the session');
    aulaMode = 'normal'; tasksMode = 'invalid'; gradesMode = 'normal';
    await button('Reintentar').click();
    await button('Tareas').click();
    await visibleText('No pudimos interpretar los datos del aula. Intenta actualizar.').waitFor();
    tasksMode = 'normal';
    await button('Reintentar').click();
    await button(`Ver tarea: ${pending.titulo}`).waitFor();
    console.log('PASS: 404, 403 and malformed data are recoverable without exposing backend detail');

    tasksMode = 'delayed';
    const delayedStarted = new Promise(resolve => { startedDelayed = resolve; });
    await button('Actualizar aula').click();
    await withTimeout(delayedStarted);
    const aborted = page.waitForEvent('requestfailed', { predicate: request => request.url().endsWith('/alumno/aulas/aula-1/tareas') });
    await back();
    await aborted;
    await button(`Abrir aula: ${aulas[1].nombre}`).click();
    await visibleText('0% de avance registrado').waitFor();
    releaseDelayed();
    await withTimeout(delayedFinished);
    await visibleText('0% de avance registrado').waitFor();
    assert.equal(await visibleText(pending.titulo).count(), 0);
    console.log('PASS: leaving an aula cancels its query; a late 401 does not expire another screen');

    expired = true;
    await button('Actualizar aula').click();
    await visibleText('Tu sesión venció. Ingresa nuevamente.').waitFor();
    await button('Explorar demo').waitFor();
    assert.deepEqual(errors, [], 'Student navigation must not cause React errors');
    console.log('PASS: a current 401 returns to login without navigation loops or React errors');
  } finally {
    releaseDelayed?.();
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
