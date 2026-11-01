import {createClient} from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(!url||!publicKey)throw Error('Falta configuración pública.');
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const state=JSON.parse(await readFile('.local-data/remote-qa.json','utf8'));
async function signIn(user){const client=createClient(url,publicKey,options);const result=await client.auth.signInWithPassword({email:user.email,password:user.password});if(result.error)throw Error('No se pudo iniciar QA: '+result.error.message);return client;}
const bossA=await signIn(state.users.bossA),bossB=await signIn(state.users.bossB),employeeA=await signIn(state.users.employeeA);
const tests=[];function check(name,fn){return Promise.resolve(fn()).then(()=>{tests.push(name);console.log('OK '+name);});}
const own=await employeeA.from('sales').select('id,total').limit(1);
if(own.error)throw Error('El empleado no pudo leer su total operativo: '+own.error.message);
const saleId=own.data?.[0]?.id;
await check('empleado no puede leer costo total ni costo unitario',async()=>{
  assert.ok(saleId,'La QA necesita una venta propia.');
  const sale=await employeeA.from('sales').select('cost_total').eq('id',saleId);
  assert.ok(sale.error,'cost_total no debe estar disponible para empleado');
  const item=await employeeA.from('sale_items').select('unit_cost').eq('sale_id',saleId);
  assert.ok(item.error,'unit_cost no debe estar disponible para empleado');
});
await check('jefe obtiene costos mediante la vista autorizada',async()=>{
  const view=await bossA.from('boss_sales_financials').select('id,cost_total').eq('id',saleId);
  assert.ifError(view.error);assert.equal(view.data?.[0]?.id,saleId);assert.ok(Number(view.data?.[0]?.cost_total)>=0);
});
await check('la vista financiera queda aislada por comercio y rol',async()=>{
  const employeeView=await employeeA.from('boss_sales_financials').select('id,cost_total');assert.ifError(employeeView.error);assert.deepEqual(employeeView.data,[]);
  const bossBView=await bossB.from('boss_sales_financials').select('id,cost_total');assert.ifError(bossBView.error);assert.deepEqual(bossBView.data,[]);
});
const anon=createClient(url,publicKey,options);
await check('anónimo no puede leer la vista financiera',async()=>{const result=await anon.from('boss_sales_financials').select('id,cost_total');assert.ok(result.error);});
console.log(tests.length+' comprobaciones remotas de columnas financieras aprobadas. No se modificaron datos.');
