import {before,after,beforeEach,afterEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const bossA='10000000-0000-4000-8000-000000000001',workerA='10000000-0000-4000-8000-000000000002',bossB='20000000-0000-4000-8000-000000000001';
let businessA:string,businessB:string,categoryA:string,locationA:string,productA:string;
async function rows(sql:string,params:unknown[]=[]){return(await db.query<Record<string,any>>(sql,params)).rows;}
async function identity(id:string,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);await db.exec(`set local role ${role}`);}
async function rejected(sql:string,params:unknown[]=[],code?:string){await db.exec('savepoint x');let e:any;try{await db.query(sql,params);}catch(x){e=x;}await db.exec('rollback to savepoint x');assert.ok(e);if(code)assert.equal(e.code,code);}
before(async()=>{
 await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
 for(const f of['supabase/migrations/202609150001_foundation.sql','supabase/migrations/202609160002_inventory.sql','supabase/migrations/202609160009_quantity_hardening.sql'])await db.exec(await readFile(f,'utf8'));
 await db.query(`insert into auth.users values($1,'boss-a@test',now()),($2,'worker-a@test',now()),($3,'boss-b@test',now())`,[bossA,workerA,bossB]);
 businessA=(await rows(`select public.bootstrap_business($1,'boss-a@test','Jefe A','Comercio A') id`,[bossA]))[0].id;
 businessB=(await rows(`select public.bootstrap_business($1,'boss-b@test','Jefe B','Comercio B') id`,[bossB]))[0].id;
 await rows(`insert into profiles(business_id,auth_user_id,name,email,role)values($1,$2,'Empleado','worker-a@test','employee')returning id`,[businessA,workerA]);
 await db.exec('begin');await identity(bossA);categoryA=(await rows(`select public.create_catalog_item('category','Ropa','') id`))[0].id;locationA=(await rows(`select public.create_catalog_item('location','Salón','') id`))[0].id;
 productA=(await rows(`select public.create_product('SKU-1','','Remera','','',$1,null,'Negro','M','','','unidad',100,250,10,2,20,$2,null,'Costo privado') id`,[categoryA,locationA]))[0].id;await db.exec('reset role;commit');
});
beforeEach(async()=>{await db.exec('begin');});afterEach(async()=>{await db.exec('rollback;reset role');});after(async()=>db.close());
test('todas las tablas de inventario tienen RLS',async()=>{const t=await rows("select tablename,rowsecurity from pg_tables where schemaname='public' and tablename in('categories','locations','suppliers','products','product_financials','inventory_movements')");assert.equal(t.length,6);assert.ok(t.every(x=>x.rowsecurity));});
test('anónimo no lee el catálogo',async()=>{await identity('','anon');for(const t of['products','inventory_movements','product_financials'])await rejected(`select * from ${t}`,[],'42501');});
test('empleado ve productos y movimientos pero no costos ni proveedores',async()=>{await identity(workerA);assert.equal((await rows('select * from products')).length,1);assert.equal((await rows('select * from inventory_movements')).length,1);assert.deepEqual(await rows('select * from product_financials'),[]);assert.deepEqual(await rows('select * from suppliers'),[]);});
test('otro comercio no puede leer ni mover stock ajeno',async()=>{await identity(bossB);assert.deepEqual(await rows('select * from products'),[]);await rejected(`select public.adjust_stock($1,'entry',2,'purchase','',now())`,[productA],'42501');});
test('escrituras directas no pueden alterar stock ni costos',async()=>{await identity(bossA);await rejected('update products set current_stock=999',[],'42501');await rejected('update product_financials set cost_price=0',[],'42501');});
test('entrada y salida actualizan stock, movimientos y auditoría',async()=>{await identity(workerA);assert.equal((await rows(`select public.adjust_stock($1,'entry',5,'purchase','Compra',now()) stock`,[productA]))[0].stock,'15.000');assert.equal((await rows(`select public.adjust_stock($1,'exit',3,'sale','Venta',now()) stock`,[productA]))[0].stock,'12.000');assert.equal((await rows('select current_stock from products'))[0].current_stock,'12.000');assert.equal((await rows('select count(*)::int n from inventory_movements'))[0].n,3);await identity(bossA);assert.equal((await rows("select count(*)::int n from audit_logs where action in('stock.entry','stock.exit')"))[0].n,2);});
test('salida mayor al stock revierte sin movimiento parcial',async()=>{await identity(workerA);const before=(await rows('select count(*)::int n from inventory_movements'))[0].n;await rejected(`select public.adjust_stock($1,'exit',11,'sale','',now())`,[productA],'22023');assert.equal((await rows('select current_stock from products'))[0].current_stock,'10.000');assert.equal((await rows('select count(*)::int n from inventory_movements'))[0].n,before);});
test('empleado no registra pérdida, corrección ni otro',async()=>{await identity(workerA);for(const reason of['loss','correction','other'])await rejected(`select public.adjust_stock($1,'exit',1,$2,'',now())`,[productA,reason],'42501');});
test('motivo y tipo de movimiento deben ser compatibles',async()=>{await identity(bossA);await rejected(`select public.adjust_stock($1,'entry',1,'sale','',now())`,[productA],'22023');await rejected(`select public.adjust_stock($1,'exit',1,'purchase','',now())`,[productA],'22023');});
test('jefe registra corrección con aprobación identificada',async()=>{await identity(bossA);await rows(`select public.adjust_stock($1,'entry',2,'correction','Conteo',now())`,[productA]);const m=(await rows("select * from inventory_movements where reason='correction'"))[0];assert.ok(m.approved_by);assert.equal(m.resulting_stock,'12.000');});
test('SKU es único por comercio',async()=>{await identity(bossA);await rejected(`select public.create_product('sku-1','','Otra','','',$1,null,'','','','','unidad',1,2,0,0,null,$2,null,'')`,[categoryA,locationA],'23505');});
test('categorías de otro comercio no se asocian a productos',async()=>{await identity(bossB);const c=(await rows(`select public.create_catalog_item('category','Otra','') id`))[0].id;const l=(await rows(`select public.create_catalog_item('location','Otra','') id`))[0].id;await identity(bossA);await rejected(`select public.create_product('SKU-X','','Ataque','','',$1,null,'','','','','unidad',1,2,0,0,null,$2,null,'')`,[c,l],'23503');});
test('archivar conserva historial y bloquea movimientos',async()=>{await identity(bossA);await rows('select public.set_product_active($1,false)',[productA]);assert.equal((await rows('select active from products'))[0].active,false);assert.equal((await rows('select count(*)::int n from inventory_movements'))[0].n,1);await rejected(`select public.adjust_stock($1,'entry',1,'purchase','',now())`,[productA],'42501');});
test('empleado no crea catálogo ni archiva productos',async()=>{await identity(workerA);await rejected('select public.set_product_active($1,false)',[productA],'42501');await rejected(`select public.create_catalog_item('category','Intrusa','')`,[],'42501');});
test('funciones nuevas fijan search_path y no pertenecen a PUBLIC',async()=>{const f=await rows("select proname,proconfig,proacl::text from pg_proc join pg_namespace n on n.oid=pronamespace where n.nspname='public' and proname in('create_catalog_item','create_product','adjust_stock','set_product_active')");assert.equal(f.length,4);assert.ok(f.every(x=>x.proconfig?.includes('search_path=\"\"')));assert.ok(f.every(x=>!/(^|,)=[X]/.test(x.proacl)));});
test('las unidades discretas exigen enteros y las medidas admiten decimales',async()=>{
 await identity(bossA);
 await rejected(`select public.create_product('SKU-FRAC','','Fraccionado','','',$1,null,'','','','','unidad',1,2,1.5,0,null,$2,null,'')`,[categoryA,locationA],'22023');
 await rejected(`select public.adjust_stock($1,'entry',0.5,'purchase','',now())`,[productA],'22023');
 const measured=(await rows(`select public.create_product('SKU-KG','','Medido','','',$1,null,'','','','','kg',1,2,1.5,0,null,$2,null,'') id`,[categoryA,locationA]))[0].id;
 assert.equal((await rows(`select public.adjust_stock($1,'entry',0.25,'purchase','',now()) stock`,[measured]))[0].stock,'1.750');
});


