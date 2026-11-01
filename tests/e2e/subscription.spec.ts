import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

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

for(const user of ['bossA','employeeA']) test(`la ruta retirada de suscripción redirige a inicio (${user})`,async({page})=>{
  await login(page,user);
  await page.goto('/suscripcion');
  await expect(page).toHaveURL(/\/inicio$/);
  await expect(page.getByRole('heading',{name:'Suscripción'})).toHaveCount(0);
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});
