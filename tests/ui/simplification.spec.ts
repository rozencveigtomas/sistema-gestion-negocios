import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function login(page: import('@playwright/test').Page, role = 'boss') {
  await page.goto('/acceso');
  await page.getByLabel('Correo electrónico').fill(role + '@local.invalid');
  await page.getByLabel('Contraseña', {exact: true}).fill('local-test-password-123');
  await page.getByRole('button', {name: 'Ingresar al comercio'}).click();
  await expect(page).toHaveURL(/\/inicio$/);
}

test.beforeEach(async ({request}) => {await request.post('http://127.0.0.1:54329/reset');});

test('menú breve, ayuda contextual y resumen sin pantallas repetidas', async ({page}, info) => {
  await login(page);
  await page.screenshot({path: '.local-data/qa-simplificacion/inicio-' + info.project.name + '.png', fullPage: true});
  if (info.project.name === 'mobile') await page.getByRole('button', {name: 'Abrir menú'}).click();
  await expect(page.getByRole('navigation').getByRole('link')).toHaveCount(6);
  await page.getByRole('navigation').getByRole('link', {name: 'Resumen', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Resumen del día'})).toBeVisible();
  await expect(page.getByText('Ganancia estimada', {exact: true})).toBeVisible();
  await page.goto('/calendario?day=2026-09-01');
  await expect(page).toHaveURL(/\/analisis\?date=2026-09-01$/);
  const csv = await page.request.get('/api/export?type=summary');
  expect(csv.status()).toBe(200);
  expect(csv.headers()['content-type']).toContain('text/csv');
  expect((await page.request.get('/api/export?type=summary&format=pdf')).status()).toBe(400);
  await page.getByRole('button', {name: 'Guía', exact: true}).click();
  await expect(page.getByRole('dialog').getByRole('heading', {name: 'Resumen del día'})).toBeVisible();
  await page.keyboard.press('Escape');
  const result = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('alta con opciones, compra sin observación y acceso directo a vender', async ({page}) => {
  await login(page);
  await page.goto('/productos/nuevo');
  await expect(page.getByRole('heading', {name: 'Agregar producto'})).toBeVisible();
  await expect(page.getByLabel('Marca', {exact: true})).not.toBeVisible();
  await page.getByLabel('Nombre', {exact: true}).fill('Pantalón QA');
  await page.getByLabel('SKU / identificador').fill('PANT-1');
  await page.getByLabel('Costo unitario').fill('100');
  await page.getByLabel('Precio de venta').fill('300');
  await page.getByLabel('Stock inicial').fill('5');
  await page.getByLabel('Seleccionar color').selectOption('Negro');
  await page.getByLabel('Seleccionar color').selectOption('Azul');
  await page.getByLabel('Seleccionar color').selectOption('Negro');
  await expect(page.getByRole('button', {name: 'Quitar color Negro'})).toHaveCount(1);
  await page.getByLabel('Talle o tamaño', {exact: true}).selectOption('M');
  await page.screenshot({path: '.local-data/qa-simplificacion/producto.png', fullPage: true});
  await page.getByRole('button', {name: 'Crear producto'}).click();
  await expect(page.getByRole('heading', {name: 'Pantalón QA'})).toBeVisible();
  await expect(page.getByText('Negro, Azul', {exact: true})).toBeVisible();
  await page.getByLabel('Cantidad', {exact: true}).fill('2');
  await page.getByRole('button', {name: 'Guardar stock'}).click();
  await expect(page.getByRole('status')).toContainText('Stock actualizado');
  await expect(page.getByText('7 unidad', {exact: true})).toBeVisible();
  await page.getByRole('link', {name: 'Vender este producto'}).click();
  await expect(page.locator('.line-row select')).not.toHaveValue('');
  await page.getByRole('button', {name: 'Confirmar venta'}).click();
  await expect(page.getByRole('status')).toContainText('Total cobrado');
  await expect(page.getByRole('button', {name: 'Confirmar venta'})).toHaveCount(0);
  await page.getByRole('link', {name: 'Nueva venta', exact: true}).click();
  await expect(page.locator('.line-row select')).toHaveValue('');
});

test('opciones personalizadas y archivados se aplican sin botón adicional', async ({page}) => {
  await login(page);
  await page.goto('/productos/nuevo');
  await page.getByLabel('Seleccionar color').selectOption('custom');
  await page.getByLabel('Otro color', {exact: true}).fill('Turquesa');
  await page.getByRole('button', {name: 'Agregar', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Quitar color Turquesa'})).toBeVisible();
  await page.getByLabel('Talle o tamaño', {exact: true}).selectOption('custom');
  await page.getByLabel('Talle o tamaño personalizado').fill('2 años');
  await expect(page.locator('input[name=size]')).toHaveValue('2 años');
  await page.goto('/productos/10000000-0000-4000-8000-000000000030');
  await page.getByRole('button', {name: 'Archivar producto'}).click();
  await expect(page.getByRole('heading', {name: 'Producto archivado'})).toBeVisible();
  await page.goto('/productos');
  await expect(page.getByRole('heading', {name: 'Remera', exact: true})).toHaveCount(0);
  await page.getByRole('checkbox', {name: 'Ver archivados'}).check();
  await expect(page).toHaveURL(/archived=1/);
  await expect(page.getByRole('heading', {name: 'Remera', exact: true})).toBeVisible();
});

test('devolución identifica la venta y permite reintegrar sin campos extra', async ({page}) => {
  await login(page);
  await page.goto('/ventas');
  await page.locator('.line-row select').selectOption({label: 'Remera · REM-1 · stock 10 unidad'});
  await page.getByRole('button', {name: 'Confirmar venta'}).click();
  await expect(page.getByRole('status')).toContainText('Venta registrada');
  await page.goto('/devoluciones');
  await page.getByLabel('Artículo vendido').selectOption({index: 1});
  await page.getByLabel('Cantidad', {exact: true}).fill('1');
  await page.getByLabel('Dinero a devolver').fill('200');
  await page.getByLabel('Motivo', {exact: true}).fill('Cambio de talle');
  await page.getByRole('button', {name: 'Registrar devolución'}).click();
  await expect(page.getByRole('status')).toContainText('Devolución registrada');
  await page.goto('/productos/10000000-0000-4000-8000-000000000030');
  await expect(page.getByText('10 unidad', {exact: true})).toBeVisible();
});

test('pantallas principales conservan accesibilidad y ancho de teléfono', async ({page}) => {
  await login(page);
  for (const path of ['/inicio', '/productos', '/productos/nuevo', '/ventas', '/inventarios', '/gastos', '/configuracion', '/catalogo']) {
    await page.goto(path);
    const result = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations, path).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), path).toBeTruthy();
  }
});

test('venta evita repetir productos y mantiene restricciones del empleado', async ({page}, info) => {
  await login(page, 'employee');
  await page.goto('/ventas');
  await page.locator('.line-row select').selectOption({label: 'Remera · REM-1 · stock 10 unidad'});
  await page.getByRole('button', {name: 'Agregar producto', exact: true}).click();
  await expect(page.locator('.line-row').nth(1).locator('option').filter({hasText: 'REM-1'})).toHaveAttribute('disabled', '');
  await page.getByRole('button', {name: 'Quitar artículo 2'}).click();
  await page.getByRole('button', {name: 'Confirmar venta'}).click();
  await expect(page.getByRole('status')).toContainText('Venta registrada');
  await page.goto('/analisis');
  await expect(page.getByText('Ganancia estimada', {exact: true})).toHaveCount(0);
  expect((await page.request.get('/api/export?type=summary')).status()).toBe(403);
  await page.goto('/productos/nuevo');
  await expect(page).toHaveURL(/\/inicio$/);
  if (info.project.name === 'mobile') await page.getByRole('button', {name: 'Abrir menú'}).click();
  await expect(page.getByRole('navigation').getByRole('link')).toHaveCount(5);
});

test('conteo se inicia en un paso y el jefe conserva aprobación', async ({page}) => {
  await login(page);
  await page.goto('/inventarios');
  await page.getByText('Nuevo conteo', {exact: true}).click();
  await page.getByLabel('Nombre del conteo').fill('Cierre QA');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', {name: 'Iniciar conteo', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Cierre QA'})).toBeVisible();
  await page.getByLabel('Cantidad contada').fill('9');
  await page.getByRole('button', {name: 'Guardar conteo'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Conteo guardado'})).toBeVisible();
  await page.getByRole('button', {name: 'Terminar y revisar'}).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', {name: 'Aprobar stock'}).click();
  await expect(page.getByText('Conteos terminados (1)', {exact: true})).toBeVisible();
});

test('oferta porcentual y gasto básico sin completar datos extra', async ({page}) => {
  await login(page);
  await page.goto('/ofertas');
  await page.getByText('Nueva oferta', {exact: true}).click();
  await page.getByLabel('Nombre', {exact: true}).fill('Descuento QA');
  await page.locator('select[name=product_id]').selectOption({index: 1});
  await page.getByLabel('Descuento (%)').fill('10');
  await page.getByLabel('Comienza').fill('2026-09-01T00:00');
  await page.getByLabel('Termina').fill('2027-09-01T00:00');
  await page.getByRole('button', {name: 'Crear oferta'}).click();
  await expect(page.getByRole('status')).toContainText('Oferta creada');
  await page.goto('/gastos');
  await page.getByLabel('Concepto').fill('Alquiler');
  await page.getByLabel('Categoría', {exact: true}).fill('Local');
  await page.getByLabel('Importe', {exact: true}).fill('50');
  await page.getByRole('button', {name: 'Guardar gasto'}).click();
  await expect(page.getByRole('status')).toContainText('Gasto guardado');
});
