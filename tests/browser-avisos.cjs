// Windows Node + Expo local. Academic APIs are read-only; notification mutations use fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const api = process.env.SSP_API_URL || 'http://localhost:8000';
const web = process.env.SSP_WEB_URL || 'http://localhost:5173';
let stage = 'preparar';
const errors = [], writes = [], foreignApis = [], checks = [];
async function account(name) {
  const env = parseEnv(fs.readFileSync(path.resolve('../appSSP-backend/.env'), 'utf8'));
  const r = await fetch(api + '/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: name + '.prueba@unsa.edu.pe', password: env.TEST_SEED_PASSWORD }) });
  assert.equal(r.status, 200); return r.json();
}
(async () => {
  for (const url of [api, web]) assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname));
  let ready;
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try { const r = await fetch(api + '/dev/ready', { signal: AbortSignal.timeout(3000) }); if (r.ok) { ready = await r.json(); break; } } catch {}
    await new Promise(r => setTimeout(r, 400));
  }
  assert.equal(ready?.schema, 'ssp_test');
  const sessions = Object.fromEntries(await Promise.all(['alumno','profesor','admin','supervisor'].map(async name => [name, await account(name)])));
  const auth = session => ({ Authorization: 'Bearer ' + session.token });
  const overview = await (await fetch(api + '/api/v1/alumno/inicio', { headers: auth(sessions.alumno) })).json();
  const aula = overview.aulas.find(value => value.estado === 'ACTIVA'); assert.ok(aula);
  const tasks = await (await fetch(api + '/api/v1/alumno/aulas/' + aula.id + '/tareas', { headers: auth(sessions.alumno) })).json();
  const task = tasks[0]; assert.ok(task);
  const hours = await (await fetch(api + '/api/v1/alumno/practicas/' + overview.practica.id + '/bitacora', { headers: auth(sessions.alumno) })).json();
  const activity = hours.registros[0]; assert.ok(activity);
  const targetTask = { tipo: 'TAREA', aulaId: aula.id, tareaId: task.id };
  const targetActivity = { tipo: 'ACTIVIDAD', practicaId: overview.practica.id, registroId: activity.id };
  const title = (role, i) => i === 0 ? role + ': nueva tarea' : i === 1 ? role + ': actividad revisada' : i === 2 ? role + ': aviso informativo' : role + ': aviso ' + i;
  const datasets = Object.fromEntries(Object.keys(sessions).map(role => [role, Array.from({ length: 45 }, (_, i) => ({
    id: 'fixture-' + String(45-i).padStart(3,'0'), userId: sessions[role].user.id, tipo: i === 1 ? 'REVISION_HORAS' : 'TAREA_ASIGNADA',
    titulo: title(role,i), mensaje: 'Contenido ficticio de revisión de la bandeja.',
    fecha: '2026-10-22T17:00:00Z', leida: i >= 30, destino: i === 0 ? targetTask : i === 1 ? targetActivity : null,
  }))]));
  let getMode = 'normal', writeMode = 'normal', pageFailure = true, fixtureWrites = 0, releaseOld, oldStarted;
  const browser = await chromium.launch({ headless: true });
  async function create(role, simulated) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage(); page.setDefaultTimeout(25000);
    page.on('pageerror', e => errors.push(e.name + ': ' + e.message.slice(0,200)));
    await page.addInitScript(({ api, session }) => {
      const key = 'ssp.session.' + Array.from(api).map(c => c.charCodeAt(0).toString(16)).join('');
      sessionStorage.setItem(key, JSON.stringify(session));
    }, { api, session: sessions[role] });
    await page.route('https://accounts.google.com/**', route => route.abort());
    await page.route('**/api/v1/**', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== api) { foreignApis.push(url.origin); return route.abort(); }
      if (simulated && url.pathname.endsWith('/auth/login')) {
        const name = request.postDataJSON().email.split('.')[0];
        assert.ok(sessions[name]); return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(sessions[name]) });
      }
      const owner = Object.keys(sessions).find(name => request.headers().authorization === 'Bearer ' + sessions[name].token);
      if (simulated && url.pathname.includes('/notificaciones')) {
        assert.ok(owner);
        const data = datasets[owner];
        let body, status = 200;
        if (request.method() === 'PUT') {
          fixtureWrites++;
          if (writeMode === 'late') {
            oldStarted();
            await new Promise(resolve => { releaseOld = resolve; });
            try { await route.fulfill({ status:401, contentType:'application/json', body:'{}' }); } catch { assert.ok(request.failure()); }
            return;
          }
          if (writeMode !== 'normal') return route.fulfill({ status:writeMode === 'bad-ack' ? 200 : 503, contentType:'application/json', body:'{}' });
          const id = decodeURIComponent(url.pathname.split('/').at(-2));
          datasets[owner] = data.map(n => url.pathname.endsWith('/read-all') || n.id === id ? { ...n, leida:true } : n);
          return route.fulfill({ status:204 });
        }
        if (url.pathname.endsWith('/bandeja')) {
          const filter = url.searchParams.get('estado'), cursor = url.searchParams.get('cursor');
          if (cursor && pageFailure) { pageFailure = false; return route.fulfill({ status:503, contentType:'application/json', body:'{}' }); }
          const pool = getMode === 'empty' ? [] : data;
          const rows = pool.filter(n => filter === 'todos' || n.leida === (filter === 'leidos'));
          const offset = Number(cursor || 0);
          body = { items:rows.slice(offset,offset+20), total:rows.length, sinLeer:pool.filter(n=>!n.leida).length, siguiente:offset+20<rows.length?String(offset+20):null };
          if (getMode === 'foreign') body.items = [{ ...data[0], userId:'foreign-account' }];
          if (getMode === 'error') { status=503; body={}; }
        } else {
          const id = decodeURIComponent(url.pathname.split('/').at(-1));
          body = data.find(n=>n.id===id); if (!body) { status=404; body={detail:'Aviso no disponible.'}; }
        }
        return route.fulfill({ status, contentType:'application/json', body:JSON.stringify(body) });
      }
      if (!['GET','HEAD','OPTIONS'].includes(request.method())) { writes.push(request.method()+' '+url.pathname); return route.abort(); }
      return route.continue();
    });
    return page;
  }
  const button = (p,name) => p.getByRole('button',{name,exact:true});
  const heading = (p,name) => p.getByRole('heading',{name,exact:true}).waitFor();
  const tab = (p,name) => p.getByRole('tab',{name:new RegExp(name)}).click();
  const back = p => button(p,'Volver').click();
  const openNotice = (p,role,i) => button(p,'Abrir aviso: '+title(role,i)).click();
  try {
    fs.mkdirSync('.expo/dev',{recursive:true});
    stage='lectura-real';const real=await create('alumno',false);
    await real.goto(web+'/alumno/avisos',{waitUntil:'networkidle',timeout:120000});await heading(real,'Mis avisos');
    await real.getByText(/^\d+ de \d+ avisos?$/).waitFor();
    await real.screenshot({path:'.expo/dev/avisos22-real.png'});await real.context().close();
    checks.push('Bandeja real de pruebas leída sin modificar avisos');
    const page=await create('alumno',true);
    stage='destino-tarea';await page.goto(web+'/alumno/avisos',{waitUntil:'networkidle'});await page.getByText('20 de 45 avisos',{exact:true}).waitFor();
    await button(page,'Sin leer').click();await page.getByText('20 de 30 avisos',{exact:true}).waitFor();
    await page.screenshot({path:'.expo/dev/avisos22-bandeja.png'});
    await openNotice(page,'alumno',0);await heading(page,'Detalle de aviso');await button(page,'Ver tarea').click();
    await heading(page,'Detalle de tarea');await page.getByText('Mi entrega',{exact:true}).waitFor();
    assert.equal(await page.getByRole('tab').count(),5);
    await back(page);await heading(page,'Detalle de aviso');await button(page,'Ver tarea').waitFor();
    await back(page);await heading(page,'Mis avisos');await page.getByText('20 de 30 avisos',{exact:true}).waitFor();
    checks.push('Aviso → tarea real → aviso → bandeja, con pestaña y filtro conservados');
    stage='destino-actividad';await openNotice(page,'alumno',1);await button(page,'Ver actividad').click();
    await heading(page,'Detalle de actividad');await page.getByText(activity.descripcion,{exact:true}).waitFor();
    await back(page);await heading(page,'Detalle de aviso');await page.screenshot({path:'.expo/dev/avisos22-detalle.png'});
    await back(page);assert.equal(fixtureWrites,0);
    checks.push('Aviso → actividad real y consulta sin marcar lectura automáticamente');
    stage='lectura-confirmada';await openNotice(page,'alumno',2);await heading(page,'Detalle de aviso');await page.getByText('Este aviso es informativo.',{exact:true}).waitFor();
    assert.equal(await button(page,'Ver tarea').count(),0);assert.equal(await button(page,'Ver actividad').count(),0);
    for (const mode of ['error','bad-ack']) {
      writeMode=mode;await button(page,'Marcar como leído').click();
      await page.getByRole('alert').filter({hasText:'No pudimos confirmar la lectura'}).waitFor();
      await button(page,'Marcar como leído').waitFor();
    }
    writeMode='normal';const before=fixtureWrites;
    await button(page,'Marcar como leído').evaluate(el=>{el.click();el.click();});
    await page.getByText('Leído',{exact:true}).waitFor();assert.equal(fixtureWrites,before+1);
    await back(page);await page.getByText('19 de 29 avisos',{exact:true}).waitFor();
    checks.push('Aviso informativo sin destino; lectura solo tras 204 y doble toque sin duplicar');
    stage='paginacion';await button(page,'Todos').click();await page.getByText('20 de 45 avisos',{exact:true}).waitFor();
    await button(page,'Ver avisos anteriores').click();await button(page,'Reintentar carga').waitFor();await page.getByText('20 de 45 avisos',{exact:true}).waitFor();
    await button(page,'Reintentar carga').click();await page.getByText('40 de 45 avisos',{exact:true}).waitFor();
    await button(page,'Ver avisos anteriores').click();await page.getByText('45 de 45 avisos',{exact:true}).waitFor();
    await tab(page,'Inicio');await tab(page,'Avisos');await page.getByText('45 de 45 avisos',{exact:true}).waitFor();
    checks.push('Páginas 20→40→45, fallo conserva filas y cambio de pestaña conserva carga');
    stage='vacio-error';await button(page,'Sin leer').click();await button(page,'Marcar todos como leídos').click();await page.getByText('Estás al día.',{exact:true}).waitFor();
    for (const mode of ['error','foreign']) {
      getMode=mode;await button(page,'Actualizar avisos').click();await page.getByRole('alert').first().waitFor();getMode='normal';await button(page,'Reintentar').click();await page.getByText('Estás al día.',{exact:true}).waitFor();
    }
    checks.push('Lectura global, vacío, error y respuesta de otra cuenta rechazados');
    stage='otros-roles';for(const role of ['profesor','admin','supervisor']) {
      const other=await create(role,true);await other.goto(web+'/panel',{waitUntil:'networkidle'});await button(other,'Mis avisos').click();await heading(other,'Mis avisos');
      await other.getByRole('heading',{name:title(role,0),exact:true}).waitFor();assert.equal(await other.getByText(title('alumno',0),{exact:true}).count(),0);await other.context().close();
    }
    checks.push('Bandejas independientes para docente, supervisor y administración');
    stage='cambio-cuenta';datasets.alumno=datasets.alumno.map(n=>({...n,leida:false}));
    await button(page,'Actualizar avisos').click();await page.getByText('20 de 45 avisos',{exact:true}).waitFor();await openNotice(page,'alumno',0);
    writeMode='late';const oldRequest=new Promise(resolve=>{oldStarted=resolve;});await button(page,'Marcar como leído').click();await oldRequest;
    await tab(page,'Más');await button(page,'Cerrar sesión').click();await button(page,'Explorar demo').waitFor();
    await page.getByLabel('Correo de tu cuenta SSP',{exact:true}).fill('admin.prueba@unsa.edu.pe');await page.getByLabel('Contraseña',{exact:true}).fill('fixture-only');
    await button(page,'Ingresar').click();await button(page,'Mis avisos').waitFor();await button(page,'Mis avisos').click();await heading(page,'Mis avisos');
    releaseOld();releaseOld=null;await page.getByRole('heading',{name:title('admin',0),exact:true}).waitFor();
    assert.equal(await page.getByText('Tu sesión venció. Ingresa nuevamente.',{exact:true}).count(),0);
    checks.push('Salir cancela una lectura anterior; su 401 tardío no cierra la cuenta nueva');
    assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.deepEqual(foreignApis,[]);
    const report={verified:true,checks,browserErrors:errors,academicWrites:writes,foreignApis,notificationMutationsSimulated:true,realReadonlyResources:true,nativeAndroid:false};
    fs.writeFileSync('.expo/dev/avisos22-verificacion.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  }finally{releaseOld?.();await browser.close();}
})().catch(e=>{console.error(JSON.stringify({verified:false,stage,errorType:e.name,message:e.message.slice(0,600)}));process.exitCode=1;});
