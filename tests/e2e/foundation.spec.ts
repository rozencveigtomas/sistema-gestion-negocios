import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('sin conexión no muestra datos ficticios y explica la habilitación',async({page})=>{
  await page.goto('/acceso');await expect(page.getByRole('heading',{name:'Hola, bienvenido'})).toBeVisible();
  await expect(page.getByText('Estamos preparando el acceso')).toBeVisible();
  await expect(page.getByRole('button',{name:'Ingresar al comercio'})).toBeDisabled();
  await page.getByRole('link',{name:'Ver pasos de habilitación'}).click();
  await expect(page.getByRole('heading',{name:'Conectemos tu comercio'})).toBeVisible();
});
test('rutas privadas redirigen a acceso cuando no hay configuración ni sesión',async({page})=>{
  for(const path of ['/inicio','/empleados','/configuracion','/cuenta','/contrasena']){
    await page.goto(path);await expect(page).toHaveURL(/\/acceso$/);await expect(page.getByRole('heading',{name:'Hola, bienvenido'})).toBeVisible();
  }
});
test('Guía visible y accesible con teclado, cierre y devolución de foco',async({page})=>{
  await page.goto('/acceso');const guide=page.getByRole('button',{name:'Guía',exact:true});await expect(guide).toBeVisible();
  await guide.focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Acceso y contraseña'})).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();await expect(guide).toBeFocused();
});
test('recuperación informa falta de servicio sin simular envío',async({page})=>{
  await page.goto('/acceso');await page.getByRole('link',{name:'Olvidé mi contraseña'}).click();
  await expect(page.getByRole('heading',{name:'Recuperar contraseña'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Enviar enlace'})).toBeDisabled();
  await expect(page.getByText('El servicio de acceso todavía no está configurado.')).toBeVisible();
});
test('enlace de recuperación inválido regresa con error comprensible',async({page})=>{
  await page.goto('/auth/confirm?token_hash=falso&type=recovery&next=//evil.test');
  await expect(page).toHaveURL(/\/acceso\?error=link$/);await expect(page.getByRole('alert').filter({hasText:'El enlace no es válido o venció'})).toBeVisible();
});
test('pantallas de acceso sin desbordamiento horizontal y con accesibilidad automática',async({page},testInfo)=>{
  for(const path of ['/acceso','/recuperar','/preparacion']){
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(path);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations).toEqual([]);
    expect(errors).toEqual([]);
  }
  await page.goto('/acceso');await page.screenshot({path:`test-results/access-${testInfo.project.name}.png`,fullPage:true});
});
test('cabeceras impiden embedding y caché compartida',async({request})=>{
  const response=await request.get('/acceso');expect(response.status()).toBe(200);
  expect(response.headers()['x-frame-options']).toBe('DENY');expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['cache-control']).toContain('no-store');expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
});
test('la guía no introduce errores de accesibilidad',async({page})=>{
  await page.goto('/acceso');await page.getByRole('button',{name:'Guía',exact:true}).click();
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations).toEqual([]);
});
test('pantalla angosta y texto ampliado conservan contenido y controles',async({page})=>{
  await page.setViewportSize({width:320,height:800});await page.goto('/acceso');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await page.setViewportSize({width:1280,height:900});
  await page.addStyleTag({content:'html { font-size: 200% !important; }'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await page.getByRole('button',{name:'Guía',exact:true}).click();await expect(page.getByRole('heading',{name:'Guía de uso'})).toBeVisible();
});
