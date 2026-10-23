// Local development API reads; edge cases use isolated browser fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { parseEnv } = require('node:util');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const api = process.env.SSP_API_URL || 'http://localhost:8000', web = process.env.SSP_WEB_URL || 'http://localhost:5173';
const checks = [], errors = [], writes = [], foreignApis = [], requests = [], fonts = [];
let stage = 'preparar';
(async () => {
  for (const url of [api, web]) assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname));
  const deadline = Date.now() + 60000;
  let ready;
  while (Date.now() < deadline) {
    try { const r = await fetch(api + '/dev/ready', { signal: AbortSignal.timeout(3000) }); if (r.ok) { ready = await r.json(); break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  assert.equal(ready?.schema, 'ssp_test');
  const env = parseEnv(fs.readFileSync(path.resolve('../appSSP-backend/.env'), 'utf8'));
  async function account(name) {
    const r = await fetch(api + '/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: name + '.prueba@unsa.edu.pe', password: env.TEST_SEED_PASSWORD }) });
    assert.equal(r.status, 200); return r.json();
  }
  const student = await account('alumno'), teacher = await account('profesor');
  const headers = { Authorization: 'Bearer ' + student.token };
  const practiceResponse = await fetch(api + '/api/v1/practicas', { headers });
  assert.equal(practiceResponse.status, 200);
  const practice = (await practiceResponse.json())[0]; assert.ok(practice);
  const summaryResponse = await fetch(api + '/api/v1/expedientes/' + practice.id + '/resumen', { headers });
  assert.equal(summaryResponse.status, 200);
  const summary = await summaryResponse.json();
  assert.equal(summary.practica.practicanteId, student.user.id);
  for (const key of ['horas', 'tareas', 'metas', 'revision']) assert.equal(key in summary, false);
  const goals = ['ARTICULOS', 'HORAS', 'NOTAS_PRENSA'].map((tipo, i) => ({
    id: 'fixture-goal-' + i, practicaId: practice.id, practicanteId: student.user.id, practicanteNombre: practice.practicanteNombre,
    tipo, cantidadObjetivo: 4, cantidadAlcanzada: i === 1 ? 5 : 0, descripcion: 'Producción de prueba para el diseño.', creadoPor: 'Docente de prueba', fechaCreacion: '2026-10-23T12:00:00Z',
  }));
  let fixtureMode = 'normal', goalsMode = 'normal';
  const browser = await chromium.launch({ headless: true });
  async function create(session, fixture = false) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const page = await context.newPage(); page.setDefaultTimeout(25000);
    page.on('pageerror', e => errors.push(e.name + ': ' + e.message.slice(0, 200)));
    await page.addInitScript(({ api, session }) => {
      sessionStorage.setItem('ssp.session.' + Array.from(api).map(c => c.charCodeAt(0).toString(16)).join(''), JSON.stringify(session));
    }, { api, session });
    await page.route('**/api/v1/**', async route => {
      const request = route.request(), url = new URL(request.url()), pathname = url.pathname;
      if (url.origin !== api) { foreignApis.push(url.origin); return route.abort(); }
      requests.push({ fixture, path: pathname, method: request.method() });
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) { writes.push(request.method() + ' ' + pathname); return route.abort(); }
      const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (fixture && pathname === '/api/v1/practicas') return json(200, fixtureMode === 'empty' ? [] : [practice]);
      if (fixture && pathname.startsWith('/api/v1/metas/practica/')) return json(200, goalsMode === 'empty' ? [] : goals);
      if (fixture && pathname.endsWith('/resumen') && pathname.includes('/expedientes/')) {
        if (fixtureMode === 'error') return json(503, {});
        if (fixtureMode === 'forbidden') return json(403, {});
        const data = structuredClone(summary);
        data.cerrado = fixtureMode === 'closed';
        data.puedeCerrar = ['ready', 'closed'].includes(fixtureMode);
        data.practica.estado = data.cerrado ? 'CERRADA' : 'EN_CURSO';
        data.checklist = data.checklist.map(item => ({ ...item, cumplido: data.puedeCerrar }));
        data.evaluacion = null; data.evaluacionVigente = false;
        data.configuracion = null;
        data.cierre = data.cerrado ? { version: 1, fecha: '2026-10-23T12:00:00Z', responsable: 'Docente de prueba', responsableId: 'test-teacher', motivo: 'Revisión ficticia de cierre.', revisionConfirmada: 'a'.repeat(64) } : null;
        if (fixtureMode === 'wrong-owner') data.practica.practicanteId = 'another-student';
        return json(200, data);
      }
      return route.continue();
    });
    return page;
  }
  const button = (p, name) => p.getByRole('button', { name, exact: true });
  const heading = (p, name) => p.getByRole('heading', { name, exact: true }).waitFor();
  const back = p => button(p, 'Volver').click();
  const recordUrl = web + '/alumno/mas/expediente?practicaId=' + encodeURIComponent(practice.id);
  try {
    fs.mkdirSync('.expo/dev', { recursive: true });
    stage = 'recorrido-real'; const real = await create(student);
    await real.goto(web + '/alumno/mas', { waitUntil: 'networkidle', timeout: 120000 }); await heading(real, 'Tu espacio');
    await real.getByRole('button', { name: /^Centro y supervisor/ }).click(); await heading(real, 'Centro y supervisor');
    await real.getByText('Correo del supervisor', { exact: true }).waitFor();
    await real.screenshot({ path: '.expo/dev/practica25-centro.png' }); await back(real);
    await real.getByRole('button', { name: /^Metas Producción/ }).click(); await heading(real, 'Mis metas');
    await button(real, 'Actualizar metas').waitFor(); await real.getByText('Objetivos completados', { exact: true }).waitFor();
    fonts.push(await real.getByText('Objetivos completados', { exact: true }).evaluate(node => ({ section: 'metas', font: getComputedStyle(node).fontFamily })));
    await real.screenshot({ path: '.expo/dev/practica25-metas.png' }); await back(real);
    await real.getByRole('button', { name: /^Expediente Requisitos/ }).click(); await heading(real, 'Mis expedientes');
    await real.getByRole('button', { name: new RegExp(practice.aulaNombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).click(); await heading(real, 'Mi expediente');
    await heading(real, 'Requisitos de cierre');
    assert.equal(requests.filter(r => !r.fixture && r.path === '/api/v1/expedientes/' + practice.id).length, 0);
    assert.equal(requests.filter(r => !r.fixture && r.path.endsWith('/pdf')).length, 0);
    await button(real, 'Evaluación del supervisor').click(); assert.equal(await button(real, 'Evaluación del supervisor').getAttribute('aria-expanded'), 'true');
    await button(real, 'Criterios del docente').click(); await button(real, 'Datos de la práctica').click();
    for (const width of [360, 390, 430]) {
      await real.setViewportSize({ width, height: 844 });
      assert.equal(await real.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    }
    await real.setViewportSize({ width: 390, height: 844 });
    await real.getByRole('heading', { name: summary.practica.aulaNombre, exact: true }).scrollIntoViewIfNeeded();
    await real.screenshot({ path: '.expo/dev/practica25-expediente.png' });
    if (!summary.cerrado) {
      await button(real, 'Ver mis metas').click(); await heading(real, 'Mis metas'); await back(real); await heading(real, 'Mi expediente');
      assert.equal(await button(real, 'Datos de la práctica').getAttribute('aria-expanded'), 'true');
    }
    const downloaded = real.waitForEvent('download'); await button(real, 'Descargar expediente PDF').click(); await downloaded;
    checks.push('Centro, metas y expediente reales; contexto al volver, PDF solo al pedirlo y sin desbordamiento a 360/390/430 px');
    await real.context().close();

    stage = 'metas-filtros'; const page = await create(student, true);
    await page.goto(web + '/alumno/mas/metas?practicaId=' + encodeURIComponent(practice.id), { waitUntil: 'networkidle' }); await heading(page, 'Mis metas');
    await page.getByText('1 de 3', { exact: true }).waitFor();
    assert.equal(await page.getByRole('searchbox').count(), 0);
    await button(page, 'En progreso').click(); assert.equal(await page.getByRole('button', { name: /^Detalle de meta:/ }).count(), 2);
    await button(page, 'Completadas').click(); await button(page, 'Detalle de meta: Horas validadas').click();
    await page.getByText('5 de 4 h', { exact: true }).waitFor();
    assert.equal(await page.getByRole('progressbar', { name: 'Avance de Horas validadas' }).getAttribute('aria-valuenow'), '100');
    await page.getByText('Se actualiza con tus horas validadas.', { exact: false }).waitFor();
    await page.getByRole('tab', { name: /Avisos/ }).click(); await page.getByRole('tab', { name: /Más/ }).click();
    assert.equal(await button(page, 'Completadas').getAttribute('aria-selected'), 'true');
    assert.equal(await button(page, 'Detalle de meta: Horas validadas').getAttribute('aria-expanded'), 'true');
    goalsMode = 'empty'; await button(page, 'Actualizar metas').click(); await page.getByText('0 de 0', { exact: true }).waitFor();
    checks.push('Metas sin búsqueda; filtros, avance mayor que objetivo, detalle, pestañas y estado sin metas');

    stage = 'expediente-estados'; fixtureMode = 'error';
    await page.goto(recordUrl, { waitUntil: 'networkidle' }); await button(page, 'Reintentar').waitFor();
    fixtureMode = 'normal'; await button(page, 'Reintentar').click(); await heading(page, 'Requisitos de cierre');
    await button(page, 'Criterios del docente').click(); await page.getByText('Tu docente debe confirmar qué tareas y metas requiere el cierre.', { exact: false }).waitFor();
    fixtureMode = 'ready'; await button(page, 'Actualizar expediente').click(); await page.getByText('Pendiente de autorización docente', { exact: true }).waitFor();
    assert.equal(await button(page, 'Cerrar práctica').count(), 0);
    fixtureMode = 'closed'; await button(page, 'Actualizar expediente').click(); await page.getByText('Cierre autorizado', { exact: true }).waitFor();
    assert.equal(await button(page, 'Ver tareas del aula').count(), 0); await page.getByText('El PDF conserva el expediente del cierre.', { exact: true }).waitFor();
    await page.screenshot({ path: '.expo/dev/practica25-cerrado.png' });
    checks.push('Expediente con reintento, criterios sin definir, autorización pendiente y cierre de solo consulta');
    for (const mode of ['forbidden', 'wrong-owner']) {
      fixtureMode = mode; await page.goto(recordUrl, { waitUntil: 'networkidle' }); await page.getByRole('alert').waitFor();
      assert.equal(await button(page, 'Descargar expediente PDF').count(), 0);
    }
    fixtureMode = 'empty'; await page.goto(web + '/alumno/mas/expedientes', { waitUntil: 'networkidle' }); await page.getByText('Aún no hay prácticas en esta selección', { exact: true }).waitFor();
    fixtureMode = 'normal'; await page.goto(web + '/alumno/mas/metas?practicaId=unavailable', { waitUntil: 'networkidle' }); await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('button', { name: /^Detalle de meta:/ }).count(), 0);
    checks.push('Sin práctica, recurso no autorizado y respuesta de otro alumno no muestran expediente ni metas ajenas');
    await page.context().close();

    stage = 'docente-real'; const professor = await create(teacher);
    await professor.goto(web + '/expediente?practicaId=' + encodeURIComponent(practice.id), { waitUntil: 'networkidle' });
    await heading(professor, 'Expediente de prácticas'); await professor.getByText('Requisitos de cierre', { exact: true }).waitFor();
    assert.ok(requests.some(r => !r.fixture && r.path === '/api/v1/expedientes/' + practice.id));
    checks.push('El docente conserva su expediente completo y su circuito de gestión');
    assert.deepEqual(errors, []); assert.deepEqual(writes, []); assert.deepEqual(foreignApis, []);
    const report = { verified: true, checks, browserErrors: errors, academicWrites: writes, foreignApis, nativeAndroid: false, isolatedFixtures: true, realReadonlyResources: true, fonts };
    fs.writeFileSync('.expo/dev/practica25-verificacion.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(JSON.stringify({ verified: false, stage, errorType: e.name, message: e.message.slice(0, 700) })); process.exitCode = 1; });
