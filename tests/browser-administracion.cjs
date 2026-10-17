const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
async function main(){
 const browser=await chromium.launch({headless:true});let page;const errors=[];
 try{
  page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(20000);
  page.on('pageerror',e=>errors.push(e.name));page.on('console',m=>{if(m.type()==='error'&&m.text().includes('Unexpected text node'))errors.push(m.text());});
  let role='ADMIN',legacy=false,lost=true,posts=0,membershipWrites=0;
  const stamp=new Date().toISOString();
  const users=[['admin','Ana','ADMIN'],['t1','Docente Uno','PROFESOR'],['t2','Docente Dos','PROFESOR'],['s1','Alumno Uno','ALUMNO'],['free','Cuenta Libre','ALUMNO']].map(([id,nombres,role])=>({id,nombres,apellidos:'Prueba',email:`${id}@unsa.edu.pe`,role,createdAt:stamp}));
  const aulas=[];let enrolled=false,rev=0;
  const roster=()=>({aulaId:'a1',aulaNombre:aulas[0].nombre,revision:String(rev).padStart(64,'0'),alumnos:users.filter(u=>u.role==='ALUMNO').map(u=>({alumnoId:u.id,alumnoNombre:`${u.nombres} ${u.apellidos}`,email:u.email,inscrito:u.id==='s1'&&enrolled}))});
  await page.route('**/api/v1/**',async route=>{
   const r=route.request(),path=new URL(r.url()).pathname.replace('/api/v1','');let body,status=200;
   if(path==='/auth/login'){role=r.postDataJSON().email.startsWith('admin')?'ADMIN':'PROFESOR';body={token:'fixture',user:{...users.find(u=>u.id===(role==='ADMIN'?'admin':'t1'))}};}
   else if(path==='/notificaciones')body=[];
   else if(path==='/admin/resumen')body={alumnosMatriculados:2,profesoresActivos:1,aulasActivas:aulas.length,centrosDePracticas:0};
   else if(path==='/aulas')body=aulas;
   else if(path==='/profesor/practicantes')body=[{alumnoId:'s1',alumnoNombre:'Alumno Uno Prueba',alumnoEmail:'s1@unsa.edu.pe',aulaId:'a1',aulaNombre:'Taller de prácticas',progreso:25,semanaActual:4,semanasTotales:16,estado:'ACTIVA',tareasEntregadas:1,tareasTotal:2}];
   else if(path==='/profesor/aulas/a1/entregas')body=[];
   else if(path==='/profesor/aulas/a1/libro')body={aulaId:'a1',aulaNombre:'Taller de prácticas',tareas:[],alumnos:[],promedioGeneral:null};
   else if(path==='/profesor/resumen')body={alumnosActivos:1,entregasPendientes:0,asistenciaPromedio:null};
   else if(path==='/admin/capacidades')body={versionAdministracion:legacy?0:1};
   else if(path==='/admin/usuarios')body=users;
   else if(path==='/admin/aulas'){
    if(r.method()==='GET')body=aulas;
    else{posts++;const p=r.postDataJSON();let a=aulas.find(a=>a.key===p.solicitudId);if(!a){a={id:'a1',nombre:p.nombre,codigo:p.codigo,descripcion:p.descripcion,periodo:p.periodo,profesorId:p.profesorId,profesorNombre:users.find(u=>u.id===p.profesorId).nombres,estado:'ACTIVA',inscritos:0,createdAt:stamp,key:p.solicitudId};aulas.push(a);}body=a;status=201;if(lost){lost=false;status=500;body={};}}
   }else if(path==='/admin/aulas/a1/matriculas')body=roster();
   else if(path==='/admin/aulas/a1/matriculas/s1'){membershipWrites++;const p=r.postDataJSON();if(enrolled!==p.inscrito){assert.equal(p.revision,roster().revision);enrolled=p.inscrito;rev++;aulas[0].inscritos=enrolled?1:0;}body=roster();}
   else if(path==='/admin/aulas/a1/profesor'){const p=r.postDataJSON();assert.equal(p.anterior,aulas[0].profesorId);aulas[0].profesorId=p.profesorId;aulas[0].profesorNombre=users.find(u=>u.id===p.profesorId).nombres;body=aulas[0];}
   else if(path==='/admin/aulas/a1/estado'){const p=r.postDataJSON();assert.equal(p.anterior,aulas[0].estado);aulas[0].estado=p.estado;body=aulas[0];}
   else if(path==='/admin/usuarios/free/rol'){const p=r.postDataJSON(),u=users.find(u=>u.id==='free');assert.equal(p.anterior,u.role);u.role=p.role;body=u;}
   else if(path==='/admin/reportes')body={totalAlumnos:2,totalProfesores:2,totalAulas:aulas.length,aulasActivas:aulas.filter(a=>a.estado==='ACTIVA').length,practicasEnCurso:1,practicasCerradas:0,horasPromedio:2,aulas:aulas.map(a=>({aulaId:a.id,aulaNombre:a.nombre,periodo:a.periodo,profesorNombre:a.profesorNombre,estado:a.estado,inscritos:a.inscritos,promedioNotas:null,asistenciaPct:null}))};
   else if(path==='/profesor/seguimiento/capacidades')body={versionSeguimiento:1};
   else if(path==='/profesor/aulas/a1/practicantes/s1/seguimiento')body={practicanteId:'s1',practicanteNombre:'Alumno Uno Prueba',practicanteEmail:'s1@unsa.edu.pe',aulaId:'a1',aulaNombre:'Taller de prácticas',empresaNombre:'Centro de prueba',promedio:17,asistenciaPct:90,horasAcumuladas:2,horasMinimas:360,progreso:25,estadoPractica:'EN_CURSO',entregas:[{tareaTitulo:'Primer informe',nota:17,estado:'CALIFICADA',retroalimentacion:'Mejora las fuentes.'}],motivosRiesgo:['Una tarea pendiente de entrega']};
   else throw new Error(`Ruta no prevista: ${r.method()} ${path}`);
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  });
  const button=n=>page.getByRole('button',{name:n,exact:true}).filter({visible:true});const visible=t=>page.getByText(t,{exact:true}).filter({visible:true});
  async function login(name){await page.goto(process.env.SSP_WEB_URL||'http://localhost:5173',{waitUntil:'networkidle'});await page.getByLabel('Correo de tu cuenta SSP',{exact:true}).fill(`${name}@unsa.edu.pe`);await page.getByLabel('Contraseña',{exact:true}).fill('fixture');await button('Ingresar').click();}
  await login('admin');await button('Administración académica').click();await button('Crear aula').click();
  await page.getByLabel('Nombre del aula',{exact:true}).fill('Taller de prácticas');await page.getByLabel('Código del aula',{exact:true}).fill('taller-1');await page.getByLabel('Periodo académico',{exact:true}).fill('2026-II');
  await button('Revisar antes de guardar').click();await button('Confirmar creación de aula').click();await button('Reintentar la misma solicitud').click();
  await button('Administrar aula: Taller de prácticas').waitFor();assert.equal(posts,2);assert.equal(aulas.length,1);
  await button('Administrar aula: Taller de prácticas').click();await button('Matricular: Alumno Uno Prueba').click();
  await button('Revisar antes de guardar').click();await button('Confirmar matrícula').click();await visible('Matrículas · 1 estudiantes').waitFor();assert.equal(membershipWrites,1);
  await button('Cambiar docente responsable').click();await button('Docente Dos Prueba · t2@unsa.edu.pe').click();await button('Revisar antes de guardar').click();await button('Confirmar docente responsable').click();
  await visible('Docente: Docente Dos').waitFor();
  await button('Concluir aula').click();await button('Revisar antes de guardar').click();await button('Confirmar conclusión del aula').click();await button('Reactivar aula').waitFor();
  assert.equal(await button('Retirar matrícula: Alumno Uno Prueba').isDisabled(),true);
  await button('Reactivar aula').click();await button('Revisar antes de guardar').click();await button('Confirmar reactivación del aula').click();await button('Concluir aula').waitFor();
  await button('Retirar matrícula: Alumno Uno Prueba').click();await button('Revisar antes de guardar').click();await button('Confirmar retiro de matrícula').click();await visible('Matrículas · 0 estudiantes').waitFor();
  await button('Volver').click();await button('Directorio de usuarios').click();await page.getByLabel('Buscar en administración',{exact:true}).fill('Cuenta Libre');await button('Cambiar rol: Cuenta Libre Prueba').click();
  const card=visible('Cuenta Libre Prueba').locator('..');await card.getByRole('button',{name:'Supervisor',exact:true}).last().click();await button('Revisar antes de guardar').click();await button('Confirmar cambio de rol').click();
  await visible('Supervisor').filter({visible:true}).last().waitFor();assert.equal(users.find(u=>u.id==='free').role,'SUPERVISOR');
  await button('Ver reporte institucional').click();await visible('2 h validadas en promedio por práctica').waitFor();await visible('Promedio de notas: Sin calificaciones').waitFor();
  await login('profesor');
  aulas[0].profesorId='t1';aulas[0].profesorNombre='Docente Uno';
  await button('Mis aulas · Docencia').click();
  await button('Gestionar aula: Taller de prácticas').click();
  await button('Alumnos').click();
  await button('Seguimiento: Alumno Uno Prueba').click();
  await visible('Alumno Uno Prueba').waitFor();await visible('2 h validadas · Meta: 360 h').waitFor();await visible('Mejora las fuentes.').waitFor();
  await login('profesor');assert.equal(await button('Administración académica').count(),0);
  legacy=true;await login('admin');await button('Administración académica').click();await visible('Este servidor todavía no ofrece la administración actualizada.').waitFor();
  assert.deepEqual(errors,[]);console.log('OK: aulas sin duplicados, matrícula/retiro, responsable, estado, roles, reporte y seguimiento con acceso por rol.');
 }catch(e){console.error(JSON.stringify({url:page?.url(),text:page?(await page.locator('body').innerText()).slice(0,1200):'',errors}));throw e;}finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
