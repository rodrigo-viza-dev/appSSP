const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {parseEnv}=require('node:util');
const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const api=process.env.SSP_API_URL || 'http://localhost:8000',web=process.env.SSP_WEB_URL || 'http://localhost:5173';
let stage='inicio';
const errors=[],unexpected=[],writes=[],checks=[];
async function login(name){const env=parseEnv(fs.readFileSync(path.resolve('../appSSP-backend/.env'),'utf8'));const response=await fetch(api+'/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:name+'.prueba@unsa.edu.pe',password:env.TEST_SEED_PASSWORD})});assert.equal(response.status,200);return response.json();}
(async()=>{
 for(const url of [api,web])assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname),'La prueba requiere servidores locales.');fs.mkdirSync('.expo/dev',{recursive:true});
 let ready;const deadline=Date.now()+45000;while(Date.now()<deadline){try{const r=await fetch(api+'/dev/ready',{signal:AbortSignal.timeout(3000)});if(r.ok){ready=await r.json();break;}}catch{}await new Promise(r=>setTimeout(r,400));}assert.equal(ready?.schema,'ssp_test');
 let webReady=false;const webDeadline=Date.now()+90000;while(Date.now()<webDeadline){try{await fetch(web,{method:'HEAD',signal:AbortSignal.timeout(20000)});webReady=true;break;}catch{}await new Promise(r=>setTimeout(r,500));}assert.ok(webReady,'Expo no está disponible.');
 const session=await login('alumno');
 const browser=await chromium.launch({headless:true});
 async function newPage(account){
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();page.setDefaultTimeout(20000);
  page.on('pageerror',e=>errors.push(e.name+': '+e.message.slice(0,220)));
  await page.addInitScript(({api,account})=>{const key='ssp.session.'+Array.from(api).map(c=>c.charCodeAt(0).toString(16)).join('');sessionStorage.setItem(key,JSON.stringify(account));},{api,account});
  await page.route('**/api/v1/**',route=>{
   const r=route.request(),url=new URL(r.url());
   if(url.origin!==api){unexpected.push(url.origin);return route.abort();}
   if(!['GET','HEAD','OPTIONS'].includes(r.method())){writes.push(r.method()+' '+url.pathname);return route.abort();}
   return route.continue();
  });
  return page;
 }
 const tab=(p,name)=>p.getByRole('tab',{name:new RegExp(name)}).click();
 const heading=(p,name)=>p.getByRole('heading',{name,exact:true}).waitFor();
 try{
  const page=await newPage(session);
  stage='inicio-real';await page.goto(web,{waitUntil:'networkidle',timeout:120000});
  await heading(page,'PrácticasCC');await page.getByRole('button',{name:'Actualizar mi resumen',exact:true}).waitFor();
  assert.equal(await page.getByRole('tab').count(),5);
  await page.screenshot({path:'.expo/dev/alumno21-inicio.png'});
  checks.push('Inicio real y cinco pestañas de alumno');
  stage='bitacora-real';await tab(page,'Bitácora');await heading(page,'Mi bitácora');
  await page.getByRole('button',{name:'Actualizar bitácora',exact:true}).waitFor();
  assert.equal(await page.getByRole('searchbox').count(),0);
  assert.equal(await page.getByRole('textbox').count(),0);
  await page.getByText(/^\d+ de \d+ actividades$/).waitFor();
  await page.screenshot({path:'.expo/dev/alumno21-bitacora.png'});
  await tab(page,'Avisos');await heading(page,'Mis avisos');
  await tab(page,'Bitácora');await heading(page,'Mi bitácora');
  checks.push('Bitácora real sin búsqueda y pestaña conservada');
  stage='borrador';await tab(page,'Inicio');
  await page.getByRole('button',{name:/Registrar actividad/}).click();
  await heading(page,'Registrar actividad');
  await page.getByLabel('Horas trabajadas',{exact:true}).fill('2');
  await page.getByLabel('Descripción de la actividad',{exact:true}).fill('Borrador local de revisión visual del alumno.');
  await page.getByText('Borrador guardado en este dispositivo.',{exact:true}).waitFor();
  await page.screenshot({path:'.expo/dev/alumno21-registrar.png'});
  await tab(page,'Aulas');await heading(page,'Mis aulas');
  await tab(page,'Inicio');await heading(page,'Registrar actividad');
  assert.equal(await page.getByLabel('Horas trabajadas',{exact:true}).inputValue(),'2');
  await page.getByRole('button',{name:'Volver',exact:true}).click();await heading(page,'PrácticasCC');
  await page.getByRole('button',{name:/1 borrador por continuar/}).waitFor();
  checks.push('Formulario y borrador local conservados al cambiar de pestaña');
  stage='aula-tarea';await tab(page,'Aulas');
  const overview=await(await fetch(api+'/api/v1/alumno/inicio',{headers:{Authorization:'Bearer '+session.token}})).json();
  const aula=overview.aulas.find(a=>a.estado==='ACTIVA');assert.ok(aula);
  await page.getByRole('button',{name:new RegExp(aula.nombre.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).click();
  await heading(page,'Mi aula');
  const taskButton=page.getByRole('button',{name:/^Ver tarea:/}).first();await taskButton.waitFor();await taskButton.click();
  await heading(page,'Detalle de tarea');assert.equal(await page.getByRole('tab').count(),5);
  await page.getByText('Mi entrega',{exact:true}).waitFor();
  await page.screenshot({path:'.expo/dev/alumno21-tarea.png'});
  await tab(page,'Avisos');await tab(page,'Aulas');await heading(page,'Detalle de tarea');
  await page.getByRole('button',{name:'Volver',exact:true}).click();await heading(page,'Mi aula');
  checks.push('Aula y tarea reales dentro de pestaña, con retorno y contexto');
  stage='mas';await page.goto(web+'/alumno/mas',{waitUntil:'networkidle'});await heading(page,'Tu espacio');
  await page.getByRole('button',{name:/Centro y supervisor/}).waitFor();
  await page.screenshot({path:'.expo/dev/alumno21-mas.png'});
  await page.getByRole('button',{name:/Guía de prácticas/}).click();await heading(page,'Guía de prácticas');
  assert.equal(await page.getByLabel('Buscar en la guía').count(),0);
  checks.push('Más agrupado y guía del alumno sin buscador');
  stage='anchos';for(const width of [360,430]){await page.setViewportSize({width,height:844});await page.goto(web+'/alumno/inicio',{waitUntil:'networkidle'});await heading(page,'PrácticasCC');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
  checks.push('Inicio sin desbordamiento a 360 y 430 px');
  stage='otros-roles';for(const name of ['profesor','supervisor','admin']){const other=await newPage(await login(name));await other.goto(web+'/panel',{waitUntil:'networkidle'});await other.getByRole('button',{name:'Cerrar sesión',exact:true}).waitFor();assert.equal(await other.getByRole('tab').count(),0);await other.context().close();}
  checks.push('Panel existente conservado para docente, supervisor y administración');
  stage='paginacion-simulada';const paged=await newPage(session);let failure=true;const requests=[];
  const practice=overview.practica;assert.ok(practice);
  await paged.route('**/alumno/practicas/*/bitacora?**',route=>{
   const url=new URL(route.request().url()),cursor=url.searchParams.get('cursor'),filter=url.searchParams.get('estado');requests.push({cursor,filter});
   if(cursor&&failure){failure=false;return route.fulfill({status:503,contentType:'application/json',body:'{}',headers:{'Access-Control-Allow-Origin':web}});}
   const all=Array.from({length:45},(_,i)=>({id:'fixture-'+String(45-i).padStart(3,'0'),practicaId:practice.id,fecha:'2026-10-20T17:00:00+00:00',horas:2,descripcion:'Actividad visual '+(i+1),estadoValidacion:i<30?'VALIDADO':'PENDIENTE',revision:0,observacion:''}));
   const rows=filter?all.filter(r=>r.estadoValidacion===filter):all;const start=cursor?Number(cursor):0;
   const payload={practica:{...practice,horasAcumuladas:60},resumen:{VALIDADO:{horas:60,registros:30},PENDIENTE:{horas:30,registros:15},RECHAZADO:{horas:0,registros:0}},registros:rows.slice(start,start+20),coincidencias:rows.length,siguiente:start+20<rows.length?String(start+20):null};
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload),headers:{'Access-Control-Allow-Origin':web}});
  });
  await paged.goto(web+'/alumno/bitacora',{waitUntil:'networkidle'});await paged.getByText('20 de 45 actividades',{exact:true}).waitFor();
  await paged.getByRole('button',{name:'Ver actividades anteriores',exact:true}).click();
  await paged.getByRole('button',{name:'Reintentar carga',exact:true}).waitFor();await paged.getByText('20 de 45 actividades',{exact:true}).waitFor();
  await paged.getByRole('button',{name:'Reintentar carga',exact:true}).click();await paged.getByText('40 de 45 actividades',{exact:true}).waitFor();
  await paged.getByRole('button',{name:'Ver actividades anteriores',exact:true}).click();await paged.getByText('45 de 45 actividades',{exact:true}).waitFor();
  await paged.getByRole('button',{name:'Validadas',exact:true}).click();await paged.getByText('20 de 30 actividades',{exact:true}).waitFor();
  await tab(paged,'Avisos');await tab(paged,'Bitácora');await paged.getByText('20 de 30 actividades',{exact:true}).waitFor();
  checks.push('Respuesta simulada: paginación 20→40→45, reintento conserva filas y filtro conserva contexto');
  assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);assert.deepEqual(writes,[]);
  const report={verified:true,checks,browserErrors:errors,nonLocalApis:unexpected,academicWrites:writes,paginationUiSimulated:true,realReadonlyApi:true,nativeAndroid:false};
  fs.writeFileSync('.expo/dev/alumno21-verificacion.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(JSON.stringify({verified:false,stage,errorType:e.name,message:e.message.slice(0,900)}));process.exitCode=1;});
