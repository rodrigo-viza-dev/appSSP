// Recorrido esencial de revisión docente con contratos simulados; no escribe en la API real.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const user = { id: 'teacher-1', nombres: 'Docente', apellidos: 'Prueba', email: 'docente@unsa.edu.pe', role: 'PROFESOR' };
    const aula = { id: 'aula-1', nombre: 'Comunicación institucional', codigo: 'COM-2026', descripcion: '', periodo: '2026-II', profesorId: user.id, profesorNombre: 'Docente Prueba', estado: 'ACTIVA', inscritos: 1 };
    let entrega = { id: 'delivery-1', tareaId: 'task-1', tareaTitulo: 'Informe semanal', alumnoId: 'student-1', alumnoNombre: 'Estudiante Prueba', descripcion: 'Trabajo realizado.', comentario: '', archivoId: null, estado: 'ENTREGADA', nota: null, retroalimentacion: null, createdAt: '2026-10-16T12:00:00Z' };
    let writes = 0;
    let fail = false;
    await page.route('https://back-cs-de-la-com.vercel.app/api/v1/**', async route => {
      const req = route.request();
      const path = new URL(req.url()).pathname.replace('/api/v1', '');
      let body;
      let status = 200;
      if (path === '/auth/login') body = { token: 'teacher-test-token', user };
      else {
        assert.equal(req.headers().authorization, 'Bearer teacher-test-token');
        if (req.method() === 'PUT') {
          assert.equal(path, '/profesor/entregas/delivery-1/calificar');
          writes++;
          if (fail) { status = 500; body = {}; }
          else { const payload = req.postDataJSON(); assert.equal(payload.nota, 0); assert.equal(payload.retroalimentacion, 'Revisar fuentes.'); entrega = { ...entrega, ...payload, estado: 'CALIFICADA' }; body = entrega; }
        } else {
          assert.equal(req.method(), 'GET');
          if (path === '/notificaciones') body = [];
          else if (path === '/profesor/resumen') body = { alumnosActivos: 1, entregasPendientes: 1, asistenciaPromedio: null };
          else if (path === '/aulas') body = [aula];
          else if (path === '/profesor/practicantes') body = [{ alumnoId: 'student-1', alumnoNombre: 'Estudiante Prueba', alumnoEmail: 'estudiante@unsa.edu.pe', aulaId: aula.id, aulaNombre: aula.nombre, progreso: 25, semanaActual: 4, semanasTotales: 16, estado: 'ACTIVA', tareasEntregadas: 1, tareasTotal: 1 }];
          else if (path === '/profesor/aulas/aula-1/entregas') body = [entrega];
          else if (path === '/profesor/aulas/aula-1/libro') body = { aulaId: aula.id, aulaNombre: aula.nombre, promedioGeneral: entrega.nota, tareas: [{ id: entrega.tareaId, titulo: entrega.tareaTitulo }], alumnos: [{ alumnoId: entrega.alumnoId, alumnoNombre: entrega.alumnoNombre, codigo: 'student-1', notas: { 'task-1': entrega.nota }, promedio: entrega.nota, asistenciaPct: null, horas: 12 }] };
          else throw new Error(`Ruta inesperada: ${path}`);
        }
      }
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const button = name => page.getByRole('button', { name, exact: true }).filter({ visible: true });
    const visible = text => page.getByText(text, { exact: true }).filter({ visible: true });
    await page.goto(`${process.env.SSP_WEB_URL || 'http://localhost:5173'}/revisar-entrega?aulaId=aula-1&entregaId=delivery-1`, { waitUntil: 'networkidle' });
    await page.getByLabel('Correo de tu cuenta SSP', { exact: true }).fill(user.email);
    await page.getByLabel('Contraseña', { exact: true }).fill('local-fixture');
    await button('Ingresar').click();
    await button('Mis aulas · Docencia').click();
    await button(`Gestionar aula: ${aula.nombre}`).click();
    await button('Revisar: Estudiante Prueba · Informe semanal').click();
    await page.getByLabel('Nota (0 a 20)', { exact: true }).fill('21');
    await button('Revisar calificación').click();
    await visible('Escribe una nota entera entre 0 y 20.').waitFor();
    assert.equal(writes, 0);
    await page.getByLabel('Nota (0 a 20)', { exact: true }).fill('0');
    await page.getByLabel('Observaciones para el estudiante', { exact: true }).fill('Revisar fuentes.');
    await button('Revisar calificación').click();
    await visible('Nota a guardar: 0 / 20').waitFor();
    assert.equal(writes, 0);
    await button('Confirmar calificación').click();
    await visible('Calificación guardada y confirmada por el servidor.').waitFor();
    await visible('Nota actual: 0').waitFor();
    assert.equal(writes, 1);
    await button('Volver').click();
    await visible('No hay entregas que coincidan con los filtros.').waitFor();
    await button('Mostrar todas las entregas').click();
    await visible('Nota: 0').waitFor();
    await button('Alumnos').click();
    await visible('1 de 1 tareas entregadas').waitFor();
    await button('Notas').click();
    await visible('Informe semanal: 0').waitFor();
    await button('Entregas').click();
    await button('Revisar: Estudiante Prueba · Informe semanal').click();
    fail = true;
    await button('Revisar calificación').click();
    await button('Confirmar calificación').click();
    await button('Consultar calificación actual').waitFor();
    assert.equal(writes, 2);
    assert.equal(await button('Confirmar calificación').count(), 0);
    await button('Consultar calificación actual').click();
    await visible('Nota actual: 0').waitFor();
    assert.deepEqual(errors, []);
    console.log('OK: acceso docente, revisión/confirmación, nota 0, seguimiento, libro y consulta tras error; sin escrituras reales.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
