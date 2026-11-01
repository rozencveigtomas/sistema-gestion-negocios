/** Solo consola. Nunca importar en la aplicación o en código cliente. */
import {createClient} from '@supabase/supabase-js';
import {emailSchema} from '../src/lib/validation';
async function main(){
const required=['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SECRET_KEY','APP_URL','INITIAL_ADMIN_EMAIL','INITIAL_ADMIN_NAME','INITIAL_BUSINESS_NAME'] as const;
for(const name of required){if(!process.env[name])throw new Error(`Falta ${name}. Completá .env.local y volvé a ejecutar.`);}
const email=emailSchema.parse(process.env.INITIAL_ADMIN_EMAIL);
const name=process.env.INITIAL_ADMIN_NAME!.trim(),business=process.env.INITIAL_BUSINESS_NAME!.trim();
if(name.length<2||business.length<2)throw new Error('El nombre del jefe y del comercio deben tener al menos dos caracteres.');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{autoRefreshToken:false,persistSession:false}});
// El aprovisionamiento no se ejecuta desde una ruta pública. Es una acción administrativa explícita.
const existing=await db.from('profiles').select('id,business_id').eq('email',email).maybeSingle();
if(existing.error)throw new Error('No se pudo consultar la base. Aplicá la migración y verificá las credenciales.');
if(existing.data){console.log('El administrador ya tiene un comercio. No se creó otro ni se enviaron invitaciones.');process.exit(0);}
// generateLink crea la identidad sin enviar correo antes de completar el perfil.
const {data,error}=await db.auth.admin.generateLink({type:'invite',email,options:{redirectTo:new URL('/auth/confirm?next=/contrasena',process.env.APP_URL).toString()}});
if(error||!data.user)throw new Error('No se pudo preparar la cuenta de Auth. Revisá si ya existe; no se alteró ninguna cuenta existente.');
const {error:bootstrapError}=await db.rpc('bootstrap_business',{p_auth_user_id:data.user.id,p_email:email,p_name:name,p_business_name:business});
if(bootstrapError)throw new Error('No se pudo crear el comercio. La identidad de Auth puede haber quedado creada sin perfil; revisala antes de reintentar. No se borraron usuarios.');
const {error:mailError}=await db.auth.resetPasswordForEmail(email,{redirectTo:new URL('/auth/confirm?next=/contrasena',process.env.APP_URL).toString()});
if(mailError)throw new Error('El comercio y el jefe están creados, pero falló el correo. Corregí SMTP y solicitá recuperación de contraseña desde la aplicación.');
console.log('Comercio y jefe creados. Se solicitó el correo para elegir contraseña. Verificá su recepción; no implica entrega confirmada.');
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Falló el aprovisionamiento.');process.exitCode=1;});
