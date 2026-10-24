// Real local reads plus isolated fixtures for volume and confirmed grading.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { parseEnv } = require('node:util');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const api = process.env.SSP_API_URL || 'http://localhost:8001', web = process.env.SSP_WEB_URL || 'http://localhost:5174';
const errors = [], writes = [], foreignApis = [], requests = [], checks = [];
let stage = 'preparar', activePage;
(async () => {
  for (const url of [api, web]) assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname));
  async function ready(url, method = 'GET') {
    for (let i = 0; i < 90; i++) {
      try { const response = await fetch(url, { method, signal: AbortSignal.timeout(5000) }); if (response.ok) return method === 'HEAD' ? true : response.json(); } catch {}
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    throw new Error('Servidor local no preparado');
  }
  assert.equal((await ready(api + '/dev/ready')).schema, 'ssp_test'); await ready(web, 'HEAD');
  const env = parseEnv(fs.readFileSync(path.resolve('../appSSP-backend/.env'), 'utf8')), sessions = {};
  for (const name of ['profesor', 'supervisor', 'admin']) {
    const response = await fetch(api + '/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: name + '.prueba@unsa.edu.pe', password: env.TEST_SEED_PASSWORD }) });
    assert.equal(response.status, 200); sessions[name] = await response.json();
  }
  async function get(name, endpoint) { const response = await fetch(api + '/api/v1' + endpoint, { headers: { Authorization: 'Bearer ' + sessions[name].token } }); assert.equal(response.status, 200); return response.json(); }
  const realAulas = await get('profesor', '/equipo/aulas/pagina?limite=20'), aula = realAulas.items[0]; assert.ok(aula);
  const realDeliveries = await get('profesor', '/equipo/aulas/' + aula.id + '/entregas/pagina?limite=20&pendientes=false');
  const teacherId = sessions.profesor.user.id, date = '2026-10-24T12:00:00Z';
  const aulas = Array.from({ length: 45 }, (_, i) => ({ id: 'fixture-a-' + i, nombre: 'Aula de prueba ' + String(i).padStart(3, '0'), codigo: 'A-' + i, periodo: 'TEST', profesorId: teacherId, profesorNombre: 'Docente de prueba', estado: 'ACTIVA', inscritos: 45 }));
  const classroom = { ...aulas[0], descripcion: 'Aula de prueba aislada.' };
  const students = Array.from({ length: 45 }, (_, i) => ({ id: 'fixture-i-' + i, alumnoId: 'fixture-u-' + i, alumnoNombre: 'Practicante ' + String(i).padStart(3, '0'), alumnoEmail: 'alumno' + i + '@unsa.edu.pe', aulaId: classroom.id, aulaNombre: classroom.nombre, progreso: 10, semanaActual: 2, semanasTotales: 16, estado: 'ACTIVA', tareasEntregadas: 1, tareasTotal: 2 }));
  const deliveries = students.map((student, i) => ({ id: 'fixture-e-' + i, tareaId: 'fixture-task', tareaTitulo: 'Informe ' + String(i).padStart(3, '0'), alumnoId: student.alumnoId, alumnoNombre: student.alumnoNombre, createdAt: date, estado: 'ENTREGADA', nota: null, revision: 2, descripcion: 'Contenido individual de la entrega ' + i, comentario: '', archivoId: null, retroalimentacion: null }));
  const grades = students.map(student => ({ id: student.id, alumnoId: student.alumnoId, alumnoNombre: student.alumnoNombre, aulaId: classroom.id, promedio: 0, asistenciaPct: null, horasValidadas: 8 }));
  const practices = students.map((student, i) => ({ id: 'fixture-p-' + i, practicanteId: student.alumnoId, practicanteNombre: student.alumnoNombre, aulaId: classroom.id, aulaNombre: classroom.nombre, periodo: 'TEST', horasAcumuladas: 8, horasMinimas: 360, estado: i < 7 ? 'CERRADA' : 'EN_CURSO' }));
  let failMore = true, denied = false, gradeWrites = 0;
  const browser = await chromium.launch({ headless: true });
  async function create(name, fixture = false) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } }), page = await context.newPage(); activePage = page; page.setDefaultTimeout(25000);
    page.on('pageerror', reason => errors.push(reason.message.slice(0, 200)));
    page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource|net::ERR_FAILED/.test(message.text())) errors.push(message.text().slice(0, 300)); });
    await page.addInitScript(({ api, session }) => sessionStorage.setItem('ssp.session.' + Array.from(api).map(c => c.charCodeAt(0).toString(16)).join(''), JSON.stringify(session)), { api, session: sessions[name] });
    await page.route('**/api/v1/**', async route => {
      const request = route.request(), url = new URL(request.url()), pathname = url.pathname;
      if (url.origin !== api) { foreignApis.push(url.origin); return route.abort(); }
      requests.push({ role: name, fixture, method: request.method(), path: pathname, query: url.search });
      const json = (status, value) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
      const search = pool => { const q = (url.searchParams.get('q') || '').toLowerCase(); return pool.filter(row => Object.values(row).join(' ').toLowerCase().includes(q)); };
      const slice = (pool, extra = {}) => { const start = Number(url.searchParams.get('cursor') || 0); return json(200, { items: pool.slice(start, start + 20), total: pool.length, siguiente: start + 20 < pool.length ? String(start + 20) : null, ...extra }); };
      if (fixture) {
        if (pathname === '/api/v1/equipo/aulas/pagina') {
          if (denied) return json(403, { detail: 'El aula ya no te pertenece.' });
          if (url.searchParams.has('cursor') && failMore) { failMore = false; return json(503, {}); }
          return slice(search(aulas));
        }
        if (pathname === '/api/v1/equipo/aulas/' + classroom.id) return json(200, classroom);
        if (pathname.endsWith('/alumnos/pagina')) return slice(search(students));
        if (pathname.endsWith('/notas/pagina')) return slice(search(grades), { promedioGeneral: 0 });
        if (pathname.endsWith('/entregas/pagina')) return slice(search(deliveries.filter(d => url.searchParams.get('pendientes') !== 'true' || d.nota === null)).map(({ descripcion, comentario, archivoId, retroalimentacion, revision, ...row }) => row));
        if (pathname.startsWith('/api/v1/equipo/aulas/' + classroom.id + '/entregas/')) {
          const row = deliveries.find(d => d.id === pathname.split('/').at(-1)); return row ? json(200, row) : json(404, {});
        }
        if (pathname === '/api/v1/equipo/practicas/pagina') return slice(search(practices.filter(p => url.searchParams.get('estado') === 'CERRADAS' ? p.estado === 'CERRADA' : url.searchParams.get('estado') === 'ABIERTAS' ? p.estado !== 'CERRADA' : true)));
        if (pathname.endsWith('/calificar') && request.method() === 'PUT') {
          gradeWrites++; const value = request.postDataJSON(), row = deliveries.find(d => pathname.includes('/' + d.id + '/'));
          assert.ok(row); assert.equal(value.nota, 0); assert.equal(value.revisionEntrega, 2);
          row.nota = value.nota; row.retroalimentacion = value.retroalimentacion; row.estado = 'CALIFICADA'; return json(200, row);
        }
        if (pathname.includes('/seguimiento/')) return json(404, { detail: 'Ficha aislada para comprobar el destino.' });
      }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) { writes.push(request.method() + ' ' + pathname); return route.abort(); }
      return route.continue();
    });
    return page;
  }
  const button = (page, name) => page.getByRole('button', { name, exact: true });
  const heading = (page, name) => page.getByRole('heading', { name, exact: true }).waitFor();
  const counter = (page, value) => page.getByText(value, { exact: true }).waitFor();
  const top = page => page.evaluate(() => { for (const element of document.querySelectorAll('*')) if (element.scrollTop) element.scrollTop = 0; });
  async function more(page, count) { await button(page, 'Ver más').click(); await counter(page, count); }
  try {
    fs.mkdirSync('.expo/dev', { recursive: true });
    stage = 'lecturas reales'; const real = await create('profesor');
    await real.goto(web + '/docencia', { waitUntil: 'networkidle', timeout: 120000 }); await heading(real, 'Mis aulas · Docencia');
    await real.getByRole('button', { name: new RegExp('^' + aula.nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).click(); await heading(real, aula.nombre);
    await button(real, 'Alumnos').click(); await button(real, 'Actualizar estudiantes').waitFor();
    await button(real, 'Notas').click(); await button(real, 'Actualizar notas').waitFor();
    await button(real, 'Recursos').click(); await real.getByRole('button', { name: /^Publicar y consultar tareas / }).click(); await heading(real, 'Tareas del aula'); await button(real, 'Volver').click();
    await button(real, 'Recursos').click(); await real.getByRole('button', { name: /^Tomar asistencia académica / }).click(); await heading(real, 'Asistencia académica');
    if (realDeliveries.items.length) {
      const delivery = realDeliveries.items[0]; await real.goto(web + '/revisar-entrega?aulaId=' + encodeURIComponent(aula.id) + '&entregaId=' + encodeURIComponent(delivery.id), { waitUntil: 'networkidle' });
      await heading(real, 'Revisar entrega'); await real.getByText('Nota actual: ' + (delivery.nota ?? 'Sin calificar'), { exact: true }).waitFor();
    }
    assert.equal(requests.filter(r => !r.fixture && r.path.endsWith('/historial')).length, 0);
    checks.push('Docente real: aulas, padrón, notas, tareas/asistencia y detalle individual de entrega sin consultas completas ni historial automático'); await real.context().close();

    stage = 'volumen aulas'; const teacher = await create('profesor', true);
    await teacher.goto(web + '/docencia', { waitUntil: 'networkidle' }); await counter(teacher, '20 de 45 aulas');
    await button(teacher, 'Ver más').click(); await button(teacher, 'Reintentar carga').waitFor(); await counter(teacher, '20 de 45 aulas');
    await button(teacher, 'Reintentar carga').click(); await counter(teacher, '40 de 45 aulas'); await more(teacher, '45 de 45 aulas');
    await top(teacher); await teacher.getByLabel('Buscar aula', { exact: true }).fill(classroom.nombre); await counter(teacher, '1 de 1 aulas');
    await teacher.getByRole('button', { name: new RegExp('^' + classroom.nombre + ' ') }).click(); await heading(teacher, classroom.nombre);
    await button(teacher, 'Volver').click(); assert.equal(await teacher.getByLabel('Buscar aula', { exact: true }).inputValue(), classroom.nombre); await counter(teacher, '1 de 1 aulas');
    await teacher.getByRole('button', { name: new RegExp('^' + classroom.nombre + ' ') }).click(); await counter(teacher, '20 de 45 entregas');
    checks.push('Aulas 20→40→45 con fallo/reintento, búsqueda en servidor y regreso conserva filtro');

    stage = 'volumen aula';
    await more(teacher, '40 de 45 entregas'); await more(teacher, '45 de 45 entregas'); await top(teacher);
    await button(teacher, 'Alumnos').click(); await counter(teacher, '20 de 45 estudiantes'); await more(teacher, '40 de 45 estudiantes'); await more(teacher, '45 de 45 estudiantes'); await top(teacher);
    await teacher.getByLabel('Buscar estudiante', { exact: true }).fill('Practicante 000'); await counter(teacher, '1 de 1 estudiantes');
    await teacher.getByRole('button', { name: /^Practicante 000 / }).click(); await heading(teacher, 'Seguimiento individual');
    assert.equal(new URL(teacher.url()).searchParams.get('alumnoId'), students[0].alumnoId); await button(teacher, 'Volver').click(); await counter(teacher, '1 de 1 estudiantes');
    assert.equal(await teacher.getByLabel('Buscar estudiante', { exact: true }).inputValue(), 'Practicante 000');
    await button(teacher, 'Notas').click(); await counter(teacher, '20 de 45 estudiantes'); await teacher.getByText('Promedio del aula', { exact: true }).waitFor();
    await more(teacher, '40 de 45 estudiantes'); await more(teacher, '45 de 45 estudiantes'); await top(teacher);
    await button(teacher, 'Entregas').click(); await counter(teacher, '45 de 45 entregas');
    for (const width of [360, 390, 430]) { await teacher.setViewportSize({ width, height: 844 }); assert.equal(await teacher.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false); }
    await teacher.setViewportSize({ width: 390, height: 844 }); await teacher.screenshot({ path: '.expo/dev/personal28-aula.png' });
    checks.push('Entregas/padrón/notas 20→40→45, consultas independientes, ficha exacta, filtros por sección y tamaños móviles');

    stage = 'calificacion aislada'; await top(teacher);
    await teacher.getByRole('button', { name: /^Informe 000 / }).click(); await heading(teacher, 'Revisar entrega');
    await teacher.getByText(deliveries[0].descripcion, { exact: true }).waitFor();
    await teacher.getByLabel('Nota (0 a 20)', { exact: true }).fill('0'); await button(teacher, 'Revisar calificación').click();
    assert.equal(gradeWrites, 0); await button(teacher, 'Confirmar calificación').click(); await teacher.getByText('Calificación guardada y confirmada por el servidor.', { exact: true }).waitFor();
    assert.equal(gradeWrites, 1); await button(teacher, 'Volver').click(); await counter(teacher, '20 de 44 entregas');
    await top(teacher); assert.equal(await teacher.getByRole('button', { name: /^Informe 000 / }).count(), 0);
    await button(teacher, 'Volver').click(); assert.equal(await teacher.getByRole('tab').count(), 5); denied = true; await button(teacher, 'Actualizar aulas').click(); await teacher.getByRole('alert').filter({ hasText: 'No tienes permiso para esta acción.' }).waitFor();
    assert.equal(await teacher.getByRole('button', { name: new RegExp('^' + classroom.nombre + ' ') }).count(), 0);
    checks.push('Detalle puntual, nota cero confirmada con revisión vigente y actualización de pendientes; permiso retirado vacía la lista'); await teacher.context().close();

    stage = 'supervision'; const supervisor = await create('supervisor', true);
    await supervisor.goto(web + '/equipo/trabajo', { waitUntil: 'networkidle' }); await heading(supervisor, 'Mis practicantes'); await counter(supervisor, '20 de 45 prácticas');
    assert.equal(await supervisor.getByRole('textbox').count(), 0); await more(supervisor, '40 de 45 prácticas'); await more(supervisor, '45 de 45 prácticas'); await top(supervisor);
    await button(supervisor, 'Cerradas').click(); await counter(supervisor, '7 de 7 prácticas'); await button(supervisor, 'Abiertas').click(); await counter(supervisor, '20 de 38 prácticas'); await supervisor.screenshot({ path: '.expo/dev/personal28-supervisor.png' });
    checks.push('Supervisor sin buscador: páginas y filtros de prácticas abiertas/cerradas'); await supervisor.context().close();

    stage = 'administracion real'; const admin = await create('admin');
    await admin.goto(web + '/docencia', { waitUntil: 'networkidle' }); await heading(admin, 'Mis aulas · Docencia');
    await admin.getByLabel('Buscar aula', { exact: true }).fill(aula.nombre); await admin.getByRole('button', { name: new RegExp('^' + aula.nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).waitFor();
    assert.ok(requests.some(r => !r.fixture && r.role === 'admin' && r.path === '/api/v1/equipo/aulas/pagina'));
    checks.push('Administración consulta aulas y búsqueda real por su rol'); await admin.context().close();
    const obsolete = requests.filter(r => r.path === '/api/v1/aulas' || r.path === '/api/v1/profesor/practicantes' || /^\/api\/v1\/profesor\/aulas\/[^/]+\/(entregas|libro)$/.test(r.path) || r.path === '/api/v1/practicas');
    assert.deepEqual(obsolete, []); assert.deepEqual(errors, []); assert.deepEqual(writes, []); assert.deepEqual(foreignApis, []);
    const report = { verified: true, checks, browserErrors: errors, academicWrites: writes, isolatedGradeWrites: gradeWrites, obsoleteListRequests: obsolete.length, foreignApis, nativeAndroid: false };
    fs.writeFileSync('.expo/dev/personal28-verificacion.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
  } catch (error) { if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: '.expo/dev/personal28-revision-pendiente.png' }).catch(() => {}); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(JSON.stringify({ verified: false, stage, route: activePage?.url().split('?')[0], errorType: error.name, message: error.message.slice(0, 800) })); process.exitCode = 1; });
