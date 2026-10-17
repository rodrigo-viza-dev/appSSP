// Único recorrido de aceptación de asistencia; todos los POST son simulados.
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
    const aula = { id: 'aula-1', nombre: 'Comunicación', codigo: 'COM-26', descripcion: '', periodo: '2026-II', profesorId: user.id, profesorNombre: 'Docente Prueba', estado: 'ACTIVA', inscritos: 2 };
    let items = [{ practicanteId: 's1', practicanteNombre: 'Ana Prueba', presente: true }, { practicanteId: 's2', practicanteNombre: 'Luis Prueba', presente: true }];
    let writes = 0;
    let fail = false;
    await page.route('**/api/v1/**', async route => {
      const req = route.request(); const url = new URL(req.url()); const path = url.pathname.replace('/api/v1', '');
      let body; let status = 200;
      if (path === '/auth/login') body = { token: 'teacher-fixture', user };
      else if (path === '/notificaciones') body = [];
      else if (path === '/profesor/resumen') body = { alumnosActivos: 2, entregasPendientes: 0, asistenciaPromedio: null };
      else if (path === '/aulas') body = [aula];
      else if (path === '/profesor/aulas/aula-1/entregas') body = [];
      else if (path === '/profesor/aulas/aula-1/asistencia') {
        if (req.method() === 'POST') {
          writes++;
          const payload = req.postDataJSON(); assert.equal(payload.fecha, '2026-10-16');
          assert.deepEqual(payload.items, [{ practicanteId: 's1', presente: true }, { practicanteId: 's2', presente: false }]);
          if (fail) { status = 500; body = {}; }
          else { items = items.map(v => ({ ...v, presente: payload.items.find(p => p.practicanteId === v.practicanteId).presente })); body = { aulaId: aula.id, fecha: payload.fecha, items }; }
        } else body = { aulaId: aula.id, fecha: url.searchParams.get('fecha'), items };
      } else throw new Error(`Ruta inesperada: ${path}`);
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const button = name => page.getByRole('button', { name, exact: true }).filter({ visible: true });
    const visible = text => page.getByText(text, { exact: true }).filter({ visible: true });
    await page.goto(process.env.SSP_WEB_URL || 'http://localhost:5173', { waitUntil: 'networkidle' });
    await page.getByLabel('Correo de tu cuenta SSP', { exact: true }).fill(user.email);
    await page.getByLabel('Contraseña', { exact: true }).fill('local-fixture');
    await button('Ingresar').click(); await button('Mis aulas · Docencia').click();
    await button('Gestionar aula: Comunicación').click(); await button('Tomar asistencia académica').click();
    const fecha = page.getByLabel('Fecha de asistencia (AAAA-MM-DD)', { exact: true });
    await fecha.fill('2026-02-30'); await button('Consultar fecha').click();
    await visible('Escribe una fecha válida con formato AAAA-MM-DD.').waitFor();
    assert.equal(writes, 0);
    await fecha.fill('2026-10-16'); await button('Consultar fecha').click();
    const checkbox = page.getByRole('checkbox', { name: 'Presente: Luis Prueba', exact: true });
    assert.equal(await checkbox.isChecked(), true);
    await checkbox.click();
    assert.equal(await checkbox.isChecked(), false);
    await visible('1 presentes · 1 ausentes').waitFor();
    await button('Revisar asistencia').click(); assert.equal(writes, 0);
    await button('Confirmar asistencia').click();
    await visible('Asistencia del 2026-10-16 guardada y confirmada por el servidor.').waitFor(); assert.equal(writes, 1);
    fail = true; await button('Revisar asistencia').click(); await button('Confirmar asistencia').click();
    await button('Consultar asistencia actual').waitFor(); assert.equal(writes, 2);
    assert.equal(await button('Confirmar asistencia').count(), 0);
    await button('Consultar asistencia actual').click(); await visible('1 presentes · 1 ausentes').waitFor();
    assert.deepEqual(errors, []);
    console.log('OK: fecha válida, lista revisada, confirmación explícita y recuperación tras error; sin POST reales.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
