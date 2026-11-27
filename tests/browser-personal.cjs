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
  const hourRows = Array.from({ length: 45 }, (_, i) => { const day = new Date('2026-10-24T12:00:00Z'); day.setUTCDate(day.getUTCDate() - i); return { id: 'fixture-h-' + String(i).padStart(2, '0'), practicaId: 'fixture-p-7', fecha: day.toISOString(), horas: i < 15 ? 1 : 2, descripcion: 'Actividad ' + String(i).padStart(2, '0'), estadoValidacion: i < 15 ? 'PENDIENTE' : i < 21 ? 'RECHAZADO' : 'VALIDADO', revision: 0, observacion: i >= 15 && i < 21 ? 'Corrige la actividad' : '' }; });
  const hourTotals = key => hourRows.filter(r => r.estadoValidacion === key).reduce((sum, r) => sum + r.horas, 0);
  const tasks = Array.from({ length: 45 }, (_, i) => ({ id: 'fixture-k-' + i, aulaId: classroom.id, titulo: 'Informe ' + String(i).padStart(3, '0'), resumen: 'Resumen de la tarea ' + i, fechaLimite: null, createdAt: date, revision: i % 3, entregas: i }));
  const adminAulas = aulas.map((a, i) => ({ ...a, descripcion: 'Aula aislada ' + i, estado: i < 30 ? 'ACTIVA' : 'CONCLUIDA', inscritos: i === 0 ? 30 : i % 6 }));
  const adminUsers = Array.from({ length: 45 }, (_, i) => ({ id: 'fixture-u-' + i, nombres: 'Usuario ' + String(i).padStart(3, '0'), apellidos: 'Prueba', email: 'usuario' + i + '@unsa.edu.pe', role: i < 4 ? 'PROFESOR' : 'ALUMNO', createdAt: date }));
  const adminStudents = students.map((s, i) => ({ alumnoId: s.alumnoId, alumnoNombre: s.alumnoNombre, email: s.alumnoEmail, inscrito: i < 30 }));
  const adminReports = adminAulas.map(a => ({ aulaId: a.id, aulaNombre: a.nombre, periodo: a.periodo, profesorNombre: a.profesorNombre, estado: a.estado, inscritos: a.inscritos, promedioNotas: a.id.endsWith('0') ? null : 16, asistenciaPct: a.id.endsWith('1') ? null : 85 }));
  const adminResumen = { totalAlumnos: 45, totalProfesores: 4, totalAulas: 45, aulasActivas: 30, practicasEnCurso: 10, practicasCerradas: 5, horasPromedio: 8 };
  const adminAudits = [{ id: 'fixture-aud-att', userNombre: 'Admin Prueba', accion: 'ASISTENCIA_ACADEMICA', detalle: JSON.stringify({ aulaId: 'fixture-a-0', fecha: '2026-10-20', antes: [{ practicanteId: 'fixture-u-1', presente: true }, { practicanteId: 'fixture-u-2', presente: false }], despues: [{ practicanteId: 'fixture-u-1', presente: false }, { practicanteId: 'fixture-u-2', presente: true }], conservadosFueraDelPadron: [] }), fecha: '2026-10-21T12:00:00Z', aulaNombre: 'Aula de prueba 000', estudiantes: [{ id: 'fixture-u-1', nombre: 'Practicante 001' }, { id: 'fixture-u-2', nombre: 'Practicante 002' }] },
    ...Array.from({ length: 14 }, (_, i) => ({ id: 'fixture-aud-att-' + i, userNombre: 'Admin Prueba', accion: 'ASISTENCIA_ACADEMICA', detalle: JSON.stringify({ aulaId: 'fixture-a-1', fecha: '2026-09-' + String(10 + i).padStart(2, '0'), antes: [], despues: [] }), fecha: '2026-10-2' + (i % 9) + 'T12:00:00Z', aulaNombre: 'Aula de prueba 001', estudiantes: [] })),
    ...Array.from({ length: 20 }, (_, i) => ({ id: 'fixture-aud-admin-' + i, userNombre: 'Admin Prueba', accion: 'ESTADO_AULA', detalle: 'Cambio ' + String(i).padStart(3, '0'), fecha: '2026-10-1' + (i % 9) + 'T12:00:00Z', aulaNombre: null, estudiantes: [] })),
    ...Array.from({ length: 10 }, (_, i) => ({ id: 'fixture-aud-horas-' + i, userNombre: 'Admin Prueba', accion: 'HORAS_VALIDACION', detalle: 'Validacion ' + String(i).padStart(3, '0'), fecha: '2026-10-0' + (i % 9 + 1) + 'T12:00:00Z', aulaNombre: null, estudiantes: [] }))];
  const communityAnnouncements = Array.from({ length: 45 }, (_, i) => ({ id: 'fixture-an-' + String(i).padStart(3, '0'), aulaId: classroom.id, titulo: 'Anuncio ' + String(i).padStart(3, '0'), autorNombre: 'Docente de prueba', fijado: i < 17, fecha: date, resumen: 'Resumen del anuncio ' + i }));
  const communityThreads = Array.from({ length: 45 }, (_, i) => ({ id: 'fixture-fh-' + String(i).padStart(3, '0'), aulaId: classroom.id, autorNombre: 'Practicante 000', titulo: 'Tema ' + String(i).padStart(3, '0'), respuestas: i, fecha: date }));
  let failMore = true, failTaskMore = true, failHoursMore = true, denied = false, gradeWrites = 0, reviewWrites = 0;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
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
        if (pathname === '/api/v1/equipo/aulas/' + classroom.id + '/tareas/pagina') {
          if (url.searchParams.has('cursor') && failTaskMore) { failTaskMore = false; return json(503, {}); }
          return slice(search(tasks));
        }
        if (pathname.startsWith('/api/v1/equipo/aulas/' + classroom.id + '/tareas/')) {
          const row = tasks.find(t => t.id === pathname.split('/').at(-1));
          return row ? json(200, { ...row, descripcion: 'Instrucciones completas de ' + row.titulo, entrega: null }) : json(404, {});
        }
        if (pathname.endsWith('/alumnos/pagina')) return slice(search(students));
        if (pathname.endsWith('/notas/pagina')) return slice(search(grades), { promedioGeneral: 0 });
        if (pathname.endsWith('/entregas/pagina')) return slice(search(deliveries.filter(d => url.searchParams.get('pendientes') !== 'true' || d.nota === null)).map(({ descripcion, comentario, archivoId, retroalimentacion, revision, ...row }) => row));
        if (pathname.startsWith('/api/v1/equipo/aulas/' + classroom.id + '/entregas/')) {
          const row = deliveries.find(d => d.id === pathname.split('/').at(-1)); return row ? json(200, row) : json(404, {});
        }
        if (pathname === '/api/v1/equipo/practicas/pagina') return slice(search(practices.filter(p => url.searchParams.get('estado') === 'CERRADAS' ? p.estado === 'CERRADA' : url.searchParams.get('estado') === 'ABIERTAS' ? p.estado !== 'CERRADA' : true)));
        if (pathname === '/api/v1/practicas/capacidades') return json(200, { versionHoras: 2 });
        if (pathname === '/api/v1/equipo/practicas/fixture-p-7') return json(200, practices[7]);
        if (pathname === '/api/v1/equipo/practicas/fixture-p-7/horas/pagina') {
          const estado = url.searchParams.get('estado') || 'TODAS';
          const map = { PENDIENTES: 'PENDIENTE', VALIDADAS: 'VALIDADO', RECHAZADAS: 'RECHAZADO' };
          const pool = hourRows.filter(r => estado === 'TODAS' || r.estadoValidacion === map[estado]);
          if (url.searchParams.has('cursor') && failHoursMore) { failHoursMore = false; return json(503, {}); }
          const start = Number(url.searchParams.get('cursor') || 0);
          return json(200, { items: pool.slice(start, start + 20), total: pool.length, siguiente: start + 20 < pool.length ? String(start + 20) : null, horasValidadas: hourTotals('VALIDADO'), horasPendientes: hourTotals('PENDIENTE'), horasRechazadas: hourTotals('RECHAZADO') });
        }
        if (pathname.includes('/empresa/horas/') && request.method() === 'PUT') {
          const value = request.postDataJSON(), row = hourRows.find(r => pathname.includes('/' + r.id));
          assert.ok(row); assert.equal(value.revision, row.revision);
          row.estadoValidacion = value.estadoValidacion; row.observacion = value.observacion; row.revision += 1;
          reviewWrites++; return json(200, row);
        }
        if (pathname.endsWith('/calificar') && request.method() === 'PUT') {
          gradeWrites++; const value = request.postDataJSON(), row = deliveries.find(d => pathname.includes('/' + d.id + '/'));
          assert.ok(row); assert.equal(value.nota, 0); assert.equal(value.revisionEntrega, 2);
          row.nota = value.nota; row.retroalimentacion = value.retroalimentacion; row.estado = 'CALIFICADA'; return json(200, row);
        }
        if (pathname.includes('/seguimiento/')) return json(404, { detail: 'Ficha aislada para comprobar el destino.' });
        const adminPage = (pool, extra = {}) => { const size = Number(url.searchParams.get('limite') || 20), start = Number(url.searchParams.get('cursor') || 0); return json(200, { items: pool.slice(start, start + size), total: pool.length, siguiente: start + size < pool.length ? String(start + size) : null, ...extra }); };
        if (pathname === '/api/v1/admin/capacidades') return json(200, { versionAdministracion: 1 });
        if (pathname === '/api/v1/admin/usuarios/pagina') {
          const rol = url.searchParams.get('rol') || 'TODOS';
          return adminPage(search(adminUsers.filter(u => rol === 'TODOS' || u.role === rol)), { totalDocentes: 4 });
        }
        if (pathname === '/api/v1/admin/aulas/pagina') {
          const estado = url.searchParams.get('estado') || 'TODAS';
          return adminPage(search(adminAulas.filter(a => estado === 'TODAS' || a.estado === estado)), { aulasActivas: 30 });
        }
        if (pathname === '/api/v1/admin/aulas/fixture-a-0') return json(200, adminAulas[0]);
        if (pathname === '/api/v1/admin/aulas/fixture-a-0/matriculas/pagina') {
          const estado = url.searchParams.get('estado') || 'TODOS';
          const pool = adminStudents.filter(s => estado === 'TODOS' || estado === 'MATRICULADOS' && s.inscrito || estado === 'SIN_MATRICULA' && !s.inscrito);
          return adminPage(search(pool), { aulaId: 'fixture-a-0', aulaNombre: adminAulas[0].nombre, revision: 'f'.repeat(64), matriculados: 30 });
        }
        if (pathname === '/api/v1/admin/reportes/pagina') {
          const estado = url.searchParams.get('estado') || 'TODAS';
          return adminPage(search(adminReports.filter(a => estado === 'TODAS' || a.estado === estado)), { resumen: adminResumen });
        }
        if (pathname === '/api/v1/admin/auditoria/pagina') {
          const categoria = url.searchParams.get('categoria') || 'TODAS';
          return adminPage(search(adminAudits.filter(a => categoria === 'TODAS' || categoria === 'ASISTENCIA' && a.accion === 'ASISTENCIA_ACADEMICA' || categoria === 'HORAS' && a.accion.startsWith('HORAS_') || categoria === 'ADMIN' && a.accion !== 'ASISTENCIA_ACADEMICA' && !a.accion.startsWith('HORAS_'))));
        }
        if (pathname === '/api/v1/comunicacion/capacidades') return json(200, { versionComunicacion: 1 });
        if (pathname === '/api/v1/comunicacion/aulas') return json(200, [{ id: classroom.id, nombre: classroom.nombre, periodo: classroom.periodo, estado: 'ACTIVA' }]);
        if (pathname === '/api/v1/aulas/' + classroom.id + '/anuncios/pagina') {
          const pinned = url.searchParams.get('fijados') === 'true';
          return slice(search(communityAnnouncements.filter(a => !pinned || a.fijado)));
        }
        if (pathname.startsWith('/api/v1/aulas/' + classroom.id + '/anuncios/') && pathname.endsWith('/detalle')) {
          const row = communityAnnouncements.find(a => pathname.includes('/' + a.id + '/'));
          return row ? json(200, { ...row, mensaje: 'Contenido completo del ' + row.titulo + '.' }) : json(404, {});
        }
        if (pathname === '/api/v1/aulas/' + classroom.id + '/foros/pagina') return slice(search(communityThreads));
        if (pathname.startsWith('/api/v1/aulas/' + classroom.id + '/foros/') && pathname.endsWith('/detalle')) {
          const row = communityThreads.find(h => pathname.includes('/' + h.id + '/'));
          return row ? json(200, row) : json(404, {});
        }
        const forumMatch = pathname.match(/^\/api\/v1\/foros\/([^/]+)\/mensajes\/pagina$/);
        if (forumMatch) return slice(Array.from({ length: 45 }, (_, i) => ({ id: 'fixture-fm-' + String(44 - i).padStart(3, '0'), hiloId: forumMatch[1], autorNombre: 'Practicante 000', texto: 'Respuesta ' + String(44 - i).padStart(3, '0'), fecha: date })));
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
    await button(real, 'Recursos').click();
    const realTasks = real.waitForResponse(response => new URL(response.url()).pathname.endsWith('/tareas/pagina'));
    await real.getByRole('button', { name: /^Publicar y consultar tareas / }).click(); await heading(real, 'Tareas del aula'); await realTasks;
    await button(real, 'Actualizar tareas publicadas').waitFor(); await button(real, 'Volver').click();
    const realHistory = real.waitForResponse(response => new URL(response.url()).pathname.endsWith('/asistencia/historial'));
    await button(real, 'Recursos').click(); await real.getByRole('button', { name: /^Tomar asistencia académica / }).click(); await heading(real, 'Asistencia académica'); await realHistory;
    if (realDeliveries.items.length) {
      const delivery = realDeliveries.items[0]; await real.goto(web + '/revisar-entrega?aulaId=' + encodeURIComponent(aula.id) + '&entregaId=' + encodeURIComponent(delivery.id), { waitUntil: 'networkidle' });
      await heading(real, 'Revisar entrega'); await real.getByText('Nota actual: ' + (delivery.nota ?? 'Sin calificar'), { exact: true }).waitFor();
    }
    const realPractices = await get('profesor', '/equipo/practicas/pagina?limite=20');
    const realPractice = realPractices.items[0]; assert.ok(realPractice, 'El profesor no tiene prácticas para consultar metas.');
    const realGoals = real.waitForResponse(response => new URL(response.url()).pathname.endsWith('/metas/pagina'));
    await real.goto(web + '/metas?practicaId=' + encodeURIComponent(realPractice.id), { waitUntil: 'networkidle' });
    await heading(real, 'Metas de prácticas'); await realGoals; await button(real, 'Actualizar metas').waitFor();
    assert.ok(requests.some(r => !r.fixture && r.role === 'profesor' && r.path === '/api/v1/equipo/practicas/' + realPractice.id));
    assert.ok(requests.some(r => !r.fixture && r.role === 'profesor' && r.path.endsWith('/metas/pagina')));
    const realSelector = real.waitForResponse(response => new URL(response.url()).pathname.endsWith('/practicas/pagina'));
    await button(real, 'Elegir otra práctica').click(); await realSelector; await heading(real, 'Metas de prácticas');
    assert.ok(requests.some(r => !r.fixture && r.role === 'profesor' && r.path === '/api/v1/equipo/practicas/pagina'));
    assert.equal(requests.filter(r => !r.fixture && r.path.includes('/practicas/historial/')).length, 0);
    assert.ok(requests.some(r => !r.fixture && r.role === 'profesor' && r.path.endsWith('/tareas/pagina')));
    checks.push('Docente real: aulas, padrón, notas, tareas/asistencia con historial paginado, metas paginadas con detalle exacto y selector paginado, y consulta individual de entrega sin consultas completas ni historial automático'); await real.context().close();

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
    stage = 'tareas docentes';
    await button(teacher, 'Recursos').click(); await teacher.getByRole('button', { name: /^Publicar y consultar tareas / }).click();
    await heading(teacher, 'Tareas del aula'); await counter(teacher, '20 de 45 tareas');
    await top(teacher); await button(teacher, 'Ver más').click(); await button(teacher, 'Reintentar carga').waitFor(); await counter(teacher, '20 de 45 tareas');
    await button(teacher, 'Reintentar carga').click(); await counter(teacher, '40 de 45 tareas'); await more(teacher, '45 de 45 tareas');
    await top(teacher); await teacher.getByLabel('Buscar tarea', { exact: true }).fill('Informe 000'); await counter(teacher, '1 de 1 tareas');
    await teacher.getByRole('button', { name: /^Informe 000 / }).click(); await teacher.getByText('Editar instrucciones o ampliar plazo', { exact: true }).waitFor();
    assert.ok(requests.some(r => r.fixture && r.path === '/api/v1/equipo/aulas/' + classroom.id + '/tareas/fixture-k-0'));
    assert.equal(await teacher.getByLabel('Título de la tarea', { exact: true }).inputValue(), 'Informe 000');
    await button(teacher, 'Cancelar edición de tarea').click(); await counter(teacher, '1 de 1 tareas');
    await button(teacher, 'Volver').click(); await button(teacher, 'Entregas').click(); await counter(teacher, '20 de 44 entregas');
    checks.push('Tareas docentes 20→40→45 con fallo/reintento, búsqueda en servidor y detalle exacto solo al abrir la tarea');
    await button(teacher, 'Volver').click(); assert.equal(await teacher.getByRole('tab').count(), 5); denied = true; await button(teacher, 'Actualizar aulas').click(); await teacher.getByRole('alert').filter({ hasText: 'No tienes permiso para esta acción.' }).waitFor();
    assert.equal(await teacher.getByRole('button', { name: new RegExp('^' + classroom.nombre + ' ') }).count(), 0);
    checks.push('Detalle puntual, nota cero confirmada con revisión vigente y actualización de pendientes; permiso retirado vacía la lista'); await teacher.context().close();

    stage = 'supervision'; const supervisor = await create('supervisor', true);
    await supervisor.goto(web + '/equipo/trabajo', { waitUntil: 'networkidle' }); await heading(supervisor, 'Mis practicantes'); await counter(supervisor, '20 de 45 prácticas');
    assert.equal(await supervisor.getByRole('textbox').count(), 0); await more(supervisor, '40 de 45 prácticas'); await more(supervisor, '45 de 45 prácticas'); await top(supervisor);
    await button(supervisor, 'Cerradas').click(); await counter(supervisor, '7 de 7 prácticas'); await button(supervisor, 'Abiertas').click(); await counter(supervisor, '20 de 38 prácticas'); await supervisor.screenshot({ path: '.expo/dev/personal28-supervisor.png' });
    const capsCall = supervisor.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/practicas/capacidades');
    await supervisor.goto(web + '/equipo/revision', { waitUntil: 'networkidle' }); await heading(supervisor, 'Validar horas'); await capsCall;
    await counter(supervisor, '20 de 45 prácticas');
    const detailCall = supervisor.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/equipo/practicas/fixture-p-7');
    await supervisor.getByRole('button', { name: /Practicante 007/ }).first().click(); await detailCall;
    await counter(supervisor, '20 de 45 actividades'); await counter(supervisor, '48 h validadas · Meta: 360 h');
    await button(supervisor, 'Ver más').click(); await button(supervisor, 'Reintentar carga').waitFor(); await counter(supervisor, '20 de 45 actividades');
    await button(supervisor, 'Reintentar carga').click(); await counter(supervisor, '40 de 45 actividades');
    await button(supervisor, 'Pendientes').click(); await counter(supervisor, '15 de 15 actividades');
    await button(supervisor, 'Todas').click(); await counter(supervisor, '20 de 45 actividades');
    await supervisor.getByRole('button', { name: 'Validar horas', exact: true }).first().click();
    await supervisor.getByText('Se validarán 1 h.').waitFor();
    await button(supervisor, 'Confirmar revisión').click();
    await supervisor.getByText('Revisión guardada y confirmada por el servidor.', { exact: true }).waitFor();
    await counter(supervisor, '49 h validadas · Meta: 360 h'); await counter(supervisor, '20 de 45 actividades');
    await supervisor.waitForTimeout(1200);
    await button(supervisor, 'Validadas').click(); await counter(supervisor, '20 de 25 actividades');
    await button(supervisor, 'Ver más').click(); await counter(supervisor, '25 de 25 actividades');
    assert.equal(reviewWrites, 1);
    checks.push('Supervisor: selector paginado, bitácora de horas por páginas con filtros y totales globales, y revisión confirmada'); await supervisor.context().close();
    checks.push('Supervisor sin buscador: páginas y filtros de prácticas abiertas/cerradas');

    stage = 'comunidad docente'; const community = await create('profesor', true);
    await community.goto(web + '/comunidad', { waitUntil: 'networkidle' }); await heading(community, 'Comunidad del aula');
    await counter(community, '20 de 45 anuncios'); await counter(community, '45 anuncios en la consulta');
    await more(community, '40 de 45 anuncios'); await more(community, '45 de 45 anuncios');
    await community.getByLabel('Buscar en el aula').fill('Anuncio 044'); await counter(community, '1 de 1 anuncios');
    await community.getByLabel('Buscar en el aula').fill(''); await counter(community, '20 de 45 anuncios');
    await button(community, 'Mostrar solo fijados').click(); await counter(community, '17 de 17 anuncios');
    await button(community, 'Mostrar todos los anuncios').click(); await counter(community, '20 de 45 anuncios');
    await button(community, 'Ver anuncio completo').first().click(); await community.getByText('Contenido completo del Anuncio', { exact: false }).waitFor();
    await button(community, 'Foros').click(); await counter(community, '20 de 45 temas'); await counter(community, '45 temas en la consulta');
    await more(community, '40 de 45 temas'); await more(community, '45 de 45 temas');
    await community.getByLabel('Buscar en el aula').fill('Tema 044'); await counter(community, '1 de 1 temas');
    await community.getByLabel('Buscar en el aula').fill(''); await counter(community, '20 de 45 temas');
    await button(community, 'Abrir conversación: Tema 000').click(); await heading(community, 'Conversación del aula');
    await counter(community, '20 de 45 respuestas'); await community.getByText('Respuesta 044', { exact: true }).waitFor();
    await more(community, '40 de 45 respuestas'); await more(community, '45 de 45 respuestas'); await community.getByText('Respuesta 000', { exact: true }).waitFor();
    checks.push('Comunidad docente: anuncios, foros y respuestas 20→40→45 con búsqueda en servidor, fijados, detalle completo y contexto exacto del tema'); await community.context().close();

    stage = 'administracion real'; const admin = await create('admin');
    await admin.goto(web + '/docencia', { waitUntil: 'networkidle' }); await heading(admin, 'Mis aulas · Docencia');
    await admin.getByLabel('Buscar aula', { exact: true }).fill(aula.nombre); await admin.getByRole('button', { name: new RegExp('^' + aula.nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).waitFor();
    assert.ok(requests.some(r => !r.fixture && r.role === 'admin' && r.path === '/api/v1/equipo/aulas/pagina'));
    await admin.goto(web + '/administracion', { waitUntil: 'networkidle' }); await heading(admin, 'Administración académica');
    await admin.getByText(/^\d+ de \d+ aulas$/).waitFor();
    await button(admin, 'Directorio de usuarios').click(); await admin.getByText(/^\d+ de \d+ usuarios$/).waitFor();
    await admin.goto(web + '/reportes', { waitUntil: 'networkidle' }); await heading(admin, 'Reporte institucional');
    await admin.getByText('Comunidad académica', { exact: true }).waitFor(); await admin.getByText(/^\d+ de \d+ aulas$/).waitFor();
    await admin.goto(web + '/auditoria', { waitUntil: 'networkidle' }); await heading(admin, 'Auditoría de actividad');
    await admin.getByText(/^\d+ de \d+ registros$/).waitFor();
    for (const path of ['/api/v1/admin/usuarios/pagina', '/api/v1/admin/aulas/pagina', '/api/v1/admin/reportes/pagina', '/api/v1/admin/auditoria/pagina']) assert.ok(requests.some(r => !r.fixture && r.role === 'admin' && r.path === path), 'sin lectura real: ' + path);
    checks.push('Administración real: aulas, directorio, reporte y auditoría por páginas'); await admin.context().close();

    stage = 'administracion aislada'; const adminFixture = await create('admin', true);
    await adminFixture.goto(web + '/administracion', { waitUntil: 'networkidle' }); await heading(adminFixture, 'Administración académica');
    await counter(adminFixture, '20 de 45 aulas'); await counter(adminFixture, '45 aulas · 30 activas');
    await more(adminFixture, '40 de 45 aulas'); await more(adminFixture, '45 de 45 aulas');
    await adminFixture.getByLabel('Buscar aula en administración').fill('Aula de prueba 044'); await counter(adminFixture, '1 de 1 aulas');
    await adminFixture.getByLabel('Buscar aula en administración').fill(''); await counter(adminFixture, '20 de 45 aulas');
    await button(adminFixture, 'Aulas activas').click(); await counter(adminFixture, '20 de 30 aulas');
    await button(adminFixture, 'Aulas concluidas').click(); await counter(adminFixture, '15 de 15 aulas');
    await button(adminFixture, 'Directorio de usuarios').click(); await counter(adminFixture, '20 de 45 usuarios'); await counter(adminFixture, '45 usuarios · 4 docentes');
    await more(adminFixture, '40 de 45 usuarios');
    await adminFixture.getByLabel('Buscar usuario').fill('Usuario 044'); await counter(adminFixture, '1 de 1 usuarios');
    await adminFixture.getByLabel('Buscar usuario').fill(''); await counter(adminFixture, '20 de 45 usuarios');
    await button(adminFixture, 'Docente').click(); await counter(adminFixture, '4 de 4 usuarios');
    assert.ok(requests.some(r => r.fixture && r.path === '/api/v1/admin/usuarios/pagina' && r.query.includes('limite=40') && r.query.includes('rol=PROFESOR')));
    checks.push('Administración aislada: aulas y directorio 20→40→45, totales globales, búsqueda y filtros');

    await adminFixture.goto(web + '/reportes', { waitUntil: 'networkidle' }); await heading(adminFixture, 'Reporte institucional');
    await counter(adminFixture, '45 alumnos · 4 docentes'); await counter(adminFixture, '45 aulas · 30 activas'); await counter(adminFixture, '20 de 45 aulas');
    await more(adminFixture, '40 de 45 aulas');
    await button(adminFixture, 'Solo concluidas').click(); await counter(adminFixture, '15 de 15 aulas');
    await button(adminFixture, 'Solo activas').click(); await counter(adminFixture, '20 de 30 aulas');
    await button(adminFixture, 'Todas las aulas').click(); await counter(adminFixture, '20 de 45 aulas');
    await adminFixture.getByLabel('Buscar aula en el reporte').fill('Aula de prueba 044'); await counter(adminFixture, '1 de 1 aulas');
    checks.push('Reporte aislado: resumen global exacto, aulas paginadas, búsqueda y filtros');

    await adminFixture.goto(web + '/auditoria', { waitUntil: 'networkidle' }); await heading(adminFixture, 'Auditoría de actividad');
    await counter(adminFixture, '20 de 45 registros'); await more(adminFixture, '40 de 45 registros'); await more(adminFixture, '45 de 45 registros');
    await button(adminFixture, 'Asistencia').click(); await counter(adminFixture, '15 de 15 registros');
    await adminFixture.getByText('Asistencia del 2026-10-20', { exact: true }).waitFor();
    await button(adminFixture, 'Ver cambios').first().click();
    await adminFixture.getByText('Practicante 001', { exact: true }).waitFor();
    await adminFixture.getByText('Antes: Presente', { exact: true }).waitFor(); await adminFixture.getByText('Después: Ausente', { exact: true }).waitFor();
    await button(adminFixture, 'Horas').click(); await counter(adminFixture, '10 de 10 registros');
    await button(adminFixture, 'Administración').click(); await counter(adminFixture, '20 de 20 registros');
    await button(adminFixture, 'Toda la actividad').click(); await counter(adminFixture, '20 de 45 registros');
    await adminFixture.getByLabel('Buscar responsable, acción o detalle').fill('Cambio 019'); await counter(adminFixture, '1 de 1 registros');
    await adminFixture.getByLabel('Buscar responsable, acción o detalle').fill(''); await counter(adminFixture, '20 de 45 registros');
    checks.push('Auditoría aislada 20→40→45 con categorías, búsqueda y detalle de asistencia con nombres del servidor');

    await adminFixture.goto(web + '/administrar-aula?aulaId=fixture-a-0', { waitUntil: 'networkidle' }); await heading(adminFixture, 'Gestionar aula');
    await adminFixture.getByText('Docente: Docente de prueba', { exact: true }).waitFor(); await counter(adminFixture, 'Matrículas · 30 estudiantes'); await counter(adminFixture, '20 de 45 estudiantes');
    await more(adminFixture, '40 de 45 estudiantes'); await more(adminFixture, '45 de 45 estudiantes');
    await button(adminFixture, 'Matriculados').click(); await counter(adminFixture, '20 de 30 estudiantes');
    await button(adminFixture, 'Sin matrícula').click(); await counter(adminFixture, '15 de 15 estudiantes');
    await button(adminFixture, 'Todos los estudiantes').click(); await counter(adminFixture, '20 de 45 estudiantes');
    await adminFixture.getByLabel('Buscar estudiante para matrícula').fill('Practicante 044'); await counter(adminFixture, '1 de 1 estudiantes');
    await adminFixture.getByLabel('Buscar estudiante para matrícula').fill(''); await counter(adminFixture, '20 de 45 estudiantes');
    for (const width of [360, 390, 430]) { await adminFixture.setViewportSize({ width, height: 844 }); assert.equal(await adminFixture.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false); }
    await adminFixture.setViewportSize({ width: 390, height: 844 });
    checks.push('Ficha de aula aislada: detalle exacto y padrón 20→40→45 con búsqueda, filtros y tamaños móviles'); await adminFixture.context().close();
    const obsolete = requests.filter(r => r.path === '/api/v1/aulas' || r.path === '/api/v1/profesor/practicantes' || /^\/api\/v1\/profesor\/aulas\/[^/]+\/(entregas|libro|tareas)$/.test(r.path) || r.path === '/api/v1/practicas' || ['/api/v1/admin/usuarios', '/api/v1/admin/aulas', '/api/v1/admin/auditoria', '/api/v1/admin/reportes'].includes(r.path) || /^\/api\/v1\/admin\/aulas\/[^/]+\/matriculas$/.test(r.path) || /^\/api\/v1\/aulas\/[^/]+\/(anuncios|foros)$/.test(r.path) || /^\/api\/v1\/foros\/[^/]+\/mensajes$/.test(r.path));
    assert.deepEqual(obsolete, []); assert.deepEqual(errors, []); assert.deepEqual(writes, []); assert.deepEqual(foreignApis, []);
    const report = { verified: true, checks, browserErrors: errors, academicWrites: writes, isolatedGradeWrites: gradeWrites, isolatedReviewWrites: reviewWrites, obsoleteListRequests: obsolete.length, foreignApis, nativeAndroid: false };
    fs.writeFileSync('.expo/dev/personal28-verificacion.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
  } catch (error) { if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: '.expo/dev/personal28-revision-pendiente.png' }).catch(() => {}); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(JSON.stringify({ verified: false, stage, route: activePage?.url().split('?')[0], errorType: error.name, message: error.message.slice(0, 800) })); process.exitCode = 1; });
