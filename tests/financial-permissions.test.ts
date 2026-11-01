import {before,after,beforeEach,afterEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const db=new PGlite();
const boss='91000000-0000-4000-8000-000000000001';
const employee='91000000-0000-4000-8000-000000000002';
let business:string,product:string,sale:string;
async function rows(sql:string,params:unknown[]=[]){return(await db.query<Record<string,any>>(sql,params)).rows;}
async function identity(id:string,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);await db.exec(`set local role ${role}`);}
async function rejected(sql:string,params:unknown[]=[],code='42501'){await db.exec('savepoint x');let error:any;try{await db.query(sql,params);}catch(value){error=value;}await db.exec('rollback to savepoint x');assert.ok(error);assert.equal(error.code,code);}
before(async()=>{
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
  for(const file of['supabase/migrations/202609150001_foundation.sql','supabase/migrations/202609160002_inventory.sql','supabase/migrations/202609160003_operations.sql','supabase/migrations/202609160008_financial_column_permissions.sql','supabase/migrations/202609160009_quantity_hardening.sql'])await db.exec(await readFile(file,'utf8'));
  await db.query(`insert into auth.users values($1,'boss@test',now()),($2,'employee@test',now())`,[boss,employee]);
  business=(await rows(`select public.bootstrap_business($1,'boss@test','Jefe','Comercio') id`,[boss]))[0].id;
  await rows(`insert into profiles(business_id,auth_user_id,name,email,role)values($1,$2,'Empleado','employee@test','employee')`,[business,employee]);
  await db.exec('begin');await identity(boss);
  const category=(await rows(`select public.create_catalog_item('category','Categoría','') id`))[0].id;
  const location=(await rows(`select public.create_catalog_item('location','Local','') id`))[0].id;
  product=(await rows(`select public.create_product('SKU-FIN','','Producto','','',$1,null,'','','','','unidad',100,250,3,0,null,$2,null,'') id`,[category,location]))[0].id;
  sale=(await rows(`select public.create_sale('91000000-0000-4000-8000-000000000001',$1,'cash') id`,[JSON.stringify([{product_id:product,quantity:1}])]))[0].id;
  await db.exec('reset role;commit');
  await db.exec('begin');await identity(employee);
  sale=(await rows(`select public.create_sale('91000000-0000-4000-8000-000000000002',$1,'cash') id`,[JSON.stringify([{product_id:product,quantity:1}])]))[0].id;
  await db.exec('reset role;commit');
});
beforeEach(async()=>db.exec('begin'));afterEach(async()=>{await db.exec('rollback;reset role');});after(async()=>db.close());

test('empleado puede leer total operativo pero no costo de venta',async()=>{
  await identity(employee);
  assert.equal((await rows('select id,total from sales where id=$1',[sale]))[0].id,sale);
  await rejected('select cost_total from sales where id=$1',[sale]);
  await rejected('select unit_cost from sale_items where sale_id=$1',[sale]);
});
test('jefe obtiene costo solo por la vista autorizada',async()=>{
  await identity(boss);
  await rejected('select cost_total from sales where id=$1',[sale]);
  const financial=(await rows('select id,cost_total from boss_sales_financials where id=$1',[sale]))[0];
  assert.equal(financial.id,sale);assert.equal(financial.cost_total,'100.00');
});
test('la vista financiera no devuelve filas a empleado ni anónimo',async()=>{
  await identity(employee);assert.deepEqual(await rows('select id,cost_total from boss_sales_financials'),[]);
  await identity('','anon');await rejected('select id,cost_total from boss_sales_financials');
});




