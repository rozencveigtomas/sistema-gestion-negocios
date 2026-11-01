import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

test.use({trace: 'off', screenshot: 'off', video: 'off'});
test.skip(!process.env.REMOTE_QA, 'Requiere entorno QA remoto explícito');
const state = process.env.REMOTE_QA ? JSON.parse(readFileSync('.local-data/remote-qa.json', 'utf8')) : null;
async function login(page: import('@playwright/test').Page, name: string) {
  await page.goto('/acceso');
  await page.getByLabel('Correo electrónico').fill(state.users[name].email);
  await page.getByLabel('Contraseña', {exact: true}).fill(state.users[name].password);
  await page.getByRole('button', {name: 'Ingresar al comercio'}).click();
  await expect(page).toHaveURL(/\/inicio$/);
}
test('jefe consulta resumen diario y CSV; calendario redirige al resumen', async ({page}) => {
  await login(page, 'bossA');
  await page.goto('/analisis');
  await expect(page.getByRole('heading', {name: 'Resumen del día'})).toBeVisible();
  await expect(page.getByText('Ganancia estimada', {exact: true})).toBeVisible();
  expect((await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  const csv = await page.request.get('/api/export?type=summary');
  expect(csv.status()).toBe(200);
  expect(csv.headers()['content-type']).toContain('text/csv');
  expect((await page.request.get('/api/export?type=summary&format=pdf')).status()).toBe(400);
  await page.goto('/calendario');
  await expect(page).toHaveURL(/\/analisis$/);
});
test('empleado recibe únicamente su actividad', async ({page}) => {
  await login(page, 'employeeA');
  await page.goto('/analisis');
  await expect(page.getByRole('heading', {name: 'Resumen del día'})).toBeVisible();
  await expect(page.getByText('Ganancia estimada', {exact: true})).toHaveCount(0);
  expect((await page.request.get('/api/export?type=summary')).status()).toBe(403);
});
