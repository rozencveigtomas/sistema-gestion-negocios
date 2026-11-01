import {test} from 'node:test';
import assert from 'node:assert/strict';
import {movementSchema, expenseSchema, offerSchema, inventoryCountSchema, saleItemsSchema} from '../src/lib/validation';
import {csv, csvCell} from '../src/lib/csv';

const uuid = '10000000-0000-4000-8000-000000000001';

test('compra sin observación ni fecha usa valores seguros; no acepta venta manual', () => {
  const result = movementSchema.parse({product_id: uuid, movement_type: 'entry', quantity: '2', reason: 'purchase'});
  assert.equal(result.notes, '');
  assert.equal(result.occurred_at, '');
  assert.equal(result.quantity, 2);
  for (const reason of ['sale', 'return', 'damage']) assert.equal(movementSchema.safeParse({product_id: uuid, movement_type: 'entry', quantity: '2', reason}).success, false);
});

test('gasto y oferta no exigen campos extra que la pantalla ya no muestra', () => {
  const expense = expenseSchema.parse({concept: 'Alquiler', category: 'Local', amount: '150', payment_method: 'cash'});
  assert.equal(expense.status, 'paid');
  assert.equal(expense.notes, '');
  assert.equal(expenseSchema.safeParse({...expense, amount: ''}).success, false);
  const offer = offerSchema.parse({name: 'Oferta', scope: 'product', product_id: uuid, discount_type: 'percent', value: '10', starts_at: '2026-09-01T00:00', ends_at: '2026-09-02T00:00'});
  assert.equal(offer.priority, 0);
  assert.equal(offer.category_id, '');
});

test('un conteo vacío se rechaza y cero se acepta como cantidad explícita', () => {
  const value = {session_id: uuid, product_id: uuid, first_count: ''};
  assert.equal(inventoryCountSchema.safeParse(value).success, false);
  assert.equal(inventoryCountSchema.parse({...value, first_count: '0'}).first_count, 0);
});

test('la venta rechaza productos duplicados antes de llamar a la base', () => {
  assert.equal(saleItemsSchema.safeParse([{product_id: uuid, quantity: 1}, {product_id: uuid, quantity: 2}]).success, false);
  assert.equal(saleItemsSchema.safeParse([{product_id: uuid, quantity: 1}]).success, true);
});

test('CSV conserva comillas y saltos; no ejecuta fórmulas de nombres importados', () => {
  assert.equal(csvCell('nombre, con "comillas"'), '"nombre, con ""comillas"""');
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell('-SUM(1+1)'), "'-SUM(1+1)");
  assert.equal(csvCell(-50), '-50');
  assert.equal(csv([['Producto', 'Precio'], ['Remera\nnegra', 200]]), '\uFEFFProducto,Precio\r\n"Remera\nnegra",200\r\n');
});
