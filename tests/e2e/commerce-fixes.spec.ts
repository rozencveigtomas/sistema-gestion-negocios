import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';

test.use({trace:'off',screenshot:'off',video:'off'});
test.skip(!process.env.REMOTE_QA,'Requiere entorno QA remoto explícito');
const state=process.env.REMOTE_QA?JSON.parse(readFileSync('.local-data/remote-qa.json','utf8')):null;
async function login(page:import('@playwright/test').Page,name:string){
  await page.goto('/acceso');
  await page.getByLabel('Correo electrónico').fill(state.users[name].email);
  await page.getByLabel('Contraseña',{exact:true}).fill(state.users[name].password);
  await page.getByRole('button',{name:'Ingresar al comercio'}).click();
  await expect(page).toHaveURL(/\/inicio$/);
}

test('el formulario de ventas agrega líneas y registra una venta',async({page})=>{
  await login(page,'employeeA');
  await page.goto('/ventas');
  const rows=page.locator('.line-row');
  await expect(rows).toHaveCount(1);
  await page.getByRole('button',{name:'Agregar producto'}).click();
  await expect(rows).toHaveCount(2);
  await rows.nth(0).getByRole('button',{name:'Quitar artículo 1'}).click();
  await expect(rows).toHaveCount(1);
  const productSelect=rows.nth(0).getByLabel('Producto');
  const productLabels=await productSelect.locator('option').evaluateAll(options=>options.map(option=>({value:(option as HTMLOptionElement).value,label:option.textContent??''})));
  const saleProduct=productLabels.find(option=>/\bunidad\b/i.test(option.label)&&!/stock\s+0(?:[,.]0+)?\s*unidad/i.test(option.label));
  expect(saleProduct,'La preparación QA debe tener una unidad con stock disponible').toBeTruthy();
  await productSelect.selectOption({label:saleProduct!.label});
  await rows.nth(0).getByLabel('Cantidad').fill('1');
  const items=JSON.parse(await page.locator('input[name=items]').inputValue());
  expect(items).toHaveLength(1);
  await page.getByRole('button',{name:'Confirmar venta'}).click();
  await expect(page.getByRole('status')).toContainText('Venta registrada');
});

test('una oferta porcentual se crea sin configurar prioridad',async({page})=>{
  await login(page,'bossA');
  await page.goto('/ofertas');
  await page.getByText('Nueva oferta',{exact:true}).click();
  const suffix=randomUUID().slice(0,8);
  await page.getByLabel('Nombre').fill(`Oferta QA ${suffix}`);
  await page.locator('select[name="product_id"]').selectOption({index:1});
  await page.getByLabel('Descuento (%)').fill('5');
  const now=new Date();const iso=(date:Date)=>{const pad=(n:number)=>String(n).padStart(2,'0');return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`};
  await page.getByLabel('Comienza').fill(iso(new Date(now.getTime()-60_000)));
  await page.getByLabel('Termina').fill(iso(new Date(now.getTime()+86_400_000)));
  await page.getByRole('button',{name:'Crear oferta'}).click();
  await expect(page.getByRole('status')).toContainText('Oferta creada');
});

test('el producto admite varios colores y ajusta el paso según la unidad',async({page})=>{
  await login(page,'bossB');
  await page.goto('/productos/nuevo');
  const colorInput=page.getByLabel('Seleccionar color');
  await colorInput.selectOption('Rojo');
  await colorInput.selectOption('Azul');
  await expect(page.getByRole('button',{name:'Quitar color Rojo'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Quitar color Azul'})).toBeVisible();
  const stock=page.getByLabel('Stock inicial');
  await expect(stock).toHaveAttribute('step','1');
  await page.getByLabel('Unidad').selectOption('kg');
  await expect(stock).toHaveAttribute('step','0.001');
});
