// Real local role-scoped reads only. Never submits academic changes.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { parseEnv } = require('node:util');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const api = process.env.SSP_API_URL || 'http://localhost:8000', web = process.env.SSP_WEB_URL || 'http://localhost:5173';
const errors = [], writes = [], foreignApis = [], requests = [], checks = [];
let stage = 'preparar', activePage;
(async () => {
  for (const url of [api, web]) assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname));
  let ready;
  for (let i = 0; i < 90; i++) { try { const response = await fetch(api + '/dev/ready', { signal: AbortSignal.timeout(3000) }); if (response.ok) { ready = await response.json(); break; } } catch {} await new Promise(resolve => setTimeout(resolve, 400)); }
  assert.equal(ready?.schema, 'ssp_test');
  let webReady = false;
  for (let i = 0; i < 90; i++) { try { if ((await fetch(web, { method: 'HEAD', signal: AbortSignal.timeout(5000) })).ok) { webReady = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 400)); }
  assert.ok(webReady);
  const env = parseEnv(fs.readFileSync(path.resolve('../appSSP-backend/.env'), 'utf8'));
  const sessions = {};
  for (const name of ['profesor', 'supervisor', 'admin', 'alumno']) {
    const response = await fetch(api + '/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: name + '.prueba@unsa.edu.pe', password: env.TEST_SEED_PASSWORD }) });
    assert.equal(response.status, 200); sessions[name] = await response.json();
  }
  async function get(name, endpoint) { const response = await fetch(api + '/api/v1' + endpoint, { headers: { Authorization: 'Bearer ' + sessions[name].token } }); assert.equal(response.status, 200); return response.json(); }
  const aulas = await get('profesor', '/aulas'), classroom = aulas[0]; assert.ok(classroom);
  const practices = await get('profesor', '/practicas'), supervised = await get('supervisor', '/practicas');
  const browser = await chromium.launch({ headless: true });
  async function create(name) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } }), page = await context.newPage(); activePage = page; page.setDefaultTimeout(25000);
    page.on('pageerror', reason => errors.push(reason.message.slice(0, 200)));
    page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource|net::ERR_FAILED/.test(message.text())) errors.push(message.text().slice(0, 300)); });
    await page.addInitScript(({ api, session }) => sessionStorage.setItem('ssp.session.' + Array.from(api).map(c => c.charCodeAt(0).toString(16)).join(''), JSON.stringify(session)), { api, session: sessions[name] });
    await page.route('**/api/v1/**', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== api) { foreignApis.push(url.origin); return route.abort(); }
      requests.push({ role: name, method: request.method(), path: url.pathname });
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) { writes.push(request.method() + ' ' + url.pathname); return route.abort(); }
      return route.continue();
    });
    return page;
  }
  const button = (page, name) => page.getByRole('button', { name, exact: true });
  const heading = (page, name) => page.getByRole('heading', { name, exact: true }).waitFor();
  const tab = (page, name) => page.getByRole('tab', { name: new RegExp('^' + name) }).click();
  const back = page => button(page, 'Volver').click();
  async function home(page, labels) {
    await page.goto(web + '/panel', { waitUntil: 'networkidle', timeout: 120000 }); await heading(page, 'PrácticasCC');
    assert.ok(new URL(page.url()).pathname.startsWith('/equipo/inicio'));
    assert.equal(await page.getByRole('tab').count(), 5);
    for (const label of labels) await page.getByRole('tab', { name: new RegExp('^' + label) }).waitFor();
    for (const width of [360, 390, 430]) { await page.setViewportSize({ width, height: 844 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false); }
    await page.setViewportSize({ width: 390, height: 844 });
  }
  try {
    fs.mkdirSync('.expo/dev', { recursive: true });
    stage = 'docente'; const teacher = await create('profesor');
    await home(teacher, ['Inicio', 'Aulas', 'Seguimiento', 'Avisos', 'Más']); await teacher.screenshot({ path: '.expo/dev/roles27-docente-inicio.png' });
    await tab(teacher, 'Aulas'); await heading(teacher, 'Mis aulas · Docencia'); await teacher.getByLabel('Buscar aula', { exact: true }).fill(classroom.nombre);
    await button(teacher, 'Gestionar aula: ' + classroom.nombre).click(); await heading(teacher, classroom.nombre); assert.ok(new URL(teacher.url()).pathname.startsWith('/equipo/trabajo/aula-docente'));
    await tab(teacher, 'Avisos'); await heading(teacher, 'Mis avisos'); await tab(teacher, 'Aulas'); await heading(teacher, classroom.nombre); await back(teacher); await heading(teacher, 'Mis aulas · Docencia');
    assert.equal(await teacher.getByLabel('Buscar aula', { exact: true }).inputValue(), classroom.nombre);
    await tab(teacher, 'Seguimiento'); await heading(teacher, 'Seguimiento');
    if (practices.length) {
      const practice = practices[0]; await teacher.getByLabel('Buscar practicante', { exact: true }).fill(practice.practicanteNombre);
      await teacher.getByRole('button', { name: new RegExp('^' + practice.practicanteNombre) }).click(); await heading(teacher, 'Seguimiento individual');
      assert.equal(new URL(teacher.url()).searchParams.get('alumnoId'), practice.practicanteId);
      await tab(teacher, 'Más'); await heading(teacher, 'Tu espacio'); await tab(teacher, 'Seguimiento'); await heading(teacher, 'Seguimiento individual'); await back(teacher);
      assert.equal(await teacher.getByLabel('Buscar practicante', { exact: true }).inputValue(), practice.practicanteNombre);
    }
    await teacher.goto(web + '/tareas-docente?aulaId=' + encodeURIComponent(classroom.id), { waitUntil: 'networkidle' });
    assert.ok(new URL(teacher.url()).pathname.startsWith('/equipo/trabajo/tareas-docente')); assert.equal(new URL(teacher.url()).searchParams.get('aulaId'), classroom.id);
    await teacher.goto(web + '/equipo/mas/asignaciones', { waitUntil: 'networkidle' }); await heading(teacher, 'Sección no disponible');
    assert.equal(requests.filter(request => request.role === 'profesor' && request.path.startsWith('/api/v1/admin/')).length, 0);
    checks.push('Docente: cinco pestañas, aula/detalle/retorno, búsquedas conservadas, seguimiento exacto y enlace antiguo; gestión denegada');
    await teacher.context().close();

    stage = 'supervisor'; const supervisor = await create('supervisor');
    await home(supervisor, ['Inicio', 'Practicantes', 'Horas', 'Avisos', 'Más']); await supervisor.screenshot({ path: '.expo/dev/roles27-supervisor-inicio.png' });
    await tab(supervisor, 'Practicantes'); await heading(supervisor, 'Mis practicantes');
    if (supervised.length) { const practice = supervised[0]; await supervisor.getByRole('button', { name: new RegExp('^' + practice.practicanteNombre) }).click(); await heading(supervisor, 'Expediente de prácticas'); assert.equal(new URL(supervisor.url()).searchParams.get('practicaId'), practice.id); await back(supervisor); }
    await tab(supervisor, 'Horas'); await heading(supervisor, 'Validar horas');
    if (supervised.length) { await button(supervisor, 'Evaluar practicante y consultar expediente').click(); await heading(supervisor, 'Expediente de prácticas'); assert.ok(new URL(supervisor.url()).pathname.startsWith('/equipo/revision/expediente')); await back(supervisor); await heading(supervisor, 'Validar horas'); }
    await supervisor.goto(web + '/mis-horas?practicaId=unavailable', { waitUntil: 'networkidle' }); await supervisor.getByRole('alert').filter({ hasText: /práctica seleccionada no está disponible/ }).waitFor();
    assert.equal(await button(supervisor, 'Evaluar practicante y consultar expediente').count(), 0);
    await supervisor.goto(web + '/equipo/mas/administracion', { waitUntil: 'networkidle' }); await heading(supervisor, 'Sección no disponible');
    assert.equal(requests.filter(request => request.role === 'supervisor' && request.path.startsWith('/api/v1/admin/')).length, 0);
    checks.push('Supervisor: practicantes, expediente y horas con retorno; práctica inválida no cambia a otra y gestión denegada'); await supervisor.context().close();

    stage = 'administracion'; const admin = await create('admin');
    await home(admin, ['Inicio', 'Gestión', 'Reportes', 'Avisos', 'Más']); await admin.screenshot({ path: '.expo/dev/roles27-admin-inicio.png' });
    await tab(admin, 'Gestión'); await heading(admin, 'Gestión académica'); await admin.getByRole('button', { name: /^Usuarios y aulas / }).click(); await heading(admin, 'Administración académica'); await admin.getByLabel('Buscar en administración', { exact: true }).fill('Pruebas');
    await tab(admin, 'Reportes'); await heading(admin, 'Reporte institucional'); await tab(admin, 'Gestión'); await heading(admin, 'Administración académica'); assert.equal(await admin.getByLabel('Buscar en administración', { exact: true }).inputValue(), 'Pruebas'); await back(admin); await heading(admin, 'Gestión académica');
    await admin.getByRole('button', { name: /^Prácticas y supervisores / }).click(); await heading(admin, 'Prácticas y supervisores'); await back(admin);
    await admin.goto(web + '/equipo/mas/mensajes', { waitUntil: 'networkidle' }); await heading(admin, 'Sección no disponible');
    assert.equal(requests.filter(request => request.role === 'admin' && (request.path.includes('/contactos') || request.path.includes('/mensajes/'))).length, 0);
    checks.push('Administración: gestión organizada, asignaciones y reportes; conserva búsqueda y no expone mensajería privada'); await admin.context().close();

    stage = 'alumno'; const student = await create('alumno');
    await student.goto(web + '/panel', { waitUntil: 'networkidle' }); await heading(student, 'PrácticasCC'); assert.ok(new URL(student.url()).pathname.startsWith('/alumno/inicio')); assert.equal(await student.getByRole('tab').count(), 5);
    await tab(student, 'Aulas'); await heading(student, 'Mis aulas'); await tab(student, 'Más'); await heading(student, 'Tu espacio');
    await student.goto(web + '/equipo/mas/administracion', { waitUntil: 'networkidle' }); assert.equal(await student.getByRole('heading', { name: 'Administración académica', exact: true }).count(), 0);
    assert.equal(requests.filter(request => request.role === 'alumno' && request.path.startsWith('/api/v1/admin/')).length, 0);
    checks.push('Alumno conserva sus cinco pestañas y no puede abrir el área del personal');
    assert.deepEqual(errors, []); assert.deepEqual(writes, []); assert.deepEqual(foreignApis, []);
    const report = { verified: true, checks, browserErrors: errors, academicWrites: writes, foreignApis, allApiResponsesReal: true, nativeAndroid: false };
    fs.writeFileSync('.expo/dev/roles27-verificacion.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
  } catch (error) { if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: '.expo/dev/roles27-revision-pendiente.png' }).catch(() => {}); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(JSON.stringify({ verified: false, stage, errorType: error.name, message: error.message.slice(0, 700) })); process.exitCode = 1; });
