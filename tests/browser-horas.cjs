// Regresión del flujo de horas con respuestas simuladas; todas las API se interceptan.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.name));
    let role = 'ALUMNO', posts = 0, puts = 0, legacy = false, version = 2;
    const records = [], history = [];
    const track = (r, accion, antes = null) => history.push({ id: `event-${history.length}`, revision: r.revision, userNombre: role === 'ALUMNO' ? 'Alumno Prueba' : 'Supervisor Prueba', accion, fecha: new Date().toISOString(), antes, despues: structuredClone(r) });
    const practica = { id: 'practice-1', practicanteId: 'student', practicanteNombre: 'Alumno Prueba', aulaNombre: 'Comunicación', periodo: 'TEST', horasAcumuladas: 0, horasMinimas: 360, estado: 'EN_CURSO' };
    await page.route('**/api/v1/**', async route => {
      const req = route.request();
      const path = new URL(req.url()).pathname.replace('/api/v1', '');
      let body, status = 200;
      if (path === '/auth/login') {
        role = req.postDataJSON().email.startsWith('supervisor') ? 'SUPERVISOR' : 'ALUMNO';
        body = { token: 'fixture', user: { id: role === 'ALUMNO' ? 'student' : 'supervisor', nombres: 'Prueba', apellidos: 'Cuenta', email: 'test@example.org', role } };
      } else if (path === '/notificaciones' || path === '/alumno/mis-aulas') body = [];
      else if (path === '/practicas/actual') body = practica;
      else if (path === '/empresa/resumen') body = { practicantesActivos: 1, horasPorValidar: records.filter(r => r.estadoValidacion === 'PENDIENTE').length, evaluacionesPendientes: 0 };
      else if (path === '/practicas/capacidades') { body = legacy ? {} : { versionHoras: version }; if (legacy) status = 404; }
      else if (path === '/practicas') body = [practica];
      else if (path === '/practicas/practice-1/horas') {
        if (req.method() === 'POST') {
          posts++;
          const payload = req.postDataJSON();
          assert.equal(payload.horas, 2);
          records.push({ id: `h-${payload.solicitudId}`, practicaId: practica.id, fecha: `${payload.fecha}T17:00:00Z`, horas: 2, descripcion: payload.descripcion, estadoValidacion: 'PENDIENTE', revision: 0, observacion: '' });
          track(records[0], 'REGISTRO');
          // El servidor guardó, pero la respuesta se perdió: consultar debe reconciliar sin duplicar.
          status = 500; body = {};
        } else body = records;
      } else if (path.startsWith('/practicas/practice-1/horas/')) {
        if (path.endsWith('/historial')) body = history;
        else {
          assert.equal(req.method(), 'PUT'); assert.equal(role, 'ALUMNO');
          const payload = req.postDataJSON(), r = records[0], antes = structuredClone(r);
          assert.equal(payload.revision, r.revision);
          assert.equal(r.estadoValidacion, 'RECHAZADO');
          Object.assign(r, { horas: payload.horas, descripcion: payload.descripcion, fecha: `${payload.fecha}T17:00:00Z`, estadoValidacion: 'PENDIENTE', observacion: '', revision: r.revision + 1 });
          track(r, 'CORRECCION', antes);
          // También se reconcilia una corrección guardada cuya respuesta se perdió.
          status = 500; body = {};
        }
      } else if (path.startsWith('/empresa/horas/') && req.method() === 'PUT') {
        puts++;
        assert.equal(role, 'SUPERVISOR');
        const r = records.find(r => path.endsWith(r.id));
        const payload = req.postDataJSON(), antes = structuredClone(r);
        assert.equal(payload.revision, r.revision);
        if (payload.estadoValidacion === 'RECHAZADO') assert.ok(payload.observacion.trim());
        r.estadoValidacion = payload.estadoValidacion; r.observacion = payload.observacion; r.revision++;
        track(r, r.estadoValidacion === 'VALIDADO' ? 'VALIDACION' : 'RECHAZO', antes);
        practica.horasAcumuladas = r.estadoValidacion === 'VALIDADO' ? r.horas : 0;
        body = r;
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
      await button(name === 'supervisor' ? 'Validar horas de prácticas' : 'Mi bitácora de prácticas').click();
    }
    await signIn('alumno');
    await page.getByLabel('Horas trabajadas', { exact: true }).fill('25');
    await button('Revisar actividad').click();
    await visible('Escribe entre 1 y 24 horas enteras.').waitFor();
    assert.equal(posts, 0);
    await page.getByLabel('Horas trabajadas', { exact: true }).fill('2');
    await page.getByLabel('Descripción de la actividad', { exact: true }).fill('Edición de entrevista.');
    await button('Revisar actividad').click();
    assert.equal(posts, 0);
    await button('Confirmar actividad').click();
    await button('Consultar bitácora actual').click();
    await visible('2 h pendientes · 0 h rechazadas').waitFor();
    assert.equal(posts, 1);
    await signIn('supervisor');
    await button('Rechazar horas').click();
    await button('Confirmar revisión').click();
    await visible('Explica qué debe corregir el alumno.').waitFor();
    assert.equal(puts, 0);
    await page.getByLabel('Motivo del rechazo', { exact: true }).fill('Especifica la entrevista realizada.');
    await button('Confirmar revisión').click();
    await visible('0 h pendientes · 2 h rechazadas').waitFor();
    assert.equal(puts, 1);
    await signIn('alumno');
    await visible('Observación del supervisor: Especifica la entrevista realizada.').waitFor();
    await button('Corregir y reenviar').click();
    await button('Revisar actividad').click();
    await visible('Modifica la actividad antes de reenviarla.').waitFor();
    await page.getByLabel('Horas trabajadas', { exact: true }).fill('3');
    await page.getByLabel('Descripción de la actividad', { exact: true }).fill('Edición de entrevista con el director.');
    await button('Revisar actividad').click();
    await button('Confirmar corrección y reenviar').click();
    await button('Consultar bitácora actual').click();
    await visible('3 h pendientes · 0 h rechazadas').waitFor();
    assert.equal(records.length, 1); assert.equal(records[0].revision, 2);
    await signIn('supervisor');
    await button('Validar horas').click();
    await button('Confirmar revisión').click();
    await visible('3 h validadas · Meta: 360 h').waitFor();
    assert.equal(puts, 2);
    await signIn('alumno');
    await button('Ver historial de actividad').click();
    await visible('Corrección y reenvío').waitFor();
    assert.equal(history.length, 4);
    version = 1;
    await signIn('supervisor');
    records[0].estadoValidacion = 'PENDIENTE';
    await button('Actualizar bitácora').click();
    await visible('Actualiza el servidor para revisar horas con observaciones.').waitFor();
    assert.equal(await button('Validar horas').count(), 0);
    legacy = true;
    await signIn('alumno');
    await visible('Este servidor todavía no tiene disponible el circuito de horas actualizado.').waitFor();
    assert.equal(await button('Revisar actividad').count(), 0);
    assert.equal(posts, 1);
    assert.deepEqual(errors, []);
    console.log('OK: rechazo con motivo, corrección sin duplicados ante respuesta perdida, historial, validación posterior y bloqueo de revisión en servidor antiguo.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
