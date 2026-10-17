// Circuito integrado de anuncios, foros, metas y guía; API completamente simulada.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
async function main() {
  const browser = await chromium.launch({ headless: true });
  let page;
  const errors = [];
  try {
    page = await browser.newPage({ viewport: { width: 390, height: 844 } }); page.setDefaultTimeout(20000);
    page.on('pageerror', e => errors.push(e.name));
    page.on('console', m => { if (m.type() === 'error' && m.text().includes('Unexpected text node')) errors.push(m.text()); });
    let role = 'PROFESOR', legacy = false, announcementLost = true, goalLost = true, announcementsPosts = 0, goalPuts = 0;
    const aulas = [{ id: 'a', nombre: 'Comunicación', periodo: 'TEST', estado: 'ACTIVA' }];
    const practica = { id: 'p', practicanteId: 'student', practicanteNombre: 'Alumno Prueba', aulaNombre: 'Comunicación', periodo: 'TEST', estado: 'EN_CURSO', horasAcumuladas: 0, horasMinimas: 360 };
    const announcements = [], threads = [], replies = [], goals = [];
    await page.route('**/api/v1/**', async route => {
      const r = route.request(), path = new URL(r.url()).pathname.replace('/api/v1', ''); let body, status = 200;
      const payload = () => r.postDataJSON();
      if (path === '/auth/login') { role = payload().email.startsWith('profesor') ? 'PROFESOR' : payload().email.startsWith('supervisor') ? 'SUPERVISOR' : 'ALUMNO'; body = { token: 'fixture', user: { id: role === 'ALUMNO' ? 'student' : 'teacher', nombres: 'Cuenta', apellidos: 'Prueba', email: 'cuenta@unsa.edu.pe', role } }; }
      else if (path === '/notificaciones') body = [];
      else if (path === '/alumno/mis-aulas') body = [{ id: 'a', nombre: 'Comunicación', profesorNombre: 'Docente Prueba', ciclo: 'TEST', estado: 'ACTIVA' }];
      else if (path === '/practicas/actual') body = practica;
      else if (path === '/profesor/resumen') body = { alumnosActivos: 1, entregasPendientes: 0, asistenciaPromedio: null };
      else if (path === '/empresa/resumen') body = { practicantesActivos: 1, horasPorValidar: 0, evaluacionesPendientes: 0 };
      else if (path === '/practicas') body = [practica];
      else if (path === '/comunicacion/capacidades') body = { versionComunicacion: legacy ? 0 : 1 };
      else if (path === '/comunicacion/aulas') body = aulas;
      else if (path === '/aulas/a/anuncios') {
        if (r.method() === 'GET') body = announcements;
        else {
          assert.equal(role, 'PROFESOR'); announcementsPosts++;
          const p = payload();
          let saved = announcements.find(a => a.key === p.solicitudId);
          if (!saved) { saved = { id: 'an-1', aulaId: 'a', autorNombre: 'Docente Prueba', fecha: new Date().toISOString(), key: p.solicitudId, ...p }; announcements.push(saved); }
          body = saved; status = 201;
          if (announcementLost) { announcementLost = false; status = 500; body = {}; }
        }
      } else if (path === '/aulas/a/foros') {
        if (r.method() === 'GET') body = threads.map(h => ({ ...h, respuestas: replies.filter(m => m.hiloId === h.id).length }));
        else { const p = payload(); body = { id: 'h-1', aulaId: 'a', autorNombre: 'Alumno Prueba', titulo: p.titulo, respuestas: 0, fecha: new Date().toISOString() }; threads.push(body); status = 201; }
      } else if (path === '/foros/h-1/mensajes') {
        if (r.method() === 'GET') body = replies;
        else { body = { id: `m-${replies.length}`, hiloId: 'h-1', autorNombre: role === 'ALUMNO' ? 'Alumno Prueba' : 'Docente Prueba', texto: payload().texto, fecha: new Date().toISOString() }; replies.push(body); status = 201; }
      } else if (path === '/metas/capacidades') body = { versionMetas: 1, avanceTotal: true };
      else if (path === '/metas/practica/p') {
        if (r.method() === 'GET') body = goals;
        else { assert.equal(role, 'PROFESOR'); const p = payload(); body = { id: 'goal-1', practicaId: 'p', practicanteId: 'student', practicanteNombre: 'Alumno Prueba', tipo: p.tipo, cantidadObjetivo: p.cantidadObjetivo, cantidadAlcanzada: 0, descripcion: p.descripcion, creadoPor: 'Docente Prueba', fechaCreacion: new Date().toISOString() }; goals.push(body); status = 201; }
      } else if (path === '/metas/goal-1/avance-total') {
        assert.equal(role, 'PROFESOR'); goalPuts++;
        const p = payload(); assert.equal(p.anterior, 0); assert.equal(p.cantidad, 2);
        goals[0].cantidadAlcanzada = p.cantidad; body = goals[0];
        if (goalLost) { goalLost = false; status = 500; body = {}; }
      } else throw new Error(`Ruta no prevista: ${r.method()} ${path}`);
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const button = name => page.getByRole('button', { name, exact: true }).filter({ visible: true });
    const visible = text => page.getByText(text, { exact: true }).filter({ visible: true });
    async function signIn(name) {
      await page.goto(process.env.SSP_WEB_URL || 'http://localhost:5173', { waitUntil: 'networkidle' });
      await page.getByLabel('Correo de tu cuenta SSP', { exact: true }).fill(`${name}@unsa.edu.pe`);
      await page.getByLabel('Contraseña', { exact: true }).fill('fixture'); await button('Ingresar').click();
    }
    await signIn('profesor'); await button('Comunidad del aula').click();
    await button('Publicar anuncio').click(); await button('Revisar antes de guardar').click();
    await visible('Título: escribe entre 1 y 200 caracteres.').waitFor(); assert.equal(announcementsPosts, 0);
    await page.getByLabel('Título del anuncio', { exact: true }).fill('Reunión de seguimiento');
    await page.getByLabel('Contenido del anuncio', { exact: true }).fill('Preparar el resumen de actividades de esta semana.');
    await button('Fijar al inicio').click(); await button('Revisar antes de guardar').click();
    await button('Confirmar publicación').click(); await button('Reintentar la misma solicitud').click();
    await visible('Contenido guardado y confirmado por el servidor.').waitFor();
    assert.equal(announcementsPosts, 2); assert.equal(announcements.length, 1); assert.equal(announcements[0].fijado, true);
    await signIn('alumno'); await button('Comunidad del aula').click(); await visible('Reunión de seguimiento').waitFor();
    assert.equal(await button('Publicar anuncio').count(), 0);
    await button('Foros').click(); await button('Abrir tema de foro').click();
    await page.getByLabel('Tema de discusión', { exact: true }).fill('Dudas sobre el reportaje');
    await button('Revisar antes de guardar').click(); await button('Confirmar nuevo tema').click();
    await button('Abrir conversación: Dudas sobre el reportaje').click(); await button('Escribir respuesta').click();
    await page.getByLabel('Tu respuesta', { exact: true }).fill('¿Cómo organizar las fuentes de la entrevista?');
    await button('Revisar antes de guardar').click(); await button('Confirmar respuesta').click();
    await visible('¿Cómo organizar las fuentes de la entrevista?').waitFor();
    await signIn('profesor'); await button('Comunidad del aula').click(); await button('Foros').click();
    await visible('1 respuestas').waitFor(); await button('Abrir conversación: Dudas sobre el reportaje').click();
    await button('Escribir respuesta').click(); await page.getByLabel('Tu respuesta', { exact: true }).fill('Organiza las fuentes por el tema que aportan.');
    await button('Revisar antes de guardar').click(); await button('Confirmar respuesta').click();
    await visible('Organiza las fuentes por el tema que aportan.').waitFor(); assert.equal(replies.length, 2);
    await signIn('profesor'); await button('Metas de prácticas').click(); await button('Definir nueva meta').click();
    await page.getByLabel('Cantidad objetivo', { exact: true }).fill('4');
    await page.getByLabel('Descripción de la meta (opcional)', { exact: true }).fill('Notas para el boletín del centro.');
    await button('Revisar antes de guardar').click(); await button('Confirmar nueva meta').click();
    await button('Actualizar producción').click();
    await page.getByLabel('Producción revisada y motivo del cambio', { exact: true }).fill('Dos notas revisadas en tutoría.');
    await button('Revisar antes de guardar').click();
    await visible('Modifica el total alcanzado antes de guardar la revisión.').waitFor(); assert.equal(goalPuts, 0);
    await page.getByLabel('Total de producción alcanzado', { exact: true }).fill('2');
    await button('Revisar antes de guardar').click(); await button('Confirmar total revisado').click(); await button('Reintentar la misma solicitud').click();
    await visible('2 de 4 · 50%').waitFor(); assert.equal(goalPuts, 2); assert.equal(goals[0].cantidadAlcanzada, 2);
    await signIn('alumno'); await button('Metas de prácticas').click(); await visible('2 de 4 · 50%').waitFor();
    assert.equal(await button('Definir nueva meta').count(), 0); assert.equal(await button('Actualizar producción').count(), 0);
    await signIn('alumno'); await button('Guía de prácticas').click();
    await page.getByLabel('Buscar en la guía', { exact: true }).fill('Corregir una actividad');
    await button('Leer guía: Corregir una actividad rechazada').click();
    await visible('1. Busca la actividad rechazada y lee la observación completa.').waitFor();
    await signIn('supervisor'); await button('Metas de prácticas').click(); await visible('2 de 4 · 50%').waitFor();
    await signIn('supervisor'); await button('Guía de prácticas').waitFor(); assert.equal(await button('Comunidad del aula').count(), 0);
    aulas[0].estado = 'CONCLUIDA'; await signIn('profesor'); await button('Comunidad del aula').click();
    await visible('Aula concluida · solo consulta').waitFor(); assert.equal(await button('Publicar anuncio').count(), 0);
    legacy = true; await signIn('alumno'); await button('Comunidad del aula').click();
    await visible('Este servidor todavía no ofrece los módulos de comunidad actualizados.').waitFor();
    assert.deepEqual(errors, []);
    console.log('OK: anuncio fijado sin duplicados, foro alumno/docente, metas con total idempotente, consulta por rol, guía y aulas concluidas/servidor antiguo.');
  } catch (e) { console.error(JSON.stringify({ url: page?.url(), errors })); throw e; } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
