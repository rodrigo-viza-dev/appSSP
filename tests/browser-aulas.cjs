// Local API reads and isolated UI fixtures. Never submits academic data to the real API.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {parseEnv}=require('node:util');
const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
const api=process.env.SSP_API_URL||'http://localhost:8000',web=process.env.SSP_WEB_URL||'http://localhost:5173';
let stage='preparar';
const errors=[],foreignApis=[],academicWrites=[],checks=[],requests=[];
(async()=>{
 for(const url of [api,web])assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname));
 let ready;const deadline=Date.now()+60000;
 while(Date.now()<deadline){try{const r=await fetch(api+'/dev/ready',{signal:AbortSignal.timeout(3000)});if(r.ok){ready=await r.json();break;}}catch{}await new Promise(r=>setTimeout(r,400));}
 assert.equal(ready?.schema,'ssp_test');
 const env=parseEnv(fs.readFileSync(path.resolve('../appSSP-backend/.env'),'utf8'));
 const auth=await fetch(api+'/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'alumno.prueba@unsa.edu.pe',password:env.TEST_SEED_PASSWORD})});
 assert.equal(auth.status,200);const session=await auth.json(),headers={Authorization:'Bearer '+session.token};
 const overview=await(await fetch(api+'/api/v1/alumno/inicio',{headers})).json();
 const aula=overview.aulas.find(a=>a.estado==='ACTIVA');assert.ok(aula);
 const realTasks=await(await fetch(api+'/api/v1/alumno/aulas/'+aula.id+'/tareas/pagina?estado=todas&limite=20',{headers})).json();
 const realTask=realTasks.items[0];assert.ok(realTask);
 const fixtureRows=Array.from({length:45},(_,i)=>({id:'visual-'+String(i).padStart(3,'0'),aulaId:aula.id,titulo:i===0?'Informe de comunicación institucional y actividades de campo de la semana':'Tarea visual '+i,fechaLimite:i===1?new Date(Date.now()-86400000).toISOString():i<30?new Date(Date.now()+3*86400000).toISOString():null,estado:i<30?'PENDIENTE':i<40?'ENTREGADA':'CALIFICADA',nota:i<40?null:i-40}));
 let failPage=true,detailError=0,fixtureSubmissions=0;
 const descriptions=new Map();
 const delivery=row=>row.estado==='PENDIENTE'?null:{id:'delivery-'+row.id,tareaId:row.id,alumnoId:session.user.id,revision:0,descripcion:descriptions.get(row.id)||'Respuesta de prueba',comentario:'',archivoId:null,estado:row.estado,nota:row.nota,retroalimentacion:row.estado==='CALIFICADA'?'Revisa las fuentes y las citas.':null,createdAt:new Date().toISOString()};
 const detail=row=>({id:row.id,aulaId:row.aulaId,titulo:row.titulo,descripcion:'Prepara un informe con tus actividades y las evidencias del trabajo realizado.',fechaLimite:row.fechaLimite,createdAt:new Date().toISOString(),revision:0,entrega:delivery(row),aulaNombre:aula.nombre,entregaHabilitada:row.id!=='visual-001'&&row.estado!=='CALIFICADA',bloqueoEntrega:row.estado==='CALIFICADA'?'Tu entrega ya está calificada y se conserva para consulta.':row.id==='visual-001'?'El plazo de entrega terminó. Consulta con tu docente si necesitas una ampliación.':null});
 const browser=await chromium.launch({headless:true});
 async function create(simulated=false){
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();page.setDefaultTimeout(25000);
  page.on('pageerror',e=>errors.push(e.name+': '+e.message.slice(0,200)));
  await page.addInitScript(({api,session})=>{const key='ssp.session.'+Array.from(api).map(c=>c.charCodeAt(0).toString(16)).join('');sessionStorage.setItem(key,JSON.stringify(session));},{api,session});
  await page.route('**/api/v1/**',async route=>{
   const request=route.request(),url=new URL(request.url());if(url.origin!==api){foreignApis.push(url.origin);return route.abort();}
   requests.push({simulated,method:request.method(),path:url.pathname,filter:url.searchParams.get('estado')});
   const prefix='/api/v1/alumno/aulas/'+aula.id+'/tareas/';
   if(simulated&&url.pathname.startsWith(prefix)){
    const name=url.pathname.slice(prefix.length);
    if(name==='pagina'){
     const filter=url.searchParams.get('estado'),cursor=url.searchParams.get('cursor');
     if(cursor&&failPage){failPage=false;return route.fulfill({status:503,contentType:'application/json',body:'{}'});}
     const pool=fixtureRows.filter(r=>filter==='todas'||filter==='pendientes'&&r.estado==='PENDIENTE'||filter==='entregadas'&&r.estado!=='PENDIENTE'||filter==='calificadas'&&r.estado==='CALIFICADA');
     const start=Number(cursor||0),summary={total:45,pendientes:fixtureRows.filter(r=>r.estado==='PENDIENTE').length,entregadas:fixtureRows.filter(r=>r.estado!=='PENDIENTE').length,calificadas:5,promedio:2};
     return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:pool.slice(start,start+20),total:pool.length,resumen:summary,siguiente:start+20<pool.length?String(start+20):null})});
    }
    const row=fixtureRows.find(r=>r.id===name.split('/')[0]);assert.ok(row);
    if(name.endsWith('/entregas')&&request.method()==='POST'){
     fixtureSubmissions++;const payload=request.postDataJSON();descriptions.set(row.id,payload.descripcion);row.estado='ENTREGADA';
     return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify(detail(row))});
    }
    if(detailError)return route.fulfill({status:detailError,contentType:'application/json',body:JSON.stringify({detail:'La tarea no está disponible.'})});
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(detail(row))});
   }
   if(!['GET','HEAD','OPTIONS'].includes(request.method())){academicWrites.push(request.method()+' '+url.pathname);return route.abort();}
   return route.continue();
  });
  return page;
 }
 const button=(p,name)=>p.getByRole('button',{name,exact:true});
 const heading=(p,name)=>p.getByRole('heading',{name,exact:true}).waitFor();
 const back=p=>button(p,'Volver').click();
 const tab=(p,name)=>p.getByRole('tab',{name:new RegExp(name)}).click();
 const openTask=(p,title)=>button(p,'Ver tarea: '+title).click();
 const filesCount=sim=>requests.filter(r=>r.simulated===sim&&r.path.endsWith('/archivos')).length;
 try{
  fs.mkdirSync('.expo/dev',{recursive:true});stage='aula-real';const real=await create();
  await real.goto(web+'/alumno/aulas',{waitUntil:'networkidle',timeout:120000});await heading(real,'Mis aulas');
  await real.getByRole('button',{name:new RegExp(aula.nombre.replace(/[.*+?^$()|[\]\\]/g,'\\$&'))}).click();await heading(real,'Mi aula');
  await real.getByText(/^\d+ de \d+ tareas$/).waitFor();
  assert.equal(requests.filter(r=>!r.simulated&&r.filter==='calificadas').length,0);assert.equal(filesCount(false),0);
  await real.screenshot({path:'.expo/dev/aula23-real.png'});
  await button(real,'Todas').click();await openTask(real,realTask.titulo);await heading(real,'Detalle de tarea');await heading(real,'Instrucciones');
  assert.equal(requests.filter(r=>!r.simulated&&r.path.endsWith('/historial')).length,0);assert.equal(filesCount(false),0);
  await real.getByRole('heading',{name:realTask.titulo,exact:true}).waitFor();await real.screenshot({path:'.expo/dev/aula23-tarea.png'});
  if(realTask.estado!=='PENDIENTE'){const response=real.waitForResponse(r=>r.url().includes('/historial'));await button(real,'Ver historial de entregas').click();assert.equal((await response).status(),200);await heading(real,'Historial de entregas');}
  await back(real);await heading(real,'Mi aula');await button(real,'Notas').click();await heading(real,'Mis calificaciones');await real.getByText(/^\d+ de \d+ tareas$/).waitFor();await real.screenshot({path:'.expo/dev/aula23-notas.png'});
  assert.equal(requests.filter(r=>!r.simulated&&r.path.endsWith('/calificaciones')).length,0);
  await button(real,'Recursos').click();assert.equal(filesCount(false),0);
  await real.getByRole('button',{name:/^Documentos del aula/}).click();await heading(real,'Documentos del aula');await button(real,'Actualizar documentos guardados').waitFor();
  await back(real);await heading(real,'Mi aula');await real.getByText('Recursos y comunicación',{exact:true}).waitFor();
  checks.push('Aula y tarea reales, Notas y Recursos; historial y documentos cargados al abrirlos');
  for(const width of [360,430]){await real.setViewportSize({width,height:844});assert.equal(await real.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
  checks.push('Aula sin desbordamiento a 360 y 430 px');await real.context().close();
  stage='paginacion';const page=await create(true);
  await page.goto(web+'/alumno/aulas/aula?id='+encodeURIComponent(aula.id),{waitUntil:'networkidle'});await page.getByText('20 de 30 tareas',{exact:true}).waitFor();
  assert.equal(requests.filter(r=>r.simulated&&r.filter==='calificadas').length,0);
  await button(page,'Todas').click();await page.getByText('20 de 45 tareas',{exact:true}).waitFor();
  await button(page,'Ver más tareas').click();await button(page,'Reintentar carga').waitFor();await page.getByText('20 de 45 tareas',{exact:true}).waitFor();
  await button(page,'Reintentar carga').click();await page.getByText('40 de 45 tareas',{exact:true}).waitFor();
  await button(page,'Ver más tareas').click();await page.getByText('45 de 45 tareas',{exact:true}).waitFor();
  await tab(page,'Avisos');await tab(page,'Aulas');await page.getByText('45 de 45 tareas',{exact:true}).waitFor();
  await openTask(page,fixtureRows[0].titulo);await heading(page,'Detalle de tarea');await back(page);await page.getByText('45 de 45 tareas',{exact:true}).waitFor();
  checks.push('Tareas 20→40→45; reintento conserva filas y regreso conserva páginas y filtro');
  stage='borrador-entrega';await openTask(page,fixtureRows[0].titulo);await button(page,'Preparar entrega').click();await heading(page,'Preparar entrega');
  await page.getByLabel('Mi respuesta escrita',{exact:true}).fill('Informe ficticio para verificar el recorrido de entrega.');
  await page.getByLabel('Comentario adicional',{exact:true}).fill('Revisión local del diseño.');
  await page.getByText('Borrador guardado en este dispositivo.',{exact:true}).waitFor();assert.equal(filesCount(true),0);
  await page.screenshot({path:'.expo/dev/aula23-preparar.png'});
  await tab(page,'Avisos');await tab(page,'Aulas');await heading(page,'Preparar entrega');
  assert.equal(await page.getByLabel('Mi respuesta escrita',{exact:true}).inputValue(),'Informe ficticio para verificar el recorrido de entrega.');
  await back(page);await heading(page,'Detalle de tarea');await button(page,'Preparar entrega').click();await heading(page,'Preparar entrega');
  await page.getByText('Borrador recuperado de este dispositivo.',{exact:true}).waitFor();
  await button(page,'Adjuntar documento (opcional)').click();await button(page,'Actualizar documentos guardados').waitFor();assert.ok(filesCount(true)>0);
  await button(page,'Revisar entrega').click();await button(page,'Confirmar entrega').waitFor();assert.equal(fixtureSubmissions,0);
  await button(page,'Confirmar entrega').click();await heading(page,'Entrega recibida');assert.equal(fixtureSubmissions,1);
  await button(page,'Ver mi entrega').click();await heading(page,'Detalle de tarea');await page.getByText('Informe ficticio para verificar el recorrido de entrega.',{exact:true}).waitFor();
  await button(page,'Actualizar mi entrega').waitFor();
  checks.push('Formulario separado, borrador entre pestañas y al reabrir, adjunto opcional y envío simulado confirmado');
  stage='plazo-nota';await back(page);await heading(page,'Mi aula');await openTask(page,fixtureRows[1].titulo);
  await page.getByText(/El plazo de entrega terminó/).waitFor();assert.equal(await button(page,'Preparar entrega').count(),0);await page.screenshot({path:'.expo/dev/aula23-plazo.png'});
  await back(page);await button(page,'Notas').click();await openTask(page,fixtureRows[40].titulo);
  await page.getByText('Nota: 0',{exact:true}).waitFor();await page.getByText('Revisa las fuentes y las citas.',{exact:true}).waitFor();assert.equal(await button(page,'Preparar entrega').count(),0);await page.screenshot({path:'.expo/dev/aula23-nota-cero.png'});
  checks.push('Plazo terminado y calificada bloquean formulario; nota cero y observaciones visibles');
  stage='permisos';for(const status of [403,404]){detailError=status;await page.goto(web+'/alumno/aulas/tarea?aulaId='+encodeURIComponent(aula.id)+'&tareaId=visual-001',{waitUntil:'networkidle'});await page.getByRole('alert').waitFor();assert.equal(await button(page,'Preparar entrega').count(),0);}
  assert.equal(requests.filter(r=>r.path.endsWith('/tareas')&&r.method==='GET').length,0);
  assert.deepEqual(errors,[]);assert.deepEqual(foreignApis,[]);assert.deepEqual(academicWrites,[]);
  checks.push('Permisos retirados y recurso ausente informan el error; ningún detalle descarga el listado completo');
  const report={verified:true,checks,browserErrors:errors,foreignApis,academicWrites,fixtureSubmissions,taskPagesSimulated:true,realReadonlyResources:true,nativeAndroid:false};
  fs.writeFileSync('.expo/dev/aula23-verificacion.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(JSON.stringify({verified:false,stage,errorType:e.name,message:e.message.slice(0,700)}));process.exitCode=1;});
