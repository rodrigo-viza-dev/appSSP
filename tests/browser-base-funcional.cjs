const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const api = process.env.SSP_API_URL || 'http://localhost:8000';
const web = process.env.SSP_WEB_URL || 'http://localhost:5173';
const artifacts = '.expo/dev';
let stage = 'inicio';
async function main() {
  assert.match(new URL(api).hostname, /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)$/);
  const ready = await (await fetch(`${api}/dev/ready`)).json();
  assert.equal(ready.schema, 'ssp_test'); assert.ok(['development', 'test'].includes(ready.environment));
  const password = parseEnv(fs.readFileSync(path.resolve('../appSSP-backend/.env'), 'utf8')).TEST_SEED_PASSWORD;
  assert.ok(password);
  const caps = await (await fetch(`${api}/api/v1/auth/capacidades`)).json();
  assert.equal(caps.restauracion, true); assert.equal(caps.google, false); assert.equal(caps.recuperacion, false);
  const http = [];
  for (const role of ['admin', 'profesor', 'alumno', 'supervisor']) {
    const response = await fetch(`${api}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `${role}.prueba@unsa.edu.pe`, password }) });
    assert.equal(response.status, 200); const session = await response.json();
    const headers = { Authorization: `Bearer ${session.token}` };
    for (const endpoint of ['/auth/me', ...(role === 'admin' ? ['/admin/asignaciones'] : [])]) {
      const result = await fetch(`${api}/api/v1${endpoint}`, { headers });
      assert.equal(result.status, 200); http.push({ role, endpoint, status: result.status });
    }
  }
  const browser = await chromium.launch({ headless: true });
  const errors = [], blocked = [], mutations = [];
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); page.setDefaultTimeout(30000);
    page.on('pageerror', e => errors.push(e.name));
    page.on('console', e => { if (e.text().includes('Unexpected text node')) errors.push('Unexpected text node'); });
    await page.route('**/api/v1/**', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== api) { blocked.push(url.origin); return route.abort(); }
      if (!['GET', 'OPTIONS'].includes(request.method()) && url.pathname !== '/api/v1/auth/login') { mutations.push(url.pathname); return route.abort(); }
      return route.continue();
    });
    stage = 'ingreso';
    await page.goto(web, { waitUntil: 'networkidle' });
    await page.getByLabel('Correo de tu cuenta SSP', { exact: true }).fill('alumno.prueba@unsa.edu.pe');
    await page.getByLabel('Contraseña', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await page.getByRole('button', { name: 'Borradores y envíos pendientes', exact: true }).waitFor();
    stage = 'restauracion-sesion';
    const restored = page.waitForResponse(r => r.url() === `${api}/api/v1/auth/me` && r.status() === 200);
    await page.reload({ waitUntil: 'networkidle' }); await restored;
    stage = 'guardar-borrador';
    await page.getByRole('button', { name: 'Mi bitácora de prácticas', exact: true }).click();
    const description = `Borrador local de revisión ${Date.now()}`;
    await page.getByLabel('Descripción de la actividad', { exact: true }).fill(description);
    await page.getByLabel('Horas trabajadas', { exact: true }).fill('2');
    await page.getByText('Borrador guardado en este dispositivo.', { exact: true }).waitFor();
    await page.goto(`${web}/borradores`, { waitUntil: 'networkidle' });
    await page.getByText(description, { exact: true }).waitFor();
    await page.screenshot({ path: `${artifacts}/borradores-mobile.png` });
    // Solo corta la API. El servidor web sigue entregando la app, como el bundle cacheado en Android.
    stage = 'restaurar-sin-api';
    await page.route(`${api}/**`, route => route.abort());
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText(description, { exact: true }).waitFor();
    await page.getByRole('button', { name: /^Continuar: Actividad/ }).click();
    assert.equal(await page.getByLabel('Descripción de la actividad', { exact: true }).inputValue(), description);
    await page.screenshot({ path: `${artifacts}/borrador-sin-api-mobile.png` });
    stage = 'aislamiento-cuentas';
    await page.unroute(`${api}/**`);
    await page.goto(`${web}/panel`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await page.getByLabel('Correo de tu cuenta SSP', { exact: true }).fill('alumno2.prueba@unsa.edu.pe');
    await page.getByLabel('Contraseña', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await page.getByRole('button', { name: 'Borradores y envíos pendientes', exact: true }).click();
    await page.getByText('Todavía no hay borradores.', { exact: false }).waitFor();
    assert.equal(await page.getByText(description, { exact: true }).count(), 0);
    assert.deepEqual(errors, []); assert.deepEqual(blocked, []); assert.deepEqual(mutations, []);
    const report = { verified: true, api, web, http, sessionRestored: true, draftRestoredWithoutApi: true, draftsIsolatedByAccount: true, academicWrites: 0, browserErrors: errors, externalApis: blocked, googleConfigured: false, smtpConfigured: false };
    fs.writeFileSync(`${artifacts}/base-funcional-integration.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
  } finally { await browser.close(); }
}
main().catch(e => { console.error(JSON.stringify({ verified: false, stage, errorType: e.name, hint: 'Revisar servidores de pruebas, rutas y restauración; secretos omitidos.' })); process.exitCode = 1; });
