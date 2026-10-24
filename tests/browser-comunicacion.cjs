// Real local reads; all academic mutations and large datasets are isolated fixtures.
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
  for (let i = 0; i < 80; i++) { try { const r = await fetch(api + '/dev/ready', { signal: AbortSignal.timeout(3000) }); if (r.ok) { ready = await r.json(); break; } } catch {} await new Promise(resolve => setTimeout(resolve, 400)); }
  assert.equal(ready?.schema, 'ssp_test');
  let webReady = false;
  for (let i = 0; i < 90; i++) { try { const response = await fetch(web, { method: 'HEAD', signal: AbortSignal.timeout(5000) }); if (response.ok) { webReady = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 500)); }
  assert.ok(webReady, 'Expo no terminó de iniciar.');
  const env = parseEnv(fs.readFileSync(path.resolve('../appSSP-backend/.env'), 'utf8'));
  const login = await fetch(api + '/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'alumno.prueba@unsa.edu.pe', password: env.TEST_SEED_PASSWORD }) });
  assert.equal(login.status, 200); const session = await login.json(), headers = { Authorization: 'Bearer ' + session.token };
  const aulas = await (await fetch(api + '/api/v1/comunicacion/aulas', { headers })).json(), aula = aulas.find(a => a.estado === 'ACTIVA'); assert.ok(aula);
  const contacts = await (await fetch(api + '/api/v1/aulas/' + aula.id + '/contactos', { headers })).json(), peer = contacts[0]; assert.ok(peer);
  const fixtureAula = { ...aula }, date = '2026-10-23T12:00:00Z';
  const direct = Array.from({ length: 45 }, (_, i) => ({ id: 'fixture-md-' + String(i).padStart(3, '0'), aulaId: aula.id, remitenteId: peer.userId, remitenteNombre: peer.nombre, destinatarioId: session.user.id, texto: 'Mensaje de prueba ' + i, mio: false, leido: false, fecha: date }));
  const announcements = Array.from({ length: 45 }, (_, i) => ({ id: 'fixture-an-' + i, aulaId: aula.id, titulo: 'Anuncio de prueba ' + i, autorNombre: peer.nombre, fijado: i < 17, fecha: date, resumen: 'Resumen breve del comunicado.', mensaje: 'Texto completo del anuncio ' + i + '. ' + 'Detalles del trabajo académico. '.repeat(30) }));
  const threads = Array.from({ length: 45 }, (_, i) => ({ id: 'fixture-thread-' + i, aulaId: aula.id, titulo: 'Tema de prueba ' + i, autorNombre: peer.nombre, respuestas: i === 0 ? 45 : 0, fecha: date }));
  const replies = Array.from({ length: 45 }, (_, i) => ({ id: 'fixture-reply-' + i, hiloId: threads[0].id, autorNombre: peer.nombre, texto: 'Respuesta de prueba ' + i, fecha: date }));
  const files = Array.from({ length: 45 }, (_, i) => ({ id: 'fixture-file-' + i, aulaId: aula.id, subidoPorId: i < 25 ? peer.userId : session.user.id, subidoPorNombre: i < 25 ? peer.nombre : 'Alumno de prueba', nombreOriginal: 'Documento de prueba ' + i + '.pdf', tipoMime: 'application/pdf', tamanio: 512, createdAt: date }));
  let failMore = true, lostResponse = true, sendCalls = 0, readCalls = 0, downloads = 0, deleteMode = 'conflict', pageMode = 'normal';
  const sent = new Map();
  const browser = await chromium.launch({ headless: true });
  async function create(fixture) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true }), page = await context.newPage();
    page.setDefaultTimeout(25000); activePage = page;
    page.on('pageerror', reason => errors.push(reason.message.slice(0, 200)));
    page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource|net::ERR_FAILED/.test(message.text())) errors.push(message.text().slice(0, 300)); });
    await page.addInitScript(({ api, session }) => sessionStorage.setItem('ssp.session.' + Array.from(api).map(c => c.charCodeAt(0).toString(16)).join(''), JSON.stringify(session)), { api, session });
    await page.route('**/api/v1/**', async route => {
      const request = route.request(), url = new URL(request.url()), pathname = url.pathname;
      if (url.origin !== api) { foreignApis.push(url.origin); return route.abort(); }
      requests.push({ fixture, method: request.method(), path: pathname });
      const json = (status, value) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
      const slice = (pool, extra = {}) => { const start = Number(url.searchParams.get('cursor') || 0); return json(200, { items: pool.slice(start, start + 20), total: pool.length, siguiente: start + 20 < pool.length ? String(start + 20) : null, ...extra }); };
      if (fixture) {
        if (pathname === '/api/v1/comunicacion/aulas') return json(200, [fixtureAula]);
        if (pathname.endsWith('/contactos')) return json(200, [{ ...peer, noLeidos: direct.filter(m => !m.mio && !m.leido).length }]);
        if (pathname.endsWith('/mensajes/' + peer.userId + '/pagina')) {
          if (pageMode === 'forbidden') return json(403, {});
          if (url.searchParams.has('cursor') && failMore) { failMore = false; return json(503, {}); }
          return slice(direct, { noLeidos: direct.filter(m => !m.mio && !m.leido).length });
        }
        if (pathname.endsWith('/mensajes/' + peer.userId + '/lectura')) {
          readCalls++; const ids = request.postDataJSON().mensajeIds;
          for (const id of ids) { const message = direct.find(row => row.id === id); assert.ok(message && !message.mio); message.leido = true; }
          return json(200, { mensajeIds: ids });
        }
        if (pathname.endsWith('/mensajes/' + peer.userId) && request.method() === 'POST') {
          sendCalls++; const value = request.postDataJSON();
          let message = sent.get(value.solicitudId);
          if (!message) { message = { id: 'fixture-sent-' + sent.size, aulaId: aula.id, remitenteId: session.user.id, remitenteNombre: 'Alumno de prueba', destinatarioId: peer.userId, texto: value.texto, mio: true, leido: false, fecha: date }; sent.set(value.solicitudId, message); direct.unshift(message); }
          assert.equal(message.texto, value.texto);
          if (lostResponse) { lostResponse = false; return json(500, {}); }
          return json(201, message);
        }
        if (pathname.endsWith('/anuncios/pagina')) return slice(announcements.filter(a => url.searchParams.get('fijados') !== 'true' || a.fijado).map(({ mensaje, ...a }) => a));
        if (pathname.includes('/anuncios/') && pathname.endsWith('/detalle')) return json(200, announcements.find(a => pathname.includes('/' + a.id + '/')));
        if (pathname.endsWith('/foros/pagina')) return slice(threads);
        if (pathname.includes('/foros/') && pathname.endsWith('/detalle')) return json(200, threads.find(t => pathname.includes('/' + t.id + '/')));
        if (pathname.endsWith('/foros/' + threads[0].id + '/mensajes/pagina')) return slice(replies);
        if (pathname.endsWith('/foros/' + threads[0].id + '/mensajes') && request.method() === 'POST') { const value = request.postDataJSON(), row = { id: 'fixture-new-reply', hiloId: threads[0].id, autorNombre: 'Alumno de prueba', texto: value.texto, fecha: date }; replies.unshift(row); return json(201, row); }
        if (pathname.endsWith('/foros') && request.method() === 'POST') { const value = request.postDataJSON(), row = { id: 'fixture-new-thread', aulaId: aula.id, autorNombre: 'Alumno de prueba', titulo: value.titulo, respuestas: 0, fecha: date }; threads.unshift(row); return json(201, row); }
        if (pathname.endsWith('/archivos/pagina')) return slice(files.filter(file => url.searchParams.get('tipo') === 'propios' ? file.subidoPorId === session.user.id : url.searchParams.get('tipo') === 'materiales' ? file.subidoPorId !== session.user.id : true));
        if (pathname.includes('/archivos/') && pathname.endsWith('/descargar')) { downloads++; return route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4\n%%EOF' }); }
        if (pathname.includes('/archivos/') && request.method() === 'DELETE') { if (deleteMode === 'conflict') return json(409, { detail: 'El documento pertenece a una entrega o a su historial y debe conservarse.' }); const id = pathname.split('/').at(-1); files.splice(files.findIndex(file => file.id === id), 1); return route.fulfill({ status: 204 }); }
      }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) { writes.push(request.method() + ' ' + pathname); return route.abort(); }
      return route.continue();
    });
    return page;
  }
  const button = (page, title) => page.getByRole('button', { name: title, exact: true });
  const heading = (page, title) => page.getByRole('heading', { name: title, exact: true }).waitFor();
  const back = page => button(page, 'Volver').click();
  const base = '/alumno/aulas/';
  const url = (view, extra = '') => web + base + view + '?aulaId=' + encodeURIComponent(aula.id) + extra;
  async function widths(page) { for (const width of [360, 390, 430]) { await page.setViewportSize({ width, height: 844 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false); } await page.setViewportSize({ width: 390, height: 844 }); }
  try {
    fs.mkdirSync('.expo/dev', { recursive: true });
    stage = 'consultas-reales'; const real = await create(false);
    await real.goto(url('mensajes'), { waitUntil: 'networkidle', timeout: 120000 }); await heading(real, 'Mensajes');
    await real.getByRole('button', { name: new RegExp(peer.nombre) }).click(); await heading(real, peer.nombre); await button(real, 'Actualizar conversación').waitFor();
    await button(real, 'Escribir mensaje').click(); await real.getByLabel('Tu mensaje', { exact: true }).fill('Borrador local de prueba sin enviar.'); await real.getByText('Borrador guardado en este dispositivo.', { exact: true }).waitFor();
    await button(real, 'Guardar y volver').click(); await button(real, 'Escribir mensaje').click(); await real.getByText('Borrador recuperado de este dispositivo.', { exact: true }).waitFor(); assert.equal(await real.getByLabel('Tu mensaje', { exact: true }).inputValue(), 'Borrador local de prueba sin enviar.');
    await real.goto(url('documentos'), { waitUntil: 'networkidle' }); await heading(real, 'Documentos del aula'); await button(real, 'Actualizar documentos').waitFor(); await widths(real); await real.screenshot({ path: '.expo/dev/modulos26-documentos-real.png' });
    await real.goto(url('comunidad'), { waitUntil: 'networkidle' }); await heading(real, 'Comunidad del aula'); await button(real, 'Actualizar comunidad').waitFor(); await button(real, 'Foros').click(); await button(real, 'Abrir tema de foro').waitFor();
    checks.push('Mensajes, documentos y comunidad reales; borrador recuperado sin envío académico');
    await real.context().close();

    stage = 'chat-paginacion'; const page = await create(true);
    await page.goto(url('conversacion', '&contactoId=' + encodeURIComponent(peer.userId)), { waitUntil: 'networkidle' }); await page.getByText('20 de 45 mensajes', { exact: true }).waitFor();
    assert.equal(readCalls, 0); await button(page, 'Cargar mensajes anteriores').click(); await button(page, 'Reintentar carga').waitFor(); await page.getByText('20 de 45 mensajes', { exact: true }).waitFor();
    await button(page, 'Reintentar carga').click(); await page.getByText('40 de 45 mensajes', { exact: true }).waitFor();
    await button(page, 'Cargar mensajes anteriores').click(); await page.getByText('45 de 45 mensajes', { exact: true }).waitFor();
    await button(page, 'Marcar recibidos cargados como leídos (45)').click(); await page.getByText('0 mensajes recibidos sin leer en total', { exact: true }).waitFor(); assert.equal(readCalls, 1); await page.getByText('45 de 45 mensajes', { exact: true }).waitFor(); await widths(page);
    await page.screenshot({ path: '.expo/dev/modulos26-chat.png' });
    checks.push('Chat 20→40→45, fallo/reintento conserva páginas y lectura explícita no reinicia lo cargado');
    stage = 'mensaje-pendiente'; await button(page, 'Escribir mensaje').click(); await page.getByLabel('Tu mensaje', { exact: true }).fill('Consulta ficticia con resultado inicial incierto.');
    await page.getByText('Borrador guardado en este dispositivo.', { exact: true }).waitFor(); await button(page, 'Revisar mensaje').click(); assert.equal(sendCalls, 0);
    await button(page, 'Confirmar envío').evaluate(node => { node.click(); node.click(); }); await button(page, 'Reintentar envío confirmado').waitFor(); assert.equal(sendCalls, 1); assert.equal(sent.size, 1);
    await button(page, 'Guardar y volver').click(); await page.getByRole('tab', { name: /Más/ }).click(); await page.getByRole('button', { name: /^Borradores Contenidos/ }).click(); await heading(page, 'Mis borradores'); await page.getByText('1 envío pendiente confirmado', { exact: true }).waitFor();
    await page.reload({ waitUntil: 'networkidle' }); await heading(page, 'Mis borradores'); await page.getByText('1 envío pendiente confirmado', { exact: true }).waitFor();
    await button(page, 'Enviar pendientes confirmados').click(); await page.getByText('1 envío confirmado.', { exact: true }).waitFor(); assert.equal(sendCalls, 2); assert.equal(sent.size, 1); await page.getByText('0 envíos pendientes confirmados', { exact: true }).waitFor();
    checks.push('Mensaje con confirmación, doble clic, respuesta perdida y reintento después de recargar: un único mensaje con la misma solicitud');

    stage = 'anuncios-foros'; await page.goto(url('comunidad'), { waitUntil: 'networkidle' }); await page.getByText('20 de 45 anuncios', { exact: true }).waitFor();
    assert.equal(requests.filter(r => r.fixture && r.path.includes('/anuncios/') && r.path.endsWith('/detalle')).length, 0);
    await page.getByRole('button', { name: /^Anuncio de prueba 0 / }).click(); await heading(page, 'Anuncio del aula'); await page.getByText(/^Texto completo del anuncio 0\./).waitFor(); await back(page); await page.getByText('20 de 45 anuncios', { exact: true }).waitFor();
    await button(page, 'Fijados').click(); await page.getByText('17 de 17 anuncios', { exact: true }).waitFor(); await button(page, 'Foros').click(); await page.getByText('20 de 45 temas', { exact: true }).waitFor();
    await page.getByRole('button', { name: /^Tema de prueba 0 / }).click(); await heading(page, 'Conversación del aula'); await page.getByText('20 de 45 respuestas', { exact: true }).waitFor();
    await button(page, 'Cargar mensajes anteriores').click(); await page.getByText('40 de 45 respuestas', { exact: true }).waitFor(); await button(page, 'Escribir respuesta').click(); await page.getByLabel('Tu mensaje', { exact: true }).fill('Respuesta ficticia con revisión previa.'); await button(page, 'Revisar mensaje').click(); await button(page, 'Confirmar envío').click(); await heading(page, 'Conversación del aula'); await page.getByText('20 de 46 respuestas', { exact: true }).waitFor();
    await widths(page); await page.screenshot({ path: '.expo/dev/modulos26-foro.png' }); await back(page); await button(page, 'Abrir tema de foro').click(); await page.getByLabel('Tema de discusión', { exact: true }).fill('Nuevo tema ficticio de verificación'); await button(page, 'Revisar mensaje').click(); await button(page, 'Confirmar envío').click(); await heading(page, 'Comunidad del aula'); await page.getByText('20 de 46 temas', { exact: true }).waitFor();
    checks.push('Anuncios con resumen/detalle al abrir, fijados, foro individual sin listado completo, respuestas y tema con confirmación simulada');

    stage = 'documentos'; await page.goto(url('documentos'), { waitUntil: 'networkidle' }); await page.getByText('20 de 25 documentos', { exact: true }).waitFor(); assert.equal(downloads, 0);
    const download = page.waitForEvent('download'); await button(page, 'Descargar Documento de prueba 0.pdf').click(); await download; assert.equal(downloads, 1);
    await button(page, 'Todos').click(); await page.getByText('20 de 45 documentos', { exact: true }).waitFor(); await button(page, 'Ver más').click(); await page.getByText('40 de 45 documentos', { exact: true }).waitFor();
    await button(page, 'Mis documentos').click(); await page.getByText('20 de 20 documentos', { exact: true }).waitFor(); await button(page, 'Eliminar carga propia').first().click(); await button(page, 'Confirmar eliminación de la carga').click(); await page.getByRole('alert').filter({ hasText: /pertenece a una entrega/ }).waitFor(); await page.getByText('20 de 20 documentos', { exact: true }).waitFor();
    deleteMode = 'ok'; await button(page, 'Confirmar eliminación de la carga').click(); await page.getByText('19 de 19 documentos', { exact: true }).waitFor(); await widths(page); await page.screenshot({ path: '.expo/dev/modulos26-documentos.png' });
    await button(page, 'Subir documento propio').click(); await heading(page, 'Subir documento'); await page.getByText('Subir un documento no confirma una entrega.', { exact: false }).waitFor();
    checks.push('Documentos por tipo y páginas; descarga explícita; eliminación protege una entrega y conserva filas ante conflicto');

    stage = 'guia-permisos'; await page.getByRole('tab', { name: /Más/ }).click(); await page.getByRole('button', { name: /^Guía de prácticas/ }).click(); await heading(page, 'Guía de prácticas');
    await button(page, 'Leer guía: Retomar borradores y envíos confirmados').click(); await page.getByText(/Un envío Confirmado y pendiente conserva su solicitud/).waitFor(); await widths(page);
    pageMode = 'forbidden'; await page.goto(url('conversacion', '&contactoId=' + encodeURIComponent(peer.userId)), { waitUntil: 'networkidle' }); await page.getByRole('alert').waitFor(); assert.equal(await button(page, 'Escribir mensaje').count(), 0);
    const fullPaths = new Set(['/api/v1/aulas/' + aula.id + '/anuncios', '/api/v1/aulas/' + aula.id + '/foros', '/api/v1/aulas/' + aula.id + '/archivos', '/api/v1/aulas/' + aula.id + '/mensajes/' + peer.userId]);
    assert.equal(requests.filter(r => r.method === 'GET' && fullPaths.has(r.path)).length, 0);
    checks.push('Guía actualizada, anchos 360/390/430, permisos retirados y ninguna lista antigua completa');
    assert.deepEqual(errors, []); assert.deepEqual(writes, []); assert.deepEqual(foreignApis, []);
    const report = { verified: true, checks, browserErrors: errors, realAcademicWrites: writes, foreignApis, simulatedPrivateSends: sendCalls, uniquePrivateMessages: sent.size, simulatedReadReceipts: readCalls, nativeAndroid: false };
    fs.writeFileSync('.expo/dev/modulos26-verificacion.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
  } catch (error) { if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: '.expo/dev/modulos26-revision-pendiente.png' }).catch(() => {}); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(JSON.stringify({ verified: false, stage, errorType: error.name, message: error.message.slice(0, 700) })); process.exitCode = 1; });
