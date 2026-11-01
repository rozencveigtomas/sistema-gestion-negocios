import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('missing and provider-rejected email links show recovery and clear fragments',async({page})=>{
  for(const suffix of ['', '#error=access_denied&error_code=otp_expired']){
    await page.goto('/auth/complete'+suffix);
    await expect(page.getByRole('alert').filter({hasText:'El enlace no es válido o venció'})).toHaveText('El enlace no es válido o venció. Solicitá uno nuevo.');
    await expect(page).toHaveURL(/\/auth\/complete$/);
    await expect(page.getByRole('link',{name:'Solicitar otro enlace'})).toHaveAttribute('href','/recuperar');
  }
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
});
test('well-formed fragment requires explicit confirmation and is not persisted in browser storage',async({page})=>{
  const posts:string[]=[];
  page.on('request',request=>{if(request.method()==='POST')posts.push(request.url());});
  await page.goto('/auth/complete#access_token=synthetic.test.token.not.a.real.credential&refresh_token=synthetic_refresh_token&type=invite');
  await expect(page.getByRole('button',{name:'Confirmar acceso'})).toBeEnabled();
  await expect(page).toHaveURL(/\/auth\/complete$/);
  expect(posts).toEqual([]);
  expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}))).toEqual({local:0,session:0});
  await page.reload();
  await expect(page.getByRole('alert').filter({hasText:'El enlace no es válido o venció'})).toBeVisible();
});
