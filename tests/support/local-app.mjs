// Local UI fixture. It never reads .env.local or contacts the real Supabase project.
import http from 'node:http';
import {spawn} from 'node:child_process';

const id = n => '10000000-0000-4000-8000-' + String(n).padStart(12, '0');
const business = {id: id(10), name: 'Comercio de prueba', service_name: 'Gestión', brand_color: '#066d79', currency: 'ARS', timezone: 'America/Argentina/Buenos_Aires', support_email: null, tax_identifier: null, is_demo: true};
const users = {boss: {id: id(1), email: 'boss@local.invalid'}, employee: {id: id(2), email: 'employee@local.invalid'}};
const profiles = Object.entries(users).map(([role, user]) => ({id: id(role === 'boss' ? 11 : 12), auth_user_id: user.id, business_id: business.id, role, active: true, name: role === 'boss' ? 'Jefe QA' : 'Empleado QA', email: user.email, last_login_at: null}));
let sequence = 100;
let tables;
function reset() {
  tables = {
    businesses: [business], profiles,
    categories: [{id: id(20), name: 'Ropa', active: true}],
    locations: [{id: id(21), name: 'Salón', active: true}], suppliers: [],
    products: [
      {id: id(30), name: 'Remera', internal_identifier: 'REM-1', current_stock: 10, minimum_stock: 0, sale_price: 200, unit_of_measure: 'unidad', active: true, categories: {name: 'Ropa'}, locations: {name: 'Salón'}, color: 'Negro', size: 'M'},
      {id: id(31), name: 'Tela', internal_identifier: 'TEL-1', current_stock: 5, minimum_stock: 0, sale_price: 100, unit_of_measure: 'm', active: true, categories: {name: 'Ropa'}, locations: {name: 'Salón'}},
    ],
    product_financials: [{product_id: id(30), cost_price: 50}, {product_id: id(31), cost_price: 10}],
    sales: [], sale_items: [], returns: [], expenses: [], offers: [], inventory_sessions: [], inventory_count_items: [],
    inventory_movements: [], daily_summaries: [], employee_invitations: [],
  };
}
reset();
const jwt = role => {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return encode({alg: 'HS256', typ: 'JWT'}) + '.' + encode({sub: users[role].id, email: users[role].email, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600}) + '.local-test';
};
const api = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:54329');
  let raw = '';
  for await (const chunk of request) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const reply = (data, status = 200) => {
    response.writeHead(status, {'content-type': 'application/json', 'content-range': '0-0/0', ...response.getHeaders()});
    response.end(JSON.stringify(data));
  };
  let userRole = 'employee';
  try {userRole = JSON.parse(Buffer.from((request.headers.authorization ?? '').split('.')[1], 'base64url').toString()).sub === users.boss.id ? 'boss' : 'employee';} catch {}
  if (url.pathname === '/reset') {reset(); return reply({ok: true});}
  if (url.pathname === '/auth/v1/token') {
    const role = body.email === users.boss.email ? 'boss' : 'employee';
    if (!Object.values(users).some(user => user.email === body.email) || body.password !== 'local-test-password-123') return reply({msg: 'Invalid credentials'}, 400);
    return reply({access_token: jwt(role), refresh_token: 'local-' + role, token_type: 'bearer', expires_in: 3600, user: {...users[role], aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}}});
  }
  if (url.pathname === '/auth/v1/user') return reply({...users[userRole], aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}});
  if (url.pathname === '/auth/v1/logout') return reply({});
  const rpc = url.pathname.split('/rpc/')[1];
  if (rpc) {
    const uid = id(sequence++);
    const now = new Date().toISOString();
    const product = tables.products.find(item => item.id === body.p_product_id);
    if (['consume_auth_attempt', 'record_login'].includes(rpc)) return reply(rpc === 'consume_auth_attempt' ? true : null);
    if (rpc === 'create_catalog_item') {
      const table = {category: 'categories', location: 'locations', supplier: 'suppliers'}[body.p_kind];
      tables[table].push({id: uid, name: body.p_name, active: true}); return reply(uid);
    }
    if (rpc === 'create_product') {
      tables.products.push({id: uid, internal_identifier: body.p_internal_identifier, name: body.p_name, current_stock: body.p_initial_stock, minimum_stock: 0, sale_price: body.p_sale_price, unit_of_measure: body.p_unit_of_measure, color: body.p_color, size: body.p_size, active: true, categories: {name: 'Ropa'}, locations: {name: 'Salón'}});
      tables.product_financials.push({product_id: uid, cost_price: body.p_cost_price}); return reply(uid);
    }
    if (rpc === 'adjust_stock') {
      if (!product || body.p_notes === undefined || !['purchase', 'damage', 'internal_use', 'correction'].includes(body.p_reason)) return reply({code: '22023', message: 'Invalid movement'}, 400);
      product.current_stock += body.p_movement_type === 'entry' ? body.p_quantity : -body.p_quantity;
      tables.inventory_movements.unshift({id: uid, product_id: product.id, quantity: body.p_quantity, movement_type: body.p_movement_type, reason: body.p_reason, resulting_stock: product.current_stock, occurred_at: now, profiles: {name: profiles.find(profile => profile.role === userRole).name}});
      return reply(product.current_stock);
    }
    if (rpc === 'set_product_active') {product.active = body.p_active; return reply(null);}
    if (rpc === 'create_sale') {
      let total = 0;
      for (const line of body.p_items) {const item = tables.products.find(item => item.id === line.product_id); if (!item || item.current_stock < line.quantity) return reply({code: '22023', message: 'stock insuficiente'}, 400); total += item.sale_price * line.quantity;}
      for (const line of body.p_items) {const item=tables.products.find(item => item.id === line.product_id); item.current_stock -= line.quantity; tables.sale_items.push({id:id(sequence++),sale_id:uid,product_id:item.id,quantity:line.quantity,final_unit_price:item.sale_price,products:item,sales:{status:'completed',occurred_at:now}});}
      tables.sales.unshift({id: uid, total, status: 'completed', payment_method: body.p_payment_method, occurred_at: now, seller_id: profiles.find(profile => profile.role === userRole).id, profiles: {name: profiles.find(profile => profile.role === userRole).name}});
      return reply(uid);
    }
    if (rpc === 'create_return') {
      const sold=tables.sale_items.find(item=>item.id===body.p_sale_item_id);
      if (!sold || body.p_quantity>sold.quantity) return reply({code:'22023',message:'Invalid quantity'},400);
      if(body.p_disposition==='reenter') tables.products.find(item=>item.id===sold.product_id).current_stock+=body.p_quantity;
      tables.returns.unshift({id:uid,product_id:sold.product_id,quantity:body.p_quantity,refund_amount:body.p_refund_amount,disposition:body.p_disposition,reason:body.p_reason,status:'completed',occurred_at:now,products:sold.products});
      return reply(uid);
    }
    if (rpc === 'create_offer') {
      if (body.p_priority !== 0 || body.p_discount_type !== 'percent') return reply({code: '22023'}, 400);
      tables.offers.unshift({id: uid, name: body.p_name, scope: body.p_scope, value: body.p_value, starts_at: body.p_starts_at, ends_at: body.p_ends_at, active: true, discount_type: 'percent', products: {name: 'Remera'}}); return reply(uid);
    }
    if (rpc === 'set_offer_active') {tables.offers.find(item => item.id === body.p_offer_id).active = body.p_active; return reply(null);}
    if (rpc === 'create_expense') {tables.expenses.unshift({id: uid, concept: body.p_concept, category: body.p_category, amount: body.p_amount, status: body.p_status, occurred_at: now}); return reply(uid);}
    if (rpc === 'create_inventory_session') {
      tables.inventory_sessions.unshift({id: uid, name: body.p_name, status: 'preparation', pause_sales: true, created_at: now});
      for (const pid of body.p_product_ids) {const item = tables.products.find(item => item.id === pid); tables.inventory_count_items.push({id: id(sequence++), session_id: uid, product_id: pid, expected_stock: item.current_stock, final_count: null, first_count: null, second_count: null, difference: null, products: item});}
      return reply(uid);
    }
    const session = tables.inventory_sessions.find(item => item.id === body.p_session_id);
    if (rpc === 'start_inventory_session') {session.status = 'in_progress'; return reply(null);}
    if (rpc === 'record_inventory_count') {
      const item = tables.inventory_count_items.find(item => item.session_id === body.p_session_id && item.product_id === body.p_product_id);
      item.final_count = item.first_count = body.p_first_count; item.difference = item.final_count - item.expected_stock; return reply(null);
    }
    if (rpc === 'submit_inventory_session') {session.status = 'pending_approval'; return reply(null);}
    if (rpc === 'approve_inventory_session') {session.status = body.p_approve ? 'completed' : 'recount'; return reply(null);}
    if (rpc === 'generate_daily_summary') {tables.daily_summaries = [{id: uid, net_sales: 400, cost_of_goods: 100, expenses: 50, refunds: 0, estimated_profit: 250, sales_count: 2}]; return reply(uid);}
    return reply({code: 'FIXTURE_UNSUPPORTED_RPC', message: rpc}, 400);
  }
  const table = url.pathname.split('/rest/v1/')[1];
  if (!tables[table]) return reply({message: 'Unsupported fixture table'}, 404);
  let rows = tables[table];
  if (userRole !== 'boss') {
    if (table === 'profiles') rows = rows.filter(row => row.role === 'employee');
    if (['product_financials', 'suppliers'].includes(table)) rows = [];
    if (table === 'sales') rows = rows.filter(row => row.seller_id === id(12));
  }
  for (const [field, filter] of url.searchParams) {
    if (filter.startsWith('eq.')) rows = rows.filter(row => String(row[field]) === filter.slice(3));
    if (filter.startsWith('in.(')) rows = rows.filter(row => filter.slice(4, -1).split(',').includes(String(row[field])));
  }
  if (request.method === 'HEAD') {response.setHeader('content-range', '0-0/' + rows.length); return reply(null);}
  if ((request.headers.accept ?? '').includes('vnd.pgrst.object')) return reply(rows[0] ?? null);
  return reply(rows);
});
api.listen(54329, '127.0.0.1');
const next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3100'], {
  stdio: 'inherit',
  env: {...process.env, LOCAL_UI_TEST: '1', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54329', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local-test', SUPABASE_SECRET_KEY: 'sb_secret_local-test', APP_URL: 'http://127.0.0.1:3100'},
});
function close() {next.kill(); api.close();}
process.on('SIGTERM', close); process.on('SIGINT', close);
next.on('exit', code => {api.close(); process.exitCode = code ?? 0;});
