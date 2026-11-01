import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const read=(file:string)=>readFileSync(resolve(process.cwd(),file),'utf8');

test('los campos numéricos no muestran controles de incremento',()=>{
 const css=read('src/app/globals.css');
 assert.match(css,/input\[type="?number"?\]\s*\{[^}]*appearance:\s*textfield/);
 assert.match(css,/::-webkit-inner-spin-button[^}]*-webkit-appearance:\s*none/);
});

test('catálogo, venta e inventario exponen solo los campos solicitados',()=>{
 const productForm=read('src/components/inventory-forms.tsx');
 const operations=read('src/components/operations-forms.tsx');
 const saleForm=operations.slice(operations.indexOf('export function SaleForm'),operations.indexOf('export function ExpenseForm'));
 const physicalForms=read('src/components/physical-forms.tsx');
 const productsPage=read('src/app/(private)/productos/page.tsx');
 const newProductPage=read('src/app/(private)/productos/nuevo/page.tsx');
 const exportRoute=read('src/app/api/export/route.ts');
 for(const field of ['name="barcode"','name="model"','name="variant"','name="minimum_stock"','name="ideal_stock"'])assert.doesNotMatch(productForm,new RegExp(field));
 assert.doesNotMatch(saleForm,/name="notes"/);
 assert.doesNotMatch(physicalForms,/name="notes"/);
 assert.match(productsPage,/ProductFilters/);
 assert.doesNotMatch(productsPage,/>Aplicar</);
 assert.match(newProductPage,/Agregar producto/);
 assert.doesNotMatch(newProductPage,/Agregar referencia|variante/);
 assert.match(productForm,/Seleccionar color/);
 assert.match(productForm,/Talle o tamaño/);
 assert.doesNotMatch(exportRoute,/Stock mínimo|minimum_stock/);
});
