const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
async function main(){
 const browser=await chromium.launch({headless:true});const errors=[];let page;
 try{
  page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.name));page.on('console',m=>{if(m.type()==='error'&&m.text().includes('Unexpected text node'))errors.push(m.text());});
  let role='ALUMNO',legacy=false,lost=true,sends=0,reads=0;const messages=[];
  const aula={id:'a',nombre:'Comunicación',periodo:'TEST',estado:'ACTIVA'};
  const who=()=>role==='ALUMNO'?'student':role==='PROFESOR'?'teacher':'admin',peer=()=>role==='ALUMNO'?'teacher':'student';
  await page.route('**/api/v1/**',async route=>{
   const r=route.request(),path=new URL(r.url()).pathname.replace('/api/v1','');let body,status=200;
   if(path==='/auth/login'){role=r.postDataJSON().email.startsWith('profesor')?'PROFESOR':r.postDataJSON().email.startsWith('admin')?'ADMIN':'ALUMNO';body={token:'fixture',user:{id:who(),nombres:role==='ALUMNO'?'Alumno':'Docente',apellidos:'Prueba',email:'test@unsa.edu.pe',role}};}
   else if(path==='/notificaciones')body=[];
   else if(path==='/alumno/mis-aulas')body=[];
   else if(path==='/practicas/actual')body=null;
   else if(path==='/profesor/resumen')body={alumnosActivos:1,entregasPendientes:0,asistenciaPromedio:null};
   else if(path==='/admin/resumen')body={alumnosMatriculados:1,profesoresActivos:1,aulasActivas:1,centrosDePracticas:0};
   else if(path==='/mensajes/capacidades')body={versionMensajes:legacy?0:1,lecturaExplicita:true};
   else if(path==='/comunicacion/capacidades')body={versionComunicacion:1};
   else if(path==='/comunicacion/aulas')body=[aula];
   else if(path==='/aulas/a/contactos')body=[{userId:peer(),nombre:role==='ALUMNO'?'Docente Prueba':'Alumno Prueba',aulaId:'a',aulaNombre:aula.nombre,noLeidos:messages.filter(m=>m.destinatarioId===who()&&!m.leido).length}];
   else if(path.startsWith('/aulas/a/mensajes/')){
    if(path.endsWith('/lectura')){reads++;const ids=r.postDataJSON().mensajeIds;for(const id of ids){const m=messages.find(m=>m.id===id);assert.equal(m.destinatarioId,who());m.leido=true;}body={mensajeIds:ids};}
    else if(r.method()==='GET')body=messages.map(m=>({...m,mio:m.remitenteId===who()}));
    else{sends++;const p=r.postDataJSON();let m=messages.find(m=>m.key===p.solicitudId);if(!m){m={id:`md-${messages.length}`,key:p.solicitudId,aulaId:'a',remitenteId:who(),destinatarioId:peer(),remitenteNombre:role==='ALUMNO'?'Alumno Prueba':'Docente Prueba',texto:p.texto,leido:false,fecha:new Date().toISOString()};messages.push(m);}body={...m,mio:true};status=201;if(lost){lost=false;status=500;body={};}}
   }else throw new Error(`Ruta no prevista ${path}`);
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  });
  const button=n=>page.getByRole('button',{name:n,exact:true}).filter({visible:true}),visible=t=>page.getByText(t,{exact:true}).filter({visible:true});
  async function login(name){await page.goto('http://localhost:5173',{waitUntil:'networkidle'});await page.getByLabel('Correo de tu cuenta SSP',{exact:true}).fill(`${name}@unsa.edu.pe`);await page.getByLabel('Contraseña',{exact:true}).fill('fixture');await button('Ingresar').click();}
  await login('alumno');await button('Mensajes académicos').click();await button('Conversar con: Docente Prueba').click();await button('Escribir mensaje privado').click();
  await page.getByLabel('Mensaje para el contacto',{exact:true}).fill('¿Puedo revisar el avance de mi informe?');await button('Revisar antes de guardar').click();await button('Confirmar envío de mensaje').click();await button('Reintentar la misma solicitud').click();await visible('Enviado').waitFor();assert.equal(sends,2);assert.equal(messages.length,1);
  await login('profesor');await button('Mensajes académicos').click();await visible('1 mensajes sin leer').waitFor();await button('Conversar con: Alumno Prueba').click();await visible('Recibido sin leer').waitFor();assert.equal(reads,0);assert.equal(messages[0].leido,false);
  await button('Marcar recibidos como leídos (1)').click();await visible('Lectura confirmada por el servidor.').waitFor();assert.equal(reads,1);assert.equal(messages[0].leido,true);
  await button('Escribir mensaje privado').click();await page.getByLabel('Mensaje para el contacto',{exact:true}).fill('Sí, revisaremos las fuentes en la tutoría.');await button('Revisar antes de guardar').click();await button('Confirmar envío de mensaje').click();await visible('Sí, revisaremos las fuentes en la tutoría.').waitFor();
  await login('alumno');await button('Mensajes académicos').click();await visible('1 mensajes sin leer').waitFor();await button('Conversar con: Docente Prueba').click();await visible('Leído por el destinatario').waitFor();await visible('Sí, revisaremos las fuentes en la tutoría.').waitFor();await button('Marcar recibidos como leídos (1)').click();await visible('Lectura confirmada por el servidor.').waitFor();
  await button('Volver').click();await visible('0 mensajes sin leer').waitFor();assert.equal(messages.length,2);assert.equal(reads,2);
  aula.estado='CONCLUIDA';await button('Conversar con: Docente Prueba').click();await visible('Aula concluida · solo consulta').waitFor();assert.equal(await button('Escribir mensaje privado').count(),0);
  await login('admin');await button('Administración académica').waitFor();assert.equal(await button('Mensajes académicos').count(),0);
  legacy=true;await login('alumno');await button('Mensajes académicos').click();await visible('Este servidor todavía no ofrece la mensajería actualizada.').waitFor();assert.deepEqual(errors,[]);
  console.log('OK: mensajes privados persistidos sin duplicados, lectura explícita/contadores, respuesta docente, acceso por rol y aula concluida.');
 }catch(e){console.error(JSON.stringify({url:page?.url(),text:page?(await page.locator('body').innerText()).slice(0,900):'',errors}));throw e;}finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
