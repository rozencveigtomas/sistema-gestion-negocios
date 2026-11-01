import {createClient} from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret=process.env.SUPABASE_SECRET_KEY;
if(!url||!publicKey||!secret)throw Error('Falta configuración del servidor.');
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const admin=createClient(url,secret,options);
const stateFile='.local-data/remote-qa.json';
const state=JSON.parse(await readFile(stateFile,'utf8'));
if(state.project!==url||!state.users?.bossA||!state.users?.bossB||!state.users?.employeeA)throw Error('Primero ejecutá verify-remote.mjs para preparar el entorno QA.');

function ok(result,label){if(result.error)throw Error(`${label}: ${result.error.code||result.error.status||'error'} ${result.error.message||''}`);return result.data;}
function denied(result,label,codes=['42501','401']){assert.ok(result.error,`${label} debía ser rechazado`);if(codes.length)assert.ok(codes.includes(result.error.code)||codes.includes(String(result.error.status)),`${label}: código inesperado ${result.error.code||result.error.status}`);}
async function save(){await writeFile(stateFile,JSON.stringify(state),{mode:0o600});}
async function signIn(user){const client=createClient(url,publicKey,options);ok(await client.auth.signInWithPassword({email:user.email,password:user.password}),'iniciar sesión QA');return client;}
const bossA=await signIn(state.users.bossA),bossB=await signIn(state.users.bossB),employeeA=await signIn(state.users.employeeA);
state.inventory??={};
const suffix=state.run.slice(0,8);
async function catalog(kind,key,label,client=bossA){
  if(state.inventory[key])return state.inventory[key];
  const id=ok(await client.rpc('create_catalog_item',{p_kind:kind,p_name:`QA ${label} ${suffix}`,p_description:'Dato aislado para pruebas automatizadas'}),`crear ${label}`);
  state.inventory[key]=id;await save();return id;
}
const categoryA=await catalog('category','categoryA','categoría');
const locationA=await catalog('location','locationA','ubicación');
const supplierA=await catalog('supplier','supplierA','proveedor');
if(!state.inventory.productA){
  state.inventory.productA=ok(await bossA.rpc('create_product',{
    p_internal_identifier:`QA-${suffix}-P`,p_barcode:null,p_name:`Producto QA ${suffix}`,p_description:'Producto de prueba aislado',p_brand:'QA',
    p_category_id:categoryA,p_supplier_id:supplierA,p_color:'Azul',p_size:'M',p_model:'Modelo QA',p_variant:'Único',p_unit_of_measure:'unidad',
    p_cost_price:100,p_sale_price:250,p_initial_stock:10,p_minimum_stock:2,p_ideal_stock:20,p_location_id:locationA,p_expiration_date:null,p_internal_notes:'Nota privada QA'
  }),'crear producto QA');
  await save();
}
const productA=state.inventory.productA;
const product=()=>admin.from('products').select('id,business_id,current_stock,active,sale_price').eq('id',productA).single();
const before=ok(await product(),'leer producto QA');
const checks=[];
async function check(name,fn){await fn();checks.push(name);console.log(`OK ${name}`);}

await check('anónimo no lee productos',async()=>{denied(await createClient(url,publicKey,options).from('products').select('id'),'lectura anónima');});
await check('jefe ve producto, costo y proveedor de su comercio',async()=>{
  const p=ok(await bossA.from('products').select('id,name,current_stock').eq('id',productA).single(),'producto jefe');assert.equal(p.id,productA);
  const f=ok(await bossA.from('product_financials').select('cost_price,internal_notes').eq('product_id',productA),'costo jefe');assert.equal(f.length,1);assert.equal(f[0].cost_price,100);
  const s=ok(await bossA.from('suppliers').select('id,name').eq('id',supplierA),'proveedor jefe');assert.equal(s.length,1);
});
await check('empleado ve stock pero no costos ni proveedores',async()=>{
  const p=ok(await employeeA.from('products').select('id,current_stock').eq('id',productA),'producto empleado');assert.equal(p.length,1);
  assert.deepEqual(ok(await employeeA.from('product_financials').select('*').eq('product_id',productA),'costo empleado'),[]);
  assert.deepEqual(ok(await employeeA.from('suppliers').select('*').eq('id',supplierA),'proveedor empleado'),[]);
});
await check('otro comercio no ve ni puede mover producto ajeno',async()=>{
  assert.deepEqual(ok(await bossB.from('products').select('id').eq('id',productA),'aislamiento producto'),[]);
  denied(await bossB.rpc('adjust_stock',{p_product_id:productA,p_movement_type:'entry',p_quantity:1,p_reason:'purchase',p_notes:'',p_occurred_at:new Date().toISOString()}),'movimiento ajeno');
});
await check('escrituras directas de inventario están cerradas',async()=>{
  denied(await employeeA.from('products').update({current_stock:999}).eq('id',productA),'actualización directa stock');
  denied(await employeeA.from('product_financials').update({cost_price:0}).eq('product_id',productA),'actualización directa costo');
});
await check('dos entradas simultáneas conservan el cálculo',async()=>{
  const outcomes=await Promise.all([2,3].map(quantity=>employeeA.rpc('adjust_stock',{p_product_id:productA,p_movement_type:'entry',p_quantity:quantity,p_reason:'purchase',p_notes:'Entrada QA',p_occurred_at:new Date().toISOString()})));
  outcomes.forEach((result,index)=>ok(result,`entrada concurrente ${index+1}`));
  assert.equal(Number(ok(await product(),'stock posterior a entradas').current_stock),Number(before.current_stock)+5);
});
await check('empleado no registra motivos sensibles',async()=>{
  for(const reason of ['loss','correction','other'])denied(await employeeA.rpc('adjust_stock',{p_product_id:productA,p_movement_type:'exit',p_quantity:1,p_reason:reason,p_notes:'',p_occurred_at:new Date().toISOString()}),`motivo ${reason}`);
});
await check('tipo y motivo incompatibles son rechazados',async()=>{
  denied(await bossA.rpc('adjust_stock',{p_product_id:productA,p_movement_type:'entry',p_quantity:1,p_reason:'sale',p_notes:'',p_occurred_at:new Date().toISOString()}),'venta como entrada',['22023']);
  denied(await bossA.rpc('adjust_stock',{p_product_id:productA,p_movement_type:'exit',p_quantity:1,p_reason:'purchase',p_notes:'',p_occurred_at:new Date().toISOString()}),'compra como salida',['22023']);
});
await check('salida mayor al stock no cambia el estado',async()=>{
  const current=Number(ok(await product(),'stock previo').current_stock);
  denied(await employeeA.rpc('adjust_stock',{p_product_id:productA,p_movement_type:'exit',p_quantity:current+1,p_reason:'sale',p_notes:'',p_occurred_at:new Date().toISOString()}),'salida sin stock',['22023']);
  assert.equal(Number(ok(await product(),'stock tras rechazo').current_stock),current);
});
await check('jefe registra corrección con aprobación y auditoría',async()=>{
  const current=Number(ok(await product(),'stock antes corrección').current_stock);
  ok(await bossA.rpc('adjust_stock',{p_product_id:productA,p_movement_type:'entry',p_quantity:1,p_reason:'correction',p_notes:'Conteo QA',p_occurred_at:new Date().toISOString()}),'corrección jefe');
  const movement=ok(await admin.from('inventory_movements').select('approved_by,resulting_stock').eq('product_id',productA).eq('reason','correction').order('created_at',{ascending:false}).limit(1).single(),'movimiento corrección');
  assert.equal(movement.approved_by,state.users.bossA.profileId);assert.equal(Number(movement.resulting_stock),current+1);
  const audits=ok(await admin.from('audit_logs').select('action').eq('entity_id',productA).eq('action','stock.entry'),'auditoría stock');assert.ok(audits.length>=1);
});
await check('salida de venta actualiza stock y movimiento',async()=>{
  const current=Number(ok(await product(),'stock antes venta').current_stock);
  ok(await employeeA.rpc('adjust_stock',{p_product_id:productA,p_movement_type:'exit',p_quantity:4,p_reason:'sale',p_notes:'Venta QA',p_occurred_at:new Date().toISOString()}),'venta QA');
  assert.equal(Number(ok(await product(),'stock después venta').current_stock),current-4);
});
await check('empleado no crea catálogo ni archiva productos',async()=>{
  denied(await employeeA.rpc('create_catalog_item',{p_kind:'category',p_name:`Intrusa ${suffix}`,p_description:''}),'catálogo empleado');
  denied(await employeeA.rpc('set_product_active',{p_product_id:productA,p_active:false}),'archivo empleado');
});
await check('archivar conserva historial y bloquea movimientos',async()=>{
  ok(await bossA.rpc('set_product_active',{p_product_id:productA,p_active:false}),'archivar producto');
  assert.deepEqual(ok(await employeeA.from('products').select('id').eq('id',productA),'producto archivado empleado'),[]);
  denied(await employeeA.rpc('adjust_stock',{p_product_id:productA,p_movement_type:'entry',p_quantity:1,p_reason:'purchase',p_notes:'',p_occurred_at:new Date().toISOString()}),'movimiento archivado');
  const history=ok(await admin.from('inventory_movements').select('id').eq('product_id',productA),'historial archivado');assert.ok(history.length>=4);
  ok(await bossA.rpc('set_product_active',{p_product_id:productA,p_active:true}),'reactivar producto');
});
await check('SKU y referencias de otro comercio no se aceptan',async()=>{
  const categoryB=await catalog('category','categoryB','categoría B',bossB);
  const locationB=await catalog('location','locationB','ubicación B',bossB);
  const duplicate=await bossA.rpc('create_product',{p_internal_identifier:`qa-${suffix}-p`,p_barcode:null,p_name:'Duplicado QA',p_description:'',p_brand:'',p_category_id:categoryA,p_supplier_id:null,p_color:'',p_size:'',p_model:'',p_variant:'',p_unit_of_measure:'unidad',p_cost_price:1,p_sale_price:2,p_initial_stock:0,p_minimum_stock:0,p_ideal_stock:null,p_location_id:locationA,p_expiration_date:null,p_internal_notes:''});
  denied(duplicate,'SKU duplicado',['23505']);
  const cross=await bossA.rpc('create_product',{p_internal_identifier:`QA-${suffix}-X`,p_barcode:null,p_name:'Cruce QA',p_description:'',p_brand:'',p_category_id:categoryB,p_supplier_id:null,p_color:'',p_size:'',p_model:'',p_variant:'',p_unit_of_measure:'unidad',p_cost_price:1,p_sale_price:2,p_initial_stock:0,p_minimum_stock:0,p_ideal_stock:null,p_location_id:locationB,p_expiration_date:null,p_internal_notes:''});
  denied(cross,'referencia cruzada',['23503']);
});

const finalProduct=ok(await product(),'estado final producto');
const movementCountResult=await admin.from('inventory_movements').select('id',{count:'exact',head:true}).eq('product_id',productA);
ok(movementCountResult,'contar movimientos');
state.inventory.lastStock=finalProduct.current_stock;await save();
await writeFile('.local-data/remote-inventory-results.json',JSON.stringify({date:new Date().toISOString(),passed:checks.length,checks,productId:productA,movementCount:movementCountResult.count},null,2));
console.log(`${checks.length} comprobaciones remotas de inventario aprobadas. Datos QA aislados y marcados is_demo; no se enviaron correos.`);
