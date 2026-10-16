// Windows Node, Expo web and PLAYWRIGHT_CORE_PATH. All API responses are simulated.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');

async function withTimeout(promise) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Timed out waiting for a request')), 15000); })]); }
  finally { clearTimeout(timer); }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(15000);
  const origin = process.env.SSP_WEB_URL || 'http://localhost:5173';
  const roles = ['ALUMNO', 'PROFESOR', 'ADMIN', 'SUPERVISOR'];
  const title = role => `${role}: informe semanal`;
  const user = role => ({ id: role.toLowerCase(), nombres: 'Prueba', apellidos: role, email: `${role.toLowerCase()}@example.org`, role });
  const fixtures = role => [
    { id: 'notice-1', userId: user(role).id, tipo: 'TAREA_ASIGNADA', titulo: title(role), mensaje: 'Revisa las indicaciones de tu aula.', leida: false, fecha: '2026-10-17T02:30:00Z' },
    { id: 'notice-2', userId: user(role).id, tipo: 'VENCIMIENTO', titulo: `${role}: próximo plazo`, mensaje: 'Consulta los detalles de la tarea en tu aula.', leida: false, fecha: '2026-10-16T18:00:00Z' },
    { id: 'notice-3', userId: user(role).id, tipo: 'NUEVO_TIPO', titulo: `${role}: aviso anterior`, mensaje: 'Un aviso ya consultado.', leida: true, fecha: '2026-10-16T12:00:00Z' },
  ];
  const data = Object.fromEntries(roles.map(role => [role, fixtures(role)]));
  let getMode = 'normal';
  let writeMode = 'normal';
  let writes = 0;
  let release;
  let started;
  let finished;
  let completion;
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.route('https://back-cs-de-la-com.vercel.app/api/v1/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let body;
    let status = 200;
    if (path.endsWith('/auth/login')) {
      const role = request.postDataJSON().email.split('@')[0].toUpperCase();
      assert.ok(roles.includes(role));
      body = { token: `notice-token-${role}`, user: user(role) };
    } else {
      const role = request.headers().authorization?.replace('Bearer notice-token-', '');
      assert.ok(roles.includes(role));
      if (path.endsWith('/notificaciones') && request.method() === 'GET') {
        status = getMode === 'error' ? 500 : 200;
        body = getMode === 'foreign' ? [{ ...fixtures(role)[0], userId: 'another-account' }] : getMode === 'empty' ? [] : status === 200 ? data[role] : {};
      } else if (path.startsWith('/api/v1/notificaciones/') && request.method() === 'PUT') {
        writes++;
        assert.equal(request.postData(), null);
        const mode = writeMode;
        if (mode === 'delayed-success' || mode === 'late') {
          const gate = new Promise(resolve => { release = resolve; });
          completion = new Promise(resolve => { finished = resolve; });
          started();
          await gate;
          if (mode === 'late') {
            try { await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }); }
            catch (error) { if (!request.failure()) throw error; }
            finally { finished(); }
            return;
          }
        }
        status = mode === 'error' ? 500 : mode === 'forbidden' ? 403 : mode === 'bad-ack' ? 200 : mode === 'expired' ? 401 : 204;
        if (status === 204) {
          const all = path.endsWith('/read-all');
          const id = decodeURIComponent(path.split('/').at(-2));
          data[role] = data[role].map(item => all || item.id === id ? { ...item, leida: true } : item);
          await route.fulfill({ status });
          if (mode === 'delayed-success') finished();
          return;
        }
        body = { detail: 'private server detail' };
      } else if (path.endsWith('/alumno/mis-aulas')) body = [];
      else if (path.endsWith('/practicas/actual')) body = null;
      else if (path.endsWith('/admin/resumen')) body = { alumnosMatriculados: 0, profesoresActivos: 0, aulasActivas: 0, centrosDePracticas: 0 };
      else if (path.endsWith('/profesor/resumen')) body = { alumnosActivos: 0, entregasPendientes: 0, asistenciaPromedio: 0 };
      else if (path.endsWith('/empresa/resumen')) body = { practicantesActivos: 0, horasPorValidar: 0, evaluacionesPendientes: 0 };
      else throw new Error(`Unexpected API request: ${request.method()} ${path}`);
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const button = name => page.getByRole('button', { name, exact: true });
  const visibleText = text => page.getByText(text, { exact: true }).filter({ visible: true });
  async function signIn(role) {
    await page.getByLabel('Correo de tu cuenta SSP', { exact: true }).fill(user(role).email);
    await page.getByLabel('Contraseña', { exact: true }).fill('local-test-only');
    await button('Ingresar').click();
    await button('Mis avisos').waitFor();
  }
  async function login(role = 'ALUMNO') {
    await page.goto(origin, { waitUntil: 'networkidle' });
    await signIn(role);
  }
  try {
    await page.goto(`${origin}/mis-avisos`, { waitUntil: 'networkidle' });
    await button('Explorar demo').waitFor();
    await signIn('ALUMNO');
    await visibleText('2 avisos sin leer').waitFor();
    await button('Mis avisos').click();
    await visibleText(title('ALUMNO')).waitFor();
    const sending = new Promise(resolve => { started = resolve; });
    writeMode = 'delayed-success';
    await button(`Marcar como leído: ${title('ALUMNO')}`).evaluate(element => { element.click(); element.click(); });
    await withTimeout(sending);
    await visibleText('2 avisos sin leer').waitFor();
    assert.equal(writes, 1);
    assert.equal(await button('Actualizar avisos').isDisabled(), true);
    release(); await withTimeout(completion);
    await visibleText('1 aviso sin leer').waitFor();
    await button('Sin leer').click();
    assert.equal(await visibleText(title('ALUMNO')).count(), 0);
    await button('Leídos').click();
    await visibleText(title('ALUMNO')).waitFor();
    await button('Todos').click();
    fs.mkdirSync('.expo/dev/screenshots', { recursive: true });
    await page.screenshot({ path: '.expo/dev/screenshots/incremento-04-avisos.png', fullPage: false });
    await button('Volver').click();
    await visibleText('1 aviso sin leer').waitFor();
    await button('Mis avisos').click();
    writeMode = 'normal';
    await button('Marcar todos como leídos').click();
    await visibleText('0 avisos sin leer').waitFor();
    await button('Actualizar avisos').click();
    await visibleText('0 avisos sin leer').waitFor();
    await button('Sin leer').click();
    await visibleText('No tienes avisos sin leer.').waitFor();
    console.log('PASS: protected route, confirmed single PUT, filters, shared counter and mark-all reread');

    data.ALUMNO = fixtures('ALUMNO'); getMode = 'error';
    await login();
    await visibleText('No se pudo consultar el estado de tus avisos.').waitFor();
    assert.equal(await visibleText('0 avisos sin leer').count(), 0, 'An error must not appear as zero unread');
    await button('Mis avisos').click();
    await page.getByRole('alert').waitFor();
    getMode = 'normal';
    await button('Reintentar').click();
    await visibleText('2 avisos sin leer').waitFor();
    getMode = 'foreign';
    await button('Actualizar avisos').click();
    await visibleText('No pudimos interpretar tus avisos. Intenta actualizar la bandeja.').waitFor();
    assert.equal(await visibleText(title('ALUMNO')).count(), 0);
    getMode = 'normal';
    await button('Reintentar').click();
    await visibleText('2 avisos sin leer').waitFor();
    console.log('PASS: recoverable reads distinguish errors from zero and reject another account\'s data');

    for (const failure of ['error', 'forbidden', 'bad-ack']) {
      writeMode = failure;
      await button(`Marcar como leído: ${title('ALUMNO')}`).click();
      await visibleText(failure === 'forbidden' ? 'No tienes permiso para esta acción.' : 'No pudimos confirmar la lectura. Actualiza la bandeja para comprobar el estado.').waitFor();
      await visibleText('2 avisos sin leer').waitFor();
    }
    writeMode = 'normal';
    await button('Actualizar avisos').click();
    await visibleText('2 avisos sin leer').waitFor();
    console.log('PASS: failed and incompatible acknowledgements never mark notifications locally');

    getMode = 'empty';
    await button('Actualizar avisos').click();
    await visibleText('Aún no tienes avisos en tu cuenta.').waitFor();
    await visibleText('0 avisos sin leer').waitFor();
    getMode = 'normal';
    for (const role of ['PROFESOR', 'ADMIN', 'SUPERVISOR']) {
      await login(role); await visibleText('2 avisos sin leer').waitFor();
      await button('Mis avisos').click();
      await visibleText(title(role)).waitFor();
      assert.equal(await visibleText(title('ALUMNO')).count(), 0);
    }
    console.log('PASS: empty state and independent notification lists for all four roles');

    await login(); await button('Mis avisos').click();
    writeMode = 'late';
    const oldRequest = new Promise(resolve => { started = resolve; });
    await button(`Marcar como leído: ${title('ALUMNO')}`).click();
    await withTimeout(oldRequest);
    await button('Volver').click();
    const aborted = page.waitForEvent('requestfailed', { predicate: request => request.method() === 'PUT' });
    await button('Cerrar sesión').click();
    await aborted;
    await button('Explorar demo').waitFor();
    await signIn('ADMIN');
    await visibleText('2 avisos sin leer').waitFor();
    await button('Mis avisos').click();
    release(); await withTimeout(completion);
    await visibleText(title('ADMIN')).waitFor();
    assert.equal(await visibleText(title('ALUMNO')).count(), 0);
    assert.equal(await visibleText('Tu sesión venció. Ingresa nuevamente.').count(), 0);
    console.log('PASS: logout cancels an old account\'s write and a late 401 preserves the new account');

    writeMode = 'expired';
    await button(`Marcar como leído: ${title('ADMIN')}`).click();
    await visibleText('Tu sesión venció. Ingresa nuevamente.').waitFor();
    await button('Explorar demo').waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: a current 401 ends the session without navigation or React errors');
  } finally { release?.(); await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
