const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');

// Solo cuentas ficticias y API local. No crea cuentas ni modifica datos académicos.
const api = process.env.SSP_API_URL || 'http://localhost:8000';
const web = process.env.SSP_WEB_URL || 'http://localhost:5173';
const artifacts = '.expo/dev';

async function main() {
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(api).hostname), 'La prueba requiere API local.');
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(web).hostname), 'La prueba requiere Expo local.');
  const ready = await fetch(`${api}/dev/ready`, { signal: AbortSignal.timeout(20000) });
  assert.equal(ready.status, 200);
  const environment = await ready.json();
  assert.equal(environment.schema, 'ssp_test');
  assert.ok(['development', 'test'].includes(environment.environment));
  const backendEnv = parseEnv(fs.readFileSync(path.resolve('../appSSP-backend/.env'), 'utf8'));
  const password = backendEnv.TEST_SEED_PASSWORD;
  assert.ok(password, 'Falta TEST_SEED_PASSWORD en el backend paralelo.');
  fs.mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const requests = [], blocked = [], errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(30000);
    page.on('pageerror', error => errors.push(error.name));
    await page.route('**/api/v1/**', route => {
      if (new URL(route.request().url()).origin === api) return route.continue();
      blocked.push(new URL(route.request().url()).origin);
      return route.abort();
    });
    await page.goto(web, { waitUntil: 'networkidle' });
    await page.getByText('Entorno de pruebas locales', { exact: true }).waitFor();
    await page.getByLabel('Correo de tu cuenta SSP', { exact: true }).fill('alumno.prueba@unsa.edu.pe');
    const passwordField = page.getByLabel('Contraseña', { exact: true });
    const button = page.getByRole('button', { name: 'Ingresar', exact: true });
    async function attempt(value, expected) {
      await passwordField.fill(value);
      const response = page.waitForResponse(response => response.url() === `${api}/api/v1/auth/login` && response.request().method() === 'POST');
      await button.click();
      const result = await response;
      requests.push({ path: '/api/v1/auth/login', origin: api, status: result.status() });
      assert.equal(result.status(), expected);
      return result;
    }
    await attempt(`${password}-incorrecta`, 401);
    await page.getByRole('alert').filter({ hasText: 'incorrectos para este entorno' }).waitFor();
    await page.screenshot({ path: `${artifacts}/login-entorno-mobile.png` });
    const success = await attempt(password, 200);
    assert.equal((await success.json()).user.role, 'ALUMNO');
    await page.getByRole('heading', { name: 'PrácticasCC', exact: true }).waitFor();
    assert.equal(await page.getByRole('tab').count(), 5);
    await page.screenshot({ path: `${artifacts}/login-real-inicio-mobile.png` });
    assert.deepEqual(blocked, []);
    assert.deepEqual(errors, []);
    const report = { verified: true, web, api, schema: environment.schema, requests, dashboardVisible: true, browserErrors: errors.length, nonLocalRequests: blocked.length, apiResponsesSimulated: false };
    fs.writeFileSync(`${artifacts}/login-real-integration.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally { await browser.close(); }
}

main().catch(error => {
  // No volcar errores de peticiones, cuerpos, contraseñas ni JWT.
  console.error(JSON.stringify({ verified: false, errorType: error.name, hint: 'Revisar API local, cuenta ficticia y servidor indicado en el login.' }));
  process.exitCode = 1;
});
