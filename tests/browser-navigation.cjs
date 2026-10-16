// Run with Windows Node, Expo web running, and PLAYWRIGHT_CORE_PATH set when
// playwright-core is available outside this project's node_modules.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const origin = process.env.SSP_WEB_URL || 'http://localhost:5173';
  const login = () => page.getByRole('button', { name: 'Explorar demo', exact: true });
  try {
    await page.goto(origin);
    await login().waitFor();
    for (let i = 0; i < 3; i++) {
      await login().click();
      await page.getByRole('button', { name: 'Salir de la demo', exact: true }).click();
      await login().waitFor();
    }
    assert.deepEqual(errors, [], 'Demo entry/exit must not cause navigation errors');
    console.log('PASS: enter and exit demo three times without React errors');

    await page.goto(`${origin}/nueva-actividad`);
    await login().waitFor();
    console.log('PASS: direct access to a protected demo route returns to login');

    let role = 'ADMIN';
    let unauthorized = false;
    const user = () => ({ id: 'test-user', nombres: 'Prueba', apellidos: 'Local', email: 'prueba@unsa.edu.pe', role });
    // These responses test UI and navigation only. They do not bypass CORS
    // in the application or claim integration with the deployed backend.
    await page.route('https://back-cs-de-la-com.vercel.app/api/v1/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      let body;
      let status = 200;
      if (path.endsWith('/auth/login')) body = { token: 'local-test-token', user: user() };
      else {
        assert.equal(request.headers().authorization, 'Bearer local-test-token');
        if (unauthorized) { status = 401; body = { detail: 'Expired' }; }
        else if (path.endsWith('/notificaciones')) body = [];
        else if (path.endsWith('/admin/resumen')) body = { alumnosMatriculados: 2, profesoresActivos: 1, aulasActivas: 3, centrosDePracticas: 1 };
        else if (path.endsWith('/profesor/resumen')) body = { alumnosActivos: 0, entregasPendientes: 0, asistenciaPromedio: 100 };
        else if (path.endsWith('/alumno/mis-aulas')) body = [{ id: 'test-aula', nombre: 'Aula de prueba', profesorNombre: 'Docente de prueba', ciclo: '2026-II', estado: 'ACTIVA' }];
        else if (path.endsWith('/practicas/actual')) body = null;
        else throw new Error(`Unexpected API route: ${path}`);
      }
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    for (const accountRole of ['ADMIN', 'PROFESOR', 'ALUMNO']) {
      role = accountRole;
      await page.getByLabel('Correo de tu cuenta SSP', { exact: true }).fill('prueba@unsa.edu.pe');
      await page.getByLabel('Contraseña', { exact: true }).fill('local-test-only');
      await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
      const label = role === 'ADMIN' ? 'Alumnos matriculados' : role === 'PROFESOR' ? 'Entregas pendientes' : 'Aula de prueba';
      await page.getByText(label, { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
      await login().waitFor();
      console.log(`PASS: ${role} panel and logout with simulated responses`);
    }
    await page.getByLabel('Correo de tu cuenta SSP', { exact: true }).fill('prueba@unsa.edu.pe');
    await page.getByLabel('Contraseña', { exact: true }).fill('local-test-only');
    unauthorized = true;
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await page.getByText('Tu sesión venció. Ingresa nuevamente.', { exact: true }).waitFor();
    await login().waitFor();
    assert.deepEqual(errors, [], 'Role transitions and expired sessions must not loop');
    console.log('PASS: expired session returns to login without React errors');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
