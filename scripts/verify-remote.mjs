import {createClient} from '@supabase/supabase-js';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret=process.env.SUPABASE_SECRET_KEY;
if(!url||!publicKey||!secret)throw Error('Falta configuración del servidor.');
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const admin=createClient(url,secret,options);
const stateFile='.local-data/remote-qa.json';
let state;
try{state=JSON.parse(await readFile(stateFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
async function save(){await mkdir('.local-data',{recursive:true});await writeFile(stateFile,JSON.stringify(state),{mode:0o600});}
function ok(result,label){if(result.error)throw Error(`${label}: ${result.error.code||result.error.status||'error'}`);return result.data;}
if(!state){state={project:url,run:randomUUID(),users:{},businesses:{}};await save();}
if(state.project!==url)throw Error('El entorno de pruebas pertenece a otro proyecto.');
for(const name of ['bossA','bossB','employeeA']){
  if(state.users[name])continue;
  const password=randomBytes(32).toString('base64url');
  const email=`qa-${state.run}-${name.toLowerCase()}@example.invalid`;
  const data=ok(await admin.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{qa_run:state.run}}),'crear identidad QA');
  state.users[name]={id:data.user.id,email,password};await save();
}
for(const suffix of ['A','B']){
  if(!state.businesses[suffix]){
    const user=state.users[`boss${suffix}`];
    const id=ok(await admin.rpc('bootstrap_business',{p_auth_user_id:user.id,p_email:user.email,p_name:`QA Jefe ${suffix}`,p_business_name:`QA aislado ${suffix} ${state.run.slice(0,8)}`}),'crear comercio QA');
    state.businesses[suffix]=id;await save();
  }
  ok(await admin.from('businesses').update({is_demo:true,active:true}).eq('id',state.businesses[suffix]),'marcar comercio QA');
}
for(const name of ['bossA','bossB'])ok(await admin.from('profiles').update({role:'boss',active:true}).eq('auth_user_id',state.users[name].id),'restablecer jefe QA');
const clients={};
for(const [name,user] of Object.entries(state.users)){
  const client=createClient(url,publicKey,options);
  ok(await client.auth.signInWithPassword({email:user.email,password:user.password}),'iniciar sesión QA');
  clients[name]=client;
}
const profile=ok(await admin.from('profiles').select('id').eq('auth_user_id',state.users.employeeA.id).maybeSingle(),'consultar empleado QA');
if(!profile){
  ok(await clients.bossA.rpc('create_employee_invitation',{p_name:'QA Empleado',p_email:state.users.employeeA.email}),'autorizar empleado QA');
  ok(await clients.employeeA.rpc('accept_employee_invitation'),'aceptar empleado QA');
}
ok(await admin.from('profiles').update({role:'employee',active:true}).eq('auth_user_id',state.users.employeeA.id),'restablecer empleado QA');
const profiles=ok(await admin.from('profiles').select('id,auth_user_id').in('auth_user_id',Object.values(state.users).map(u=>u.id)),'leer perfiles QA');
for(const user of Object.values(state.users))user.profileId=profiles.find(p=>p.auth_user_id===user.id).id;
await save();
const results=[];
async function check(name,fn){await fn();results.push(name);console.log(`OK ${name}`);}
const rows=async(client,table)=>ok(await client.from(table).select('*'),`leer ${table}`);
const updateArgs=(user,role,active=true)=>({p_profile_id:user.profileId,p_name:'QA Persona',p_role:role,p_active:active});
const settings={p_name:'QA configuración persistida',p_service_name:'QA Servicio',p_tax_identifier:'',p_brand_color:'#087f8c',p_support_email:''};
await check('anónimo rechazado por PostgREST',async()=>{const result=await createClient(url,publicKey,options).from('profiles').select('id');assert.equal(result.error?.code,'42501');});
await check('jefes aislados entre comercios',async()=>{for(const suffix of ['A','B']){const data=await rows(clients[`boss${suffix}`],'businesses');assert.equal(data.length,1);assert.equal(data[0].id,state.businesses[suffix]);}});
await check('empleado solamente puede leer su perfil',async()=>{const data=await rows(clients.employeeA,'profiles');assert.equal(data.length,1);assert.equal(data[0].auth_user_id,state.users.employeeA.id);});
await check('empleado no ve auditoría ni invitaciones',async()=>{for(const table of ['audit_logs','employee_invitations'])assert.deepEqual(await rows(clients.employeeA,table),[]);});
await check('escalamiento directo y por RPC rechazados',async()=>{assert.equal((await clients.employeeA.from('profiles').update({role:'boss'}).eq('id',state.users.employeeA.profileId)).error?.code,'42501');assert.equal((await clients.employeeA.rpc('update_employee',updateArgs(state.users.employeeA,'boss'))).error?.code,'42501');});
await check('empleado no modifica configuración',async()=>{assert.equal((await clients.employeeA.rpc('update_business',settings)).error?.code,'42501');});
await check('jefe no modifica otro comercio',async()=>{assert.equal((await clients.bossB.rpc('update_employee',updateArgs(state.users.employeeA,'boss'))).error?.code,'42501');});
await check('configuración persiste y genera auditoría',async()=>{ok(await clients.bossA.rpc('update_business',settings),'guardar QA');assert.equal((await rows(clients.bossA,'businesses'))[0].name,settings.p_name);assert.ok((await rows(clients.bossA,'audit_logs')).some(x=>x.action==='business.updated'));});
await check('último jefe protegido',async()=>{assert.equal((await clients.bossA.rpc('update_employee',updateArgs(state.users.bossA,'employee'))).error?.code,'22023');});
await check('sesión existente pierde acceso al desactivar perfil',async()=>{ok(await clients.bossA.rpc('update_employee',updateArgs(state.users.employeeA,'employee',false)),'desactivar QA');assert.deepEqual(await rows(clients.employeeA,'businesses'),[]);assert.equal((await clients.employeeA.rpc('record_login')).error?.code,'42501');ok(await clients.bossA.rpc('update_employee',updateArgs(state.users.employeeA,'employee')),'reactivar QA');});
await check('cambios simultáneos conservan un jefe',async()=>{
  ok(await clients.bossA.rpc('update_employee',updateArgs(state.users.employeeA,'boss')),'promover QA');
  const outcomes=await Promise.all([clients.bossA.rpc('update_employee',updateArgs(state.users.bossA,'employee')),clients.employeeA.rpc('update_employee',updateArgs(state.users.employeeA,'employee'))]);
  assert.equal(outcomes.filter(x=>!x.error).length,1);
  const remaining=ok(await admin.from('profiles').select('id').eq('business_id',state.businesses.A).eq('role','boss').eq('active',true),'verificar jefes QA');assert.equal(remaining.length,1);
  ok(await admin.from('profiles').update({role:'boss'}).eq('id',state.users.bossA.profileId),'restaurar QA');ok(await admin.from('profiles').update({role:'employee'}).eq('id',state.users.employeeA.profileId),'restaurar QA');
});
await check('invitaciones concurrentes no se duplican',async()=>{
  const args={p_name:'QA Invitación',p_email:`qa-${randomUUID()}@example.invalid`};
  const outcomes=await Promise.all([clients.bossA.rpc('create_employee_invitation',args),clients.bossA.rpc('create_employee_invitation',args)]);
  assert.equal(outcomes.filter(x=>!x.error).length,1);
  const invitation=outcomes.find(x=>!x.error).data;
  assert.equal((await clients.bossB.rpc('revoke_employee_invitation',{p_invitation_id:invitation})).error?.code,'22023');
  ok(await clients.bossA.rpc('revoke_employee_invitation',{p_invitation_id:invitation}),'revocar QA');
});
await check('limitador concurrente admite exactamente ocho',async()=>{
  const key=randomBytes(32).toString('hex');
  const outcomes=await Promise.all(Array.from({length:12},()=>admin.rpc('consume_auth_attempt',{p_key_hash:key})));
  outcomes.forEach(x=>ok(x,'limitador QA'));assert.equal(outcomes.filter(x=>x.data===true).length,8);
  assert.equal((await clients.bossA.rpc('consume_auth_attempt',{p_key_hash:key})).error?.code,'42501');
});
await check('comercio inactivo bloquea sesiones existentes',async()=>{ok(await admin.from('businesses').update({active:false}).eq('id',state.businesses.B),'desactivar QA');assert.deepEqual(await rows(clients.bossB,'businesses'),[]);ok(await admin.from('businesses').update({active:true}).eq('id',state.businesses.B),'restaurar QA');});
await writeFile('.local-data/remote-qa-results.json',JSON.stringify({date:new Date().toISOString(),passed:results.length,results},null,2));
console.log(`${results.length} comprobaciones remotas aprobadas. Entornos QA separados y marcados is_demo; no se enviaron correos de prueba.`);
