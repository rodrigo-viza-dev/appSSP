// Publicación/entrega con API simulada; no realiza escrituras reales.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(20000);
    const errors = []; page.on('pageerror', e => errors.push(e.name));
    let role = 'PROFESOR', publications = 0, deliveries = 0, legacy = false;
    const tasks = [];
    const aula = { id: 'a1', nombre: 'Comunicación', codigo: 'TEST', descripcion: '', periodo: 'TEST', profesorId: 'teacher', profesorNombre: 'Docente', estado: 'ACTIVA', inscritos: 1 };
    await page.route('**/api/v1/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname.replace('/api/v1', '');
      let body, status = 200;
      if (path === '/auth/login') {
        role = req.postDataJSON().email.startsWith('profesor') ? 'PROFESOR' : 'ALUMNO';
        body = { token: 'fixture', user: { id: role === 'PROFESOR' ? 'teacher' : 'student', nombres: 'Prueba', apellidos: 'Cuenta', email: 'test@example.org', role } };
      } else if (path === '/notificaciones' || path === '/profesor/aulas/a1/entregas') body = [];
      else if (path === '/profesor/resumen') body = { alumnosActivos: 1, entregasPendientes: 0, asistenciaPromedio: null };
      else if (path === '/aulas') body = [aula];
      else if (path === '/tareas/capacidades') { body = { versionTareas: 1, entregaTexto: true }; if (legacy) status = 404; }
      else if (path === '/profesor/aulas/a1/tareas') {
        if (req.method() === 'POST') {
          publications++;
          const v = req.postDataJSON();
          tasks.push({ id: `t-${v.solicitudId}`, aulaId: 'a1', titulo: v.titulo, descripcion: v.descripcion, fechaLimite: v.fechaLimite, createdAt: new Date().toISOString(), entrega: null });
          status = 500; body = {}; // Se guardó; se perdió la confirmación.
        } else body = tasks.map(t => ({ ...t, entrega: null }));
      } else if (path === '/alumno/mis-aulas') body = [{ id: 'a1', nombre: aula.nombre, profesorNombre: 'Docente', ciclo: 'TEST', estado: 'ACTIVA' }];
      else if (path === '/practicas/actual') body = null;
      else if (path === '/alumno/aulas/a1') body = { id: 'a1', nombre: aula.nombre, profesorNombre: 'Docente', ciclo: 'TEST', estado: 'ACTIVA', progreso: 0, semanaActual: 1, semanasTotales: 16 };
      else if (path === '/alumno/aulas/a1/tareas') body = tasks;
      else if (path === '/alumno/aulas/a1/calificaciones') body = { promedio: null, tareasTotal: tasks.length, tareasEntregadas: 0, detalle: [] };
      else if (path.endsWith('/entregas') && req.method() === 'POST') {
        deliveries++;
        const payload = req.postDataJSON();
        tasks[0].entrega = { id: 'e1', tareaId: tasks[0].id, alumnoId: 'student', descripcion: payload.descripcion, comentario: payload.comentario, archivoId: null, estado: 'ENTREGADA', nota: null, retroalimentacion: null, createdAt: new Date().toISOString() };
        status = 500; body = {}; // Consultar debe recuperar la entrega sin otro POST.
      } else throw new Error(`Ruta no prevista: ${path}`);
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const button = name => page.getByRole('button', { name, exact: true }).filter({ visible: true });
    const visible = text => page.getByText(text, { exact: true }).filter({ visible: true });
    async function signIn(name) {
      await page.goto(process.env.SSP_WEB_URL || 'http://localhost:5173', { waitUntil: 'networkidle' });
      await page.getByLabel('Correo de tu cuenta SSP', { exact: true }).fill(`${name}@unsa.edu.pe`);
      await page.getByLabel('Contraseña', { exact: true }).fill('fixture');
      await button('Ingresar').click();
      if (name === 'profesor') {
        await button('Mis aulas · Docencia').click(); await button('Gestionar aula: Comunicación').click(); await button('Publicar y consultar tareas').click();
      } else { await button('Abrir aula: Comunicación').click(); await button('Ver tarea: Entrevista').click(); }
    }
    await signIn('profesor');
    await page.getByLabel('Instrucciones de la tarea', { exact: true }).fill('Escribe una entrevista.');
    await button('Revisar publicación').click();
    await visible('Escribe un título de hasta 200 caracteres.').waitFor(); assert.equal(publications, 0);
    await page.getByLabel('Título de la tarea', { exact: true }).fill('Entrevista');
    await button('Revisar publicación').click(); assert.equal(publications, 0);
    await button('Confirmar publicación').click(); await button('Consultar envío actual').click();
    await visible('Tarea publicada y confirmada por el servidor.').waitFor(); assert.equal(publications, 1);
    await signIn('alumno'); await button('Entregar respuesta escrita').click();
    await button('Revisar entrega').click(); await visible('Escribe tu respuesta (hasta 6000 caracteres).').waitFor(); assert.equal(deliveries, 0);
    await page.getByLabel('Mi respuesta escrita', { exact: true }).fill('Mi entrevista terminada.');
    await button('Revisar entrega').click(); assert.equal(deliveries, 0);
    await button('Confirmar entrega').click(); await button('Consultar envío actual').click();
    await visible('Entrega guardada y confirmada por el servidor.').waitFor(); assert.equal(deliveries, 1);
    await visible('Mi entrevista terminada.').waitFor();
    legacy = true; await signIn('profesor');
    await visible('Este servidor todavía no ofrece la publicación de tareas.').waitFor();
    assert.equal(await button('Revisar publicación').count(), 0);
    assert.deepEqual(errors, []);
    console.log('OK: publicar y entregar con revisión, validación, reconciliación sin duplicados y servidor anterior protegido.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
