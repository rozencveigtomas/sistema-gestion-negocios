import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
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
test('real boss login, persisted configuration, accessibility and logout',async({page})=>{
  await login(page,'bossA');
  await expect(page.getByRole('link',{name:'Administración',exact:true})).toHaveCount(1);
  await page.goto('/configuracion');
  await page.getByLabel('Nombre del comercio',{exact:true}).fill('QA configuración navegador');
  await page.getByRole('button',{name:'Guardar cambios'}).click();
  await expect(page.getByRole('status')).toContainText('Configuración guardada.');
  await page.reload();await expect(page.getByLabel('Nombre del comercio',{exact:true})).toHaveValue('QA configuración navegador');
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await page.getByRole('button',{name:'Cerrar sesión'}).click();
  await expect(page).toHaveURL(/\/acceso$/);
  await page.goto('/configuracion');await expect(page).toHaveURL(/\/acceso$/);
});
test('real employee login and forbidden private routes',async({page})=>{
  await login(page,'employeeA');await expect(page.getByRole('link',{name:'Administración',exact:true})).toHaveCount(0);
  for(const path of ['/configuracion','/empleados']){await page.goto(path);await expect(page).toHaveURL(/\/inicio$/);}
  await expect(page.getByRole('heading',{name:'Última actividad'})).toHaveCount(0);
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations).toEqual([]);
});
test('real provider recovery link reaches password form through default callback',async({page})=>{
  const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await admin.auth.admin.generateLink({type:'recovery',email:state.users.bossB.email,options:{redirectTo:'http://127.0.0.1:3000/auth/confirm?next=/contrasena'}});
  if(error||!data.properties?.action_link)throw Error('No se pudo generar enlace QA');
  // No traces/screenshots or access URL assertions: the URL is a credential.
  try{await page.goto(data.properties.action_link);}catch{throw Error('Falló navegación del enlace QA');}
  await expect(page.getByRole('button',{name:'Confirmar acceso'})).toBeVisible();
  await page.getByRole('button',{name:'Confirmar acceso'}).click();
  await expect(page.getByRole('heading',{name:'Elegí tu contraseña'})).toBeVisible();
  const oldClient=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const oldSession=await oldClient.auth.signInWithPassword({email:state.users.bossB.email,password:state.users.bossB.password});
  if(oldSession.error||!oldSession.data.session)throw Error('No se pudo iniciar sesión secundaria QA');
  const password=randomBytes(32).toString('base64url');
  await page.getByLabel('Nueva contraseña',{exact:true}).fill(password);
  await page.getByLabel('Repetí la nueva contraseña',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Guardar contraseña'}).click();
  await expect(page.getByRole('status')).toContainText('Contraseña actualizada. Ya podés ingresar al comercio.');
  state.users.bossB.password=password;writeFileSync('.local-data/remote-qa.json',JSON.stringify(state));
  const refreshed=await oldClient.auth.refreshSession({refresh_token:oldSession.data.session.refresh_token});
  expect(Boolean(refreshed.error)).toBe(true);
  await page.getByRole('link',{name:'Ir al comercio'}).click();
  await expect(page.getByRole('link',{name:'Administración',exact:true})).toHaveCount(1);
  try{await page.goto(data.properties.action_link);}catch{throw Error('Falló navegación del enlace QA reutilizado');}
  await expect(page.getByRole('alert').filter({hasText:'El enlace no es válido o venció'})).toBeVisible();
});
