import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

test.use({trace:'off',screenshot:'off',video:'off'});
test.skip(!process.env.REMOTE_QA,'Requiere entorno QA remoto explícito');
const state=process.env.REMOTE_QA?JSON.parse(readFileSync('.local-data/remote-qa.json','utf8')):null;
async function login(page:import('@playwright/test').Page,name:string){await page.goto('/acceso');await page.getByLabel('Correo electrónico').fill(state.users[name].email);await page.getByLabel('Contraseña',{exact:true}).fill(state.users[name].password);await page.getByRole('button',{name:'Ingresar al comercio'}).click();await expect(page).toHaveURL(/\/inicio$/);}
test('jefe ve el flujo físico y empleado no puede crear sesiones',async({page})=>{
 await login(page,'bossA');await page.goto('/inventarios');await expect(page.getByText('Nuevo conteo',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Contar stock',exact:true})).toBeVisible();await page.getByText('Nuevo conteo',{exact:true}).click();await expect(page.getByRole('button',{name:'Seleccionar hasta 100'})).toBeVisible();
 const bossA11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(bossA11y.violations).toEqual([]);
 await page.getByRole('button',{name:'Cerrar sesión'}).click();await expect(page).toHaveURL(/\/acceso$/);await login(page,'employeeA');await page.goto('/inventarios');await expect(page.getByText('Nuevo conteo',{exact:true})).toHaveCount(0);await expect(page.getByRole('heading',{name:'Contar stock',exact:true})).toBeVisible();
 const employeeA11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(employeeA11y.violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});
