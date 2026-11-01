// Lecturas únicamente. No crea usuarios, no envía correo, no imprime credenciales.
const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!origin || !apiKey) throw new Error('Faltan URL o clave pública en .env.local.');
const requests = [
  ['auth', '/auth/v1/settings'],
  ['profiles', '/rest/v1/profiles?select=id&limit=0'],
  ['businesses', '/rest/v1/businesses?select=id&limit=0'],
];
const results = await Promise.all(requests.map(async ([name, path]) => {
  try {
    const response = await fetch(new URL(path, origin), {
      headers: { apikey: apiKey }, signal: AbortSignal.timeout(15000),
    });
    const body = await response.json();
    const result = { check: name, status: response.status };
    if (name === 'auth' && response.ok) {
      result.publicSignupDisabled = body.disable_signup === true;
      result.emailEnabled = body.external?.email === true;
      result.emailAutoconfirm = body.mailer_autoconfirm === true;
    } else if (!response.ok) {
      result.code = body.code ?? null;
      // Error de PostgreSQL/PostgREST; no imprimir filas, tokens ni cuerpos completos.
      result.message = typeof body.message === 'string' ? body.message.slice(0,200) : 'Solicitud rechazada';
    }
    return result;
  } catch (error) {
    return {check:name,status:'connection_failed',cause:error.cause?.code ?? error.name};
  }
}));
console.log(JSON.stringify({checks:results,serverSecretConfigured:Boolean(process.env.SUPABASE_SECRET_KEY)},null,2));
