// Windows Node + Expo web + PLAYWRIGHT_CORE_PATH. All API responses are simulated.
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
  const user = { id: 'student-1', nombres: 'Prueba', apellidos: 'Local', email: 'prueba@unsa.edu.pe', role: 'ALUMNO' };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let centro = null;
  let supervisor = null;
  let mode = 'normal';
  let centroPosts = 0;
  let supervisorPosts = 0;
  let release;
  let started;
  let finished;
  let completion;

  await page.route('https://back-cs-de-la-com.vercel.app/api/v1/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let body;
    let status = 200;
    if (path.endsWith('/auth/login')) body = { token: 'local-centro-token', user };
    else {
      assert.equal(request.headers().authorization, 'Bearer local-centro-token');
      if (path.endsWith('/notificaciones')) body = [];
      else if (path.endsWith('/alumno/mis-aulas')) body = [];
      else if (path.endsWith('/practicas/actual')) body = null;
      else if (path.endsWith('/empresa/mine')) body = centro;
      else if (path.endsWith('/empresa') && request.method() === 'POST') {
        centroPosts++;
        const payload = request.postDataJSON();
        assert.equal(payload.practicanteId, undefined);
        if (mode === 'late') {
          const gate = new Promise(resolve => { release = resolve; });
          completion = new Promise(resolve => { finished = resolve; });
          started();
          await gate;
          try { await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }); }
          catch (error) { if (!request.failure()) throw error; }
          finally { finished(); }
          return;
        }
        if (mode === 'network') { await route.abort('failed'); return; }
        if (mode === 'invalid') { status = 422; body = { detail: 'private database detail' }; }
        else if (mode === 'expired') { status = 401; body = {}; }
        else {
          centro = { ...payload, id: 'centro-1', practicanteId: user.id, fechaRegistro: '2026-10-16T12:00:00Z' };
          if (mode === 'conflict') centro.razonSocial = 'Centro existente';
          status = mode === 'conflict' ? 409 : mode === 'error-saved' ? 500 : 201;
          body = status === 201 ? centro : {};
        }
      } else if (path.endsWith('/empresa/centro-1/supervisor')) {
        if (request.method() === 'POST') {
          supervisorPosts++;
          const payload = request.postDataJSON();
          assert.equal(payload.userId, undefined);
          supervisor = { ...payload, id: 'supervisor-1', empresaId: 'centro-1', userId: null };
          status = 201;
        }
        body = supervisor;
      } else throw new Error(`Unexpected API request: ${request.method()} ${path}`);
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const button = name => page.getByRole('button', { name, exact: true });
  const visibleText = text => page.getByText(text, { exact: true }).filter({ visible: true });
  const centroFields = {
    'Razón social': 'Agencia de prueba', 'RUC (11 dígitos)': '20123456789', 'Dirección del centro': 'Calle de prueba 123',
    'Sector o actividad': 'Comunicación', 'Teléfono del centro': '+51 999 111 222', 'Correo del centro': 'contacto@example.org',
  };
  async function start() {
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.getByLabel('Correo de tu cuenta SSP', { exact: true }).fill(user.email);
    await page.getByLabel('Contraseña', { exact: true }).fill('local-test-only');
    await button('Ingresar').click();
    await button('Mi centro de prácticas').click();
    await visibleText('Consultando la información…').waitFor({ state: 'hidden' });
  }
  async function fillCentro() {
    for (const [label, value] of Object.entries(centroFields)) await page.getByLabel(label, { exact: true }).fill(value);
    await button('Revisar datos del centro').click();
  }
  function reset() { centro = null; supervisor = null; mode = 'normal'; }

  try {
    await page.goto(`${origin}/centro`, { waitUntil: 'networkidle' });
    await button('Explorar demo').waitFor();
    await start();
    await button('Revisar datos del centro').click();
    await visibleText('Completa la razón social.').waitFor();
    assert.equal(centroPosts, 0);
    await fillCentro();
    assert.equal(centroPosts, 0, 'Review must not send the form');
    await button('Editar datos').click();
    assert.equal(await page.getByLabel('Razón social', { exact: true }).inputValue(), centroFields['Razón social']);
    await button('Revisar datos del centro').click();
    fs.mkdirSync('.expo/dev/screenshots', { recursive: true });
    await page.screenshot({ path: '.expo/dev/screenshots/incremento-03-revision.png', fullPage: false });
    await button('Confirmar registro del centro').evaluate(element => { element.click(); element.click(); });
    await visibleText('Centro registrado correctamente.').waitFor();
    await page.getByLabel('Nombres del supervisor', { exact: true }).waitFor();
    assert.equal(centroPosts, 1, 'Repeated clicks must create only one request');
    for (const [label, value] of Object.entries({ 'Nombres del supervisor': 'Ana', 'Apellidos del supervisor': 'Prueba', 'Cargo del supervisor': 'Supervisora', 'Correo del supervisor': 'supervision@example.org', 'Teléfono del supervisor': '999111222' })) {
      await page.getByLabel(label, { exact: true }).fill(value);
    }
    await button('Revisar datos del supervisor').click();
    assert.equal(supervisorPosts, 0);
    await button('Confirmar registro del supervisor').click();
    await visibleText('Contacto del supervisor registrado correctamente.').waitFor();
    await visibleText('Ana Prueba').waitFor();
    assert.equal(supervisorPosts, 1);
    await page.screenshot({ path: '.expo/dev/screenshots/incremento-03-ficha.png', fullPage: false });
    await start();
    await visibleText('Ana Prueba').waitFor();
    assert.equal(await button('Revisar datos del centro').count(), 0);
    console.log('PASS: private route, validation, review, single POST, supervisor and server-backed reread');

    reset(); mode = 'invalid';
    await start(); await fillCentro();
    await button('Confirmar registro del centro').click();
    await visibleText('El servidor rechazó los datos. Revísalos antes de confirmar nuevamente.').waitFor();
    await button('Editar datos').click();
    assert.equal(await page.getByLabel('Correo del centro', { exact: true }).inputValue(), centroFields['Correo del centro']);
    console.log('PASS: rejected input preserves the draft for correction');

    reset(); mode = 'error-saved';
    await start(); await fillCentro();
    const beforeUncertain = centroPosts;
    await button('Confirmar registro del centro').click();
    await visibleText('No pudimos confirmar si el registro se guardó. Consulta tu ficha antes de volver a intentar.').waitFor();
    assert.equal(await button('Confirmar registro del centro').count(), 0);
    await button('Consultar ficha').click();
    await visibleText('Centro registrado').waitFor();
    assert.equal(centroPosts, beforeUncertain + 1);
    console.log('PASS: an uncertain response is reconciled by GET without repeating the write');

    reset(); mode = 'conflict';
    await start(); await fillCentro();
    await button('Confirmar registro del centro').click();
    await visibleText('Ya existe un registro. Consulta tu ficha para ver los datos guardados.').waitFor();
    await button('Consultar ficha').click();
    await visibleText('Centro existente').waitFor();
    console.log('PASS: a concurrent registration is loaded after HTTP 409');

    reset(); mode = 'network';
    await start(); await fillCentro();
    const beforeNetwork = centroPosts;
    await button('Confirmar registro del centro').click();
    await button('Consultar ficha').click();
    await page.getByLabel('Razón social', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Razón social', { exact: true }).inputValue(), centroFields['Razón social']);
    assert.equal(centroPosts, beforeNetwork + 1);
    console.log('PASS: an uncommitted network failure recovers the draft without automatic retry');

    reset(); mode = 'late';
    await start(); await fillCentro();
    const sending = new Promise(resolve => { started = resolve; });
    await button('Confirmar registro del centro').click();
    await withTimeout(sending);
    const aborted = page.waitForEvent('requestfailed', { predicate: request => request.method() === 'POST' && request.url().endsWith('/empresa') });
    await button('Volver').click();
    await aborted;
    release(); await withTimeout(completion);
    await button('Cerrar sesión').waitFor();
    assert.equal(await visibleText('Tu sesión venció. Ingresa nuevamente.').count(), 0);
    console.log('PASS: leaving during a write cancels local work and ignores a late 401');

    reset(); mode = 'expired';
    await start(); await fillCentro();
    await button('Confirmar registro del centro').click();
    await visibleText('Tu sesión venció. Ingresa nuevamente.').waitFor();
    await button('Explorar demo').waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: a current write returning 401 ends the session without React errors');
  } finally { release?.(); await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
