import {before,after,beforeEach,afterEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const bossA='10000000-0000-4000-8000-000000000001';
const workerA='10000000-0000-4000-8000-000000000002';
const bossB='20000000-0000-4000-8000-000000000001';
const outsider='30000000-0000-4000-8000-000000000001';
let businessA:string,businessB:string,profileA:string,profileWorker:string,profileB:string;
async function rows(sql:string,params:unknown[]=[]){return (await db.query<Record<string,any>>(sql,params)).rows;}
async function identity(id:string,role='authenticated'){
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);
  await db.exec(`set local role ${role}`);
}
async function rejected(sql:string,params:unknown[]=[],code?:string){
  await db.exec('savepoint denied_operation');
  let caught:any;
  try{await db.query(sql,params);}catch(error){caught=error;}
  await db.exec('rollback to savepoint denied_operation');
  assert.ok(caught,'La operación debía ser rechazada');
  if(code)assert.equal(caught.code,code);
}
before(async()=>{
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;`);
  await db.exec(await readFile('supabase/migrations/202609150001_foundation.sql','utf8'));
  await db.query(`insert into auth.users values ($1,'boss-a@example.test',now()),($2,'worker-a@example.test',now()),($3,'boss-b@example.test',now()),($4,'outsider@example.test',now())`,[bossA,workerA,bossB,outsider]);
  businessA=(await rows(`select public.bootstrap_business($1,'boss-a@example.test','Jefe A','Comercio A') as id`,[bossA]))[0].id;
  businessB=(await rows(`select public.bootstrap_business($1,'boss-b@example.test','Jefe B','Comercio B') as id`,[bossB]))[0].id;
  profileWorker=(await rows(`insert into public.profiles(business_id,auth_user_id,name,email,role) values($1,$2,'Empleado A','worker-a@example.test','employee') returning id`,[businessA,workerA]))[0].id;
  profileA=(await rows('select id from public.profiles where auth_user_id=$1',[bossA]))[0].id;
  profileB=(await rows('select id from public.profiles where auth_user_id=$1',[bossB]))[0].id;
});
beforeEach(async()=>{await db.exec('begin');});
afterEach(async()=>{await db.exec('rollback; reset role');});
after(async()=>{await db.close();});

test('la migración habilita RLS en todas las tablas privadas',async()=>{
  const tables=await rows("select tablename,rowsecurity from pg_tables where schemaname in ('public','private')");
  assert.equal(tables.length,5);assert.ok(tables.every(t=>t.rowsecurity));
});
test('anónimo no puede leer comercios ni perfiles',async()=>{await identity('','anon');await rejected('select * from public.businesses',[],'42501');await rejected('select * from public.profiles',[],'42501');});
test('usuario sin perfil no accede a ningún comercio',async()=>{await identity(outsider);assert.deepEqual(await rows('select * from public.businesses'),[]);assert.deepEqual(await rows('select * from public.profiles'),[]);});
test('jefe A solo puede leer comercio A y sus empleados',async()=>{await identity(bossA);const b=await rows('select * from public.businesses');assert.equal(b.length,1);assert.equal(b[0].id,businessA);assert.equal((await rows('select * from public.profiles')).length,2);});
test('jefe B no puede leer perfiles, invitaciones ni auditoría de A',async()=>{await identity(bossB);for(const table of ['profiles','employee_invitations','audit_logs'])assert.deepEqual(await rows(`select * from public.${table} where business_id=$1`,[businessA]),[]);});
test('empleado solo ve su perfil y no auditorías',async()=>{await identity(workerA);const p=await rows('select * from public.profiles');assert.equal(p.length,1);assert.equal(p[0].id,profileWorker);assert.deepEqual(await rows('select * from public.audit_logs'),[]);});
test('empleado no puede escalar rol mediante UPDATE directo',async()=>{await identity(workerA);await rejected("update public.profiles set role='boss' where auth_user_id=$1",[workerA],'42501');});
test('empleado no puede escalar rol mediante función autorizada para jefes',async()=>{await identity(workerA);await rejected("select public.update_employee($1,'Empleado A','boss',true)",[profileWorker],'42501');});
test('empleado no puede cambiar configuración del comercio',async()=>{await identity(workerA);await rejected("select public.update_business('Falso','Servicio','','#ffffff','')",[],'42501');});
test('jefe tampoco tiene acceso a escrituras directas que omitan auditoría',async()=>{await identity(bossA);await rejected("update public.businesses set name='Sin auditoría' where id=$1",[businessA],'42501');await rejected('delete from public.profiles where id=$1',[profileWorker],'42501');});
test('jefe no puede alterar usuario de otro comercio',async()=>{await identity(bossA);await rejected("select public.update_employee($1,'Ataque','employee',false)",[profileB],'42501');});
test('cambio válido de configuración conserva anterior y posterior en auditoría',async()=>{
  await identity(bossA);await rows("select public.update_business('Nuevo nombre','Servicio propio','20345678901','#123abc','ayuda@example.test')");
  const b=(await rows('select * from public.businesses'))[0];assert.equal(b.name,'Nuevo nombre');assert.equal(b.currency,'ARS');
  const log=(await rows("select * from public.audit_logs where action='business.updated'"))[0];assert.equal(log.previous_values.name,'Comercio A');assert.equal(log.new_values.name,'Nuevo nombre');assert.equal(log.user_id,profileA);
});
test('entrada inválida falla sin modificación ni auditoría parcial',async()=>{
  await identity(bossA);await rejected("select public.update_business('X','Servicio','','#123abc','')",[],'23514');
  assert.equal((await rows('select name from public.businesses'))[0].name,'Comercio A');assert.equal((await rows("select * from public.audit_logs where action='business.updated'")).length,0);
});
test('no se puede desactivar al último jefe activo',async()=>{await identity(bossA);await rejected("select public.update_employee($1,'Jefe A','boss',false)",[profileA],'22023');});
test('no se puede degradar al último jefe activo',async()=>{await identity(bossA);await rejected("select public.update_employee($1,'Jefe A','employee',true)",[profileA],'22023');});
test('se puede transferir responsabilidad conservando un jefe activo y auditoría',async()=>{await identity(bossA);await rows("select public.update_employee($1,'Empleado A','boss',true)",[profileWorker]);await rows("select public.update_employee($1,'Jefe A','employee',true)",[profileA]);await identity(workerA);assert.equal((await rows("select * from public.profiles where role='boss' and active")).length,1);assert.equal((await rows("select * from public.audit_logs where action='employee.updated'")).length,2);});
test('desactivar empleado conserva historial y bloquea acceso con identidad todavía válida',async()=>{await identity(bossA);await rows("select public.update_employee($1,'Empleado A','employee',false)",[profileWorker]);await identity(workerA);assert.deepEqual(await rows('select * from public.profiles'),[]);assert.deepEqual(await rows('select * from public.businesses'),[]);await rejected('select public.record_login()',[],'42501');await db.exec('reset role');assert.equal((await rows('select count(*)::int as n from public.profiles where id=$1',[profileWorker]))[0].n,1);});
test('reactivar una cuenta devuelve acceso sin crear otro perfil',async()=>{await identity(bossA);await rows("select public.update_employee($1,'Empleado A','employee',false)",[profileWorker]);await rows("select public.update_employee($1,'Empleado A','employee',true)",[profileWorker]);await identity(workerA);assert.equal((await rows('select id from public.profiles'))[0].id,profileWorker);});
test('comercio desactivado no permite lecturas ni operaciones',async()=>{await db.query('update public.businesses set active=false where id=$1',[businessA]);await identity(bossA);assert.deepEqual(await rows('select * from public.profiles'),[]);await rejected("select public.create_employee_invitation('Persona','person@example.test')",[],'42501');});
test('auditoría no puede borrarse ni adulterarse',async()=>{await identity(bossA);await rejected('delete from public.audit_logs',[],'42501');await rejected("update public.audit_logs set action='falsa'",[],'42501');});
test('registro de acceso actualiza fecha y crea auditoría',async()=>{await identity(workerA);await rows('select public.record_login()');assert.ok((await rows('select last_login_at from public.profiles'))[0].last_login_at);await identity(bossA);assert.equal((await rows("select * from public.audit_logs where action='session.login'"))[0].user_id,profileWorker);});
test('empleado no puede crear invitaciones',async()=>{await identity(workerA);await rejected("select public.create_employee_invitation('Intruso','intruso@example.test')",[],'42501');});
test('aceptar invitación usa correo verificado de Auth y siempre asigna empleado',async()=>{
  await identity(bossA);const id=(await rows("select public.create_employee_invitation('Nueva persona',' OUTSIDER@example.test ') as id"))[0].id;
  await identity(outsider);const first=(await rows('select public.accept_employee_invitation() as id'))[0].id;const second=(await rows('select public.accept_employee_invitation() as id'))[0].id;
  assert.equal(first,second);const p=(await rows('select * from public.profiles'))[0];assert.equal(p.role,'employee');assert.equal(p.business_id,businessA);
  await identity(bossA);assert.equal((await rows('select status from public.employee_invitations where id=$1',[id]))[0].status,'accepted');assert.equal((await rows("select * from public.audit_logs where action='invitation.accepted'")).length,1);
});
test('otra identidad no puede apropiarse de una invitación',async()=>{await identity(bossA);await rows("select public.create_employee_invitation('Otra persona','other@example.test')");await identity(outsider);await rejected('select public.accept_employee_invitation()',[],'42501');});
test('correo sin confirmar no puede aceptar invitación',async()=>{await db.query('update auth.users set email_confirmed_at=null where id=$1',[outsider]);await identity(bossA);await rows("select public.create_employee_invitation('Persona','outsider@example.test')");await identity(outsider);await rejected('select public.accept_employee_invitation()',[],'42501');});
test('invitación vencida no permite crear perfil',async()=>{await identity(bossA);const id=(await rows("select public.create_employee_invitation('Persona','outsider@example.test') as id"))[0].id;await db.exec('reset role');await db.query("update public.employee_invitations set expires_at=now()-interval '1 second' where id=$1",[id]);await identity(outsider);await rejected('select public.accept_employee_invitation()',[],'42501');});
test('invitación revocada no permite crear perfil',async()=>{await identity(bossA);const id=(await rows("select public.create_employee_invitation('Persona','outsider@example.test') as id"))[0].id;await rows('select public.revoke_employee_invitation($1)',[id]);await identity(outsider);await rejected('select public.accept_employee_invitation()',[],'42501');});
test('jefe de otro comercio no puede revocar invitación',async()=>{await identity(bossA);const id=(await rows("select public.create_employee_invitation('Persona','outsider@example.test') as id"))[0].id;await identity(bossB);await rejected('select public.revoke_employee_invitation($1)',[id],'22023');});
test('no se crean dos invitaciones pendientes para el mismo correo',async()=>{await identity(bossA);await rows("select public.create_employee_invitation('Persona','outsider@example.test')");await rejected("select public.create_employee_invitation('Duplicado','OUTSIDER@example.test')",[],'23505');});
test('bootstrap no puede llamarse con clave pública o una sesión',async()=>{await identity(bossA);await rejected("select public.bootstrap_business($1,'outsider@example.test','Persona','Ataque')",[outsider],'42501');await identity('','anon');await rejected("select public.bootstrap_business($1,'outsider@example.test','Persona','Ataque')",[outsider],'42501');});
test('aprovisionamiento fallido no deja un comercio huérfano',async()=>{const before=(await rows('select count(*)::int as n from public.businesses'))[0].n;await rejected("select public.bootstrap_business($1,'boss-a@example.test','Duplicado','Comercio huérfano')",[bossA],'23505');assert.equal((await rows('select count(*)::int as n from public.businesses'))[0].n,before);});
test('limitador admite ocho intentos y rechaza el noveno',async()=>{await identity('','service_role');for(let i=0;i<8;i++)assert.equal((await rows('select public.consume_auth_attempt($1) as allowed',['a'.repeat(64)]))[0].allowed,true);assert.equal((await rows('select public.consume_auth_attempt($1) as allowed',['a'.repeat(64)]))[0].allowed,false);});
test('limitador vuelve a admitir intentos al vencer la ventana',async()=>{await identity('','service_role');for(let i=0;i<9;i++)await rows('select public.consume_auth_attempt($1)',['b'.repeat(64)]);await db.exec('reset role');await rows("update private.auth_attempts set window_start=now()-interval '16 minutes'");await identity('','service_role');assert.equal((await rows('select public.consume_auth_attempt($1) as allowed',['b'.repeat(64)]))[0].allowed,true);});
test('usuario no puede manipular limitador ni acceder a sus claves',async()=>{await identity(workerA);await rejected('select public.consume_auth_attempt($1)',['a'.repeat(64)],'42501');await rejected('select * from private.auth_attempts',[],'42501');});
test('campos inesperados de rol y valores nulos no evitan las validaciones',async()=>{await identity(bossA);await rejected("select public.update_employee($1,'Nombre','superadmin',true)",[profileWorker],'22023');await rejected("select public.update_employee($1,'Nombre',null,true)",[profileWorker],'22023');});
test('entrada SQL maliciosa se guarda como texto, sin ejecutarse',async()=>{await identity(bossA);const attack="Tienda'; DROP TABLE public.profiles; --";await rows("select public.update_business($1,'Servicio','','#123abc','')",[attack]);assert.equal((await rows('select name from public.businesses'))[0].name,attack);assert.equal((await rows('select * from public.profiles')).length,2);});
test('funciones de privilegios fijan search_path y no son ejecutables por PUBLIC',async()=>{const f=await rows("select proname,proconfig,proacl::text from pg_proc join pg_namespace n on n.oid=pronamespace where n.nspname in ('public','private') and prosecdef");assert.ok(f.length>10);assert.ok(f.every(x=>x.proconfig?.includes('search_path=""')));assert.ok(f.every(x=>!/(^|,)=[X]/.test(x.proacl)));});
