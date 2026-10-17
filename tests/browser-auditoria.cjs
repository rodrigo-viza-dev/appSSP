// Consulta administrativa con API simulada; toda escritura salvo login está bloqueada.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
async function main() {
  const browser = await chromium.launch({ headless: true });
  let page;
  const errors = [];
  try {
    page = await browser.newPage({ viewport: { width: 390, height: 900 } }); page.setDefaultTimeout(20000);
    page.on('pageerror', e => errors.push(e.name));
    let role = 'ADMIN', calls = 0, failNames = false;
    const entries = [
      { id: 'audit1', userNombre: 'Docente Prueba', accion: 'ASISTENCIA_ACADEMICA', fecha: '2026-10-17T12:00:00Z', detalle: JSON.stringify({ aulaId: 'a1', fecha: '2026-10-17', antes: [{ practicanteId: 's1', presente: false }], despues: [{ practicanteId: 's1', presente: true }], conservadosFueraDelPadron: ['old1'] }) },
      { id: 'audit2', userNombre: 'Admin Prueba', accion: 'MATRICULA', fecha: '2026-10-17T11:00:00Z', detalle: 'Ana Prueba → Comunicación' },
      { id: 'audit3', userNombre: 'Otro Docente', accion: 'ASISTENCIA_ACADEMICA', fecha: '2026-10-17T10:00:00Z', detalle: '{incompleto' },
    ];
    await page.route('**/api/v1/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname.replace('/api/v1', ''); let body, status = 200;
      assert.ok(req.method() === 'GET' || path === '/auth/login');
      if (path === '/auth/login') { role = req.postDataJSON().email.startsWith('admin') ? 'ADMIN' : 'PROFESOR'; body = { token: 'fixture', user: { id: 'account', nombres: 'Prueba', apellidos: 'Cuenta', email: 'test@example.org', role } }; }
      else if (path === '/notificaciones') body = [];
      else if (path === '/admin/resumen') body = { alumnosMatriculados: 1, profesoresActivos: 1, aulasActivas: 1, centrosDePracticas: 1 };
      else if (path === '/profesor/resumen') body = { alumnosActivos: 1, entregasPendientes: 0, asistenciaPromedio: null };
      else if (path === '/admin/auditoria') { assert.equal(role, 'ADMIN'); calls++; body = entries; }
      else if (path === '/aulas') { body = [{ id: 'a1', nombre: 'Comunicación' }]; if (failNames) status = 500; }
      else if (path === '/admin/usuarios') { body = [{ id: 's1', nombres: 'Ana', apellidos: 'Prueba' }]; if (failNames) status = 500; }
      else throw new Error(`Ruta no prevista: ${path}`);
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const button = name => page.getByRole('button', { name, exact: true }).filter({ visible: true });
    const visible = text => page.getByText(text, { exact: true }).filter({ visible: true });
    async function signIn(name) {
      await page.goto(process.env.SSP_WEB_URL || 'http://localhost:5173', { waitUntil: 'networkidle' });
      await page.getByLabel('Correo de tu cuenta SSP', { exact: true }).fill(`${name}@unsa.edu.pe`);
      await page.getByLabel('Contraseña', { exact: true }).fill('fixture'); await button('Ingresar').click();
    }
    await signIn('admin'); await button('Auditoría de actividad').click();
    await visible('3 de 3 registros').waitFor();
    await button('Asistencia').click(); await visible('2 de 3 registros').waitFor();
    assert.equal(await visible('Matrícula de estudiante').count(), 0);
    await page.getByLabel('Buscar responsable, aula o fecha', { exact: true }).fill('Comunicación');
    await visible('1 de 3 registros').waitFor(); await button('Ver cambios').click();
    await visible('Ana Prueba').waitFor(); await visible('Antes: Ausente').waitFor(); await visible('Después: Presente').waitFor();
    await visible('Se conservaron 1 registros históricos fuera del padrón actual.').waitFor();
    await page.getByLabel('Buscar responsable, aula o fecha', { exact: true }).fill('');
    await visible('No se pudo interpretar el detalle de asistencia.').waitFor();
    failNames = true; await button('Actualizar auditoría').click();
    await visible('No se pudieron actualizar algunos nombres de aulas o estudiantes. Los registros siguen disponibles.').waitFor();
    await visible('Aula no disponible').waitFor(); assert.equal(calls, 2);
    await signIn('profesor'); await button('Mis aulas · Docencia').waitFor();
    assert.equal(await button('Auditoría de actividad').count(), 0); assert.equal(calls, 2);
    assert.deepEqual(errors, []);
    console.log('OK: consulta ADMIN, filtros, cambios con nombres, historial conservado y detalles/nombres incompletos sin bloquear la lista; sin escrituras.');
  } catch (error) { console.error(JSON.stringify({ url: page?.url(), visibleText: page ? (await page.locator('body').innerText()).slice(0,900) : '', errors })); throw error; } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
