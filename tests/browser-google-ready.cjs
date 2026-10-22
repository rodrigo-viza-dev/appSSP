const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const environmentPath = '.expo/dev/google20-entorno.json';
const environment = fs.existsSync(environmentPath) ? JSON.parse(fs.readFileSync(environmentPath, 'utf8').replace(/^\uFEFF/, '')) : { api: 'http://localhost:8000', web: 'http://localhost:5173' };
environment.api = process.env.SSP_API_URL || environment.api;
environment.web = process.env.SSP_WEB_URL || environment.web;
environment.webLan = process.env.SSP_WEB_LAN_URL || environment.webLan;
let stage = 'servidores';
async function ready() {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${environment.api}/dev/ready`, { signal: AbortSignal.timeout(2500) });
      const state = await response.json();
      if (response.ok && state.schema === 'ssp_test' && ['development', 'test'].includes(state.environment)) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('API de pruebas no disponible.');
}
async function main() {
  await ready();
  const capabilities = await (await fetch(`${environment.api}/api/v1/auth/capacidades`)).json();
  assert.equal(capabilities.google, true); assert.equal(capabilities.dominioGoogle, 'unsa.edu.pe');
  stage = 'token-invalido';
  const invalid = await fetch(`${environment.api}/api/v1/auth/google`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: 'invalid-token-for-smoke' }), signal: AbortSignal.timeout(20000) });
  assert.equal(invalid.status, 401);
  const browser = await chromium.launch({ headless: true });
  const errors = [], provider = [], unexpectedApis = [], accountRequests = [];
  let page;
  try {
    stage = 'boton-google-localhost';
    page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on('pageerror', e => errors.push(e.name));
    page.on('response', response => { const url = new URL(response.url()); if (url.hostname === 'accounts.google.com' && url.pathname.startsWith('/gsi/')) provider.push({ path: url.pathname, status: response.status() }); });
    page.on('console', message => { if (/origin.*not allowed|invalid_client/i.test(message.text())) errors.push('GoogleOriginOrClientRejected'); });
    await page.route('**/api/v1/**', route => {
      if (new URL(route.request().url()).origin === environment.api) return route.continue();
      unexpectedApis.push(new URL(route.request().url()).origin); return route.abort();
    });
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.hostname === 'accounts.google.com' && /^\/(o\/oauth2|signin|ServiceLogin)/.test(url.pathname)) accountRequests.push(url.pathname);
    });
    const buttonResponse = page.waitForResponse(response => { const url = new URL(response.url()); return url.hostname === 'accounts.google.com' && url.pathname.startsWith('/gsi/button'); }, { timeout: 30000 });
    await page.goto(environment.web, { waitUntil: 'networkidle' });
    const googleButtonStatus = (await buttonResponse).status();
    await page.locator('[data-testid="google-signin"]').waitFor({ state: 'visible' });
    assert.ok(await page.evaluate(() => !!window.google?.accounts?.id));
    await page.screenshot({ path: '.expo/dev/google20-localhost-mobile.png' });
    stage = 'fallback-wifi';
    if (environment.webLan) {
      const lan = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const lanGoogle = [];
      lan.on('pageerror', e => errors.push(e.name));
      lan.on('request', r => { if (new URL(r.url()).hostname === 'accounts.google.com') lanGoogle.push('GoogleRequestOnHttpLan'); });
      await lan.route('**/api/v1/**', route => {
        if (new URL(route.request().url()).origin === environment.api) return route.continue();
        unexpectedApis.push(new URL(route.request().url()).origin); return route.abort();
      });
      await lan.goto(environment.webLan, { waitUntil: 'networkidle' });
      await lan.getByText('Desde este enlace Wi-Fi puedes ingresar con tu cuenta SSP.', { exact: false }).waitFor();
      await lan.getByRole('button', { name: 'Ingresar', exact: true }).waitFor();
      assert.deepEqual(lanGoogle, []);
      await lan.screenshot({ path: '.expo/dev/google20-wifi-mobile.png' });
    }
    assert.deepEqual(errors.filter(e => e !== 'GoogleOriginOrClientRejected'), []); assert.deepEqual(unexpectedApis, []); assert.deepEqual(accountRequests, []);
    const report = { verified: googleButtonStatus === 200 && errors.length === 0, web: environment.web, webLan: environment.webLan, googleConfigured: true, domain: capabilities.dominioGoogle, invalidTokenStatus: invalid.status, sdkRealLoaded: true, googleButtonStatus, googleRequests: provider, actualGoogleAccountLogin: false, academicWrites: 0, clientSecretUsed: false, browserErrors: errors, unexpectedApiOrigins: unexpectedApis, unsupportedHttpLanUsesSsp: !!environment.webLan };
    fs.writeFileSync('.expo/dev/google20-integration.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    stage = 'autorizacion-google';
    assert.equal(googleButtonStatus, 200, 'Google debe aceptar el origen del cliente OAuth.');
    assert.deepEqual(errors, []);
  } catch (error) {
    if (page) {
      await page.screenshot({ path: '.expo/dev/google20-fallo.png' }).catch(() => {});
      console.error(JSON.stringify({ stage, googleResponses: provider, browserErrors: errors, unexpectedApiOrigins: unexpectedApis, state: await page.evaluate(() => ({ origin: location.origin, sdkLoaded: !!window.google?.accounts?.id, googleContainer: !!document.querySelector('[data-testid="google-signin"]'), frameCount: document.querySelectorAll('iframe').length, setupMessage: document.body.innerText.includes('aún no está habilitado'), loadError: document.body.innerText.includes('No se pudo cargar Google') })).catch(() => null) }));
    }
    throw error;
  } finally { await browser.close(); }
}
main().catch(e => { console.error(JSON.stringify({ verified: false, stage, errorType: e.name, details: 'Revisar Google y los orígenes locales; no se imprimen credenciales.' })); process.exitCode = 1; });
