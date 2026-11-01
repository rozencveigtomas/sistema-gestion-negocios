import {createClient} from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret=process.env.SUPABASE_SECRET_KEY;
if(!url||!publicKey||!secret)throw Error('Falta configuración del servidor.');
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const admin=createClient(url,secret,options);
const state=JSON.parse(await readFile('.local-data/remote-qa.json','utf8'));
if(state.project!==url||!state.users?.bossA||!state.users?.bossB||!state.users?.employeeA)throw Error('Primero ejecutá la QA remota de inventario.');
function ok(result,label){if(result.error)throw Error(label+': '+(result.error.code||result.error.status||'error')+' '+(result.error.message||''));return result.data;}
function denied(result,label,codes=['42501','401','22023']){assert.ok(result.error,label+' debía ser rechazado');assert.ok(codes.includes(result.error.code)||codes.includes(String(result.error.status)),label+': código inesperado '+(result.error.code||result.error.status));}
async function signIn(user){const client=createClient(url,publicKey,options);ok(await client.auth.signInWithPassword({email:user.email,password:user.password}),'iniciar sesión QA');return client;}
const bossA=await signIn(state.users.bossA);
const bossB=await signIn(state.users.bossB);
const employeeA=await signIn(state.users.employeeA);
const businessA=state.businesses.A;
const run=randomUUID();
const amount=1250;
const due=new Date(Date.now()+5*24*60*60*1000).toISOString();
const paidAt=new Date().toISOString();
const checks=[];
async function check(name,fn){await fn();checks.push(name);console.log('OK '+name);}

let subscriptionId;
let firstPaymentId;
await check('el jefe configura el plan y queda próximo a vencer',async()=>{
  subscriptionId=ok(await bossA.rpc('update_subscription_settings',{p_plan_name:'Plan QA '+run.slice(0,8),p_monthly_amount:amount,p_payment_url:'https://pay.example.invalid/qa',p_next_due_at:due,p_grace_period_days:7}),'configurar suscripción');
  const row=ok(await admin.from('subscriptions').select('business_id,monthly_amount,payment_url,status,grace_period_days').eq('id',subscriptionId).single(),'leer suscripción');
  assert.equal(row.business_id,businessA);assert.equal(Number(row.monthly_amount),amount);assert.equal(row.payment_url,'https://pay.example.invalid/qa');assert.equal(row.status,'due_soon');assert.equal(row.grace_period_days,7);
});
await check('el empleado y otro comercio quedan aislados',async()=>{
  assert.deepEqual(ok(await employeeA.from('subscriptions').select('id'),'suscripción empleado'),[]);
  denied(await employeeA.rpc('update_subscription_settings',{p_plan_name:'Intruso',p_monthly_amount:1,p_payment_url:'https://intruso.invalid',p_next_due_at:null,p_grace_period_days:7}),'configuración empleado',['42501']);
  assert.deepEqual(ok(await bossB.from('subscriptions').select('id'),'suscripción ajena'),[]);
});
await check('el importe incorrecto se rechaza y el comprobante válido queda pendiente',async()=>{
  denied(await bossA.rpc('submit_subscription_payment',{p_amount:amount-1,p_payment_method:'lemon',p_external_reference:'mismatch-'+run,p_receipt_url:'https://files.example.invalid/qa',p_paid_at:paidAt,p_notes:'Debe rechazarse'}),'importe distinto',['22023']);
  firstPaymentId=ok(await bossA.rpc('submit_subscription_payment',{p_amount:amount,p_payment_method:'transfer',p_external_reference:'pending-'+run,p_receipt_url:'https://files.example.invalid/qa',p_paid_at:paidAt,p_notes:'Pendiente QA'}),'enviar pago');
  const payment=ok(await admin.from('subscription_payments').select('status,amount,submitted_by').eq('id',firstPaymentId).single(),'leer pago pendiente');
  assert.equal(payment.status,'pending');assert.equal(Number(payment.amount),amount);assert.equal(payment.submitted_by,state.users.bossA.profileId);
  assert.equal((await admin.from('subscriptions').select('status,next_due_at').eq('id',subscriptionId).single()).data.status,'due_soon');
});
await check('solo el jefe puede revisar y rechazar un pago',async()=>{
  denied(await employeeA.rpc('verify_subscription_payment',{p_payment_id:firstPaymentId,p_approve:true,p_notes:'Intento empleado'}),'verificación empleado',['42501']);
  ok(await bossA.rpc('verify_subscription_payment',{p_payment_id:firstPaymentId,p_approve:false,p_notes:'No acreditado QA'}),'rechazar pago');
  const payment=ok(await admin.from('subscription_payments').select('status,verified_by,verified_at,notes').eq('id',firstPaymentId).single(),'leer pago rechazado');
  assert.equal(payment.status,'rejected');assert.equal(payment.verified_by,state.users.bossA.profileId);assert.ok(payment.verified_at);assert.equal(payment.notes,'No acreditado QA');
  assert.equal((await admin.from('subscriptions').select('status').eq('id',subscriptionId).single()).data.status,'due_soon');
});
await check('la confirmación actualiza el vencimiento y deja auditoría',async()=>{
  const second=ok(await bossA.rpc('submit_subscription_payment',{p_amount:amount,p_payment_method:'cash',p_external_reference:'verified-'+run,p_receipt_url:null,p_paid_at:paidAt,p_notes:'Acreditado QA'}),'enviar segundo pago');
  ok(await bossA.rpc('verify_subscription_payment',{p_payment_id:second,p_approve:true,p_notes:'Confirmado QA'}),'confirmar pago');
  const payment=ok(await admin.from('subscription_payments').select('status,verified_by,verified_at,notes').eq('id',second).single(),'leer pago confirmado');
  assert.equal(payment.status,'verified');assert.equal(payment.verified_by,state.users.bossA.profileId);assert.ok(payment.verified_at);assert.equal(payment.notes,'Confirmado QA');
  const subscription=ok(await admin.from('subscriptions').select('status,last_paid_at,next_due_at').eq('id',subscriptionId).single(),'leer vencimiento');
  assert.equal(subscription.status,'active');assert.ok(subscription.last_paid_at);assert.ok(subscription.next_due_at);assert.ok(new Date(subscription.next_due_at)>new Date(paidAt));
  const audits=ok(await admin.from('audit_logs').select('action').eq('entity_id',second),'auditoría de pago');
  assert.ok(audits.some(x=>x.action==='subscription.payment_submitted'));assert.ok(audits.some(x=>x.action==='subscription.payment_verified'));
});
await check('las escrituras directas y enlaces inseguros siguen bloqueados',async()=>{
  denied(await bossA.from('subscriptions').insert({business_id:businessA,plan_name:'Ataque'}),'insertar suscripción',['42501']);
  denied(await bossA.from('subscription_payments').insert({business_id:businessA,subscription_id:subscriptionId,amount,payment_method:'cash',submitted_by:state.users.bossA.profileId}),'insertar pago',['42501']);
  denied(await bossA.rpc('update_subscription_settings',{p_plan_name:'Plan inseguro',p_monthly_amount:amount,p_payment_url:'http://inseguro.invalid',p_next_due_at:due,p_grace_period_days:7}),'enlace inseguro',['22023']);
  denied(await bossA.rpc('verify_subscription_payment',{p_payment_id:randomUUID(),p_approve:true,p_notes:null}),'pago inexistente',['22023']);
});
await check('las lecturas anónimas permanecen cerradas',async()=>{
  const anon=createClient(url,publicKey,options);
  denied(await anon.from('subscriptions').select('id'),'anónimo suscripciones',['42501','401']);
  denied(await anon.from('subscription_payments').select('id'),'anónimo pagos',['42501','401']);
});
await writeFile('.local-data/remote-subscriptions-results.json',JSON.stringify({date:new Date().toISOString(),passed:checks.length,checks,subscriptionId,migration:'202609160007_subscriptions'},null,2));
console.log(checks.length+' comprobaciones remotas de suscripción aprobadas. Datos QA aislados y marcados is_demo; no se enviaron correos.');
