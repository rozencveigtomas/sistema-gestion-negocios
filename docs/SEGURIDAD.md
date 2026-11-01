## Revisión vigente · 26/10/2026

La simplificación conserva permisos, RLS, auditoría y operaciones transaccionales. Los formularios de ajustes rechazan ventas manuales; las ventas completas deben registrar cobro y stock mediante su propia transacción. Los conteos vacíos se rechazan y CSV neutraliza fórmulas en nombres.

La auditoría detectó 14 avisos en las versiones anteriores. Se actualizaron Next.js a 16.4.3, Zod a 4.6.6 y source-map-js a una versión corregida. `pnpm audit --prod` final no informa vulnerabilidades conocidas.

Las pruebas de interfaz usan una API ficticia exclusivamente en procesos locales de test. No existe una ruta de demostración que omita Auth en la aplicación habitual. El acceso al Supabase real sigue pendiente por resolución de su host.

# Revisión de seguridad de etapa 1

## Controles implementados

- Todos los datos privados llevan comercio y RLS. Las claves foráneas restringen referencias válidas.
- La sesión se valida con `getUser()` en servidor. La membresía activa se verifica en RLS en cada consulta; la desactivación del perfil no depende de que expire el JWT.
- Solo se conceden lecturas a `authenticated`; toda escritura autorizada usa funciones concretas. No hay UPDATE/DELETE público sobre roles, comercio ni auditoría.
- Funciones SECURITY DEFINER con `search_path` vacío, objetos cualificados y privilegios EXECUTE explícitos.
- El comercio y el actor se derivan de la identidad; no son parámetros de escritura manipulables.
- Los cambios del último jefe se serializan bloqueando la fila del comercio. Concurrencia remota comprobada: dos degradaciones simultáneas conservan un jefe activo.
- Invitación por correo verificado de `auth.users`; siempre empleado al aceptar; revocación y vencimiento comprobados en SQL.
- Cambios de configuración, permisos e invitaciones generan auditoría dentro de la misma transacción.
- Clave administrativa en módulo `server-only`. La aplicación no guarda contraseñas; se delegan a Supabase Auth.
- La clave privada expuesta durante la configuración fue reemplazada; la anterior se revocó y el acceso administrativo y las sesiones QA se comprobaron con la nueva.
- Validación Zod más restricciones SQL; parámetros en consultas y texto escapado por React.
- Límite de intentos persistido mediante HMAC del correo. Sin confianza en encabezados IP no verificados. El rate limit por IP/captcha y protección perimetral quedan sujetos al proveedor/hosting real.
- Sin almacenamiento en caché compartida, protección contra iframe, restricciones de origen para Server Actions y redirecciones locales.

## Límites explícitos

- No es una auditoría de penetración ni una certificación.
- Supabase Auth, permisos remotos, correo de empleado y recorridos de sesión verificados. SMTP propio, dominio y operación de producción siguen pendientes.
- JWT ya emitidos pueden conservar validez hasta expirar cuando se cambia contraseña; las comprobaciones server-side de identidad y perfil reducen este riesgo, sin prometer invalidación universal instantánea.
- Las pruebas locales usan un esquema Auth mínimo; se complementan con pruebas remotas independientes contra Supabase.
- Bootstrap ejecutado en Supabase real. Entrega de invitaciones de empleado y fallos parciales entre servicios todavía requieren verificación.
- La CSP permite scripts/estilos inline por Next.js; endurecimiento con nonce queda pendiente de configuración de publicación. No permite `unsafe-eval` en producción.
- No se suben archivos privados todavía. Costos, ventas y devoluciones tienen pruebas locales y remotas. El backend histórico de suscripción no está expuesto por la aplicación.
- Backups, restauración, retención de archivos, monitorización e incidentes deben configurarse y probarse sobre infraestructura real.

## Fuentes

- https://supabase.com/docs/guides/auth/server-side/advanced-guide
- https://supabase.com/docs/guides/database/postgres/row-level-security

## Revisión final del MVP (16/09/2026)

- La migración 202609160008_financial_column_permissions.sql revoca cost_total y unit_cost de las lecturas operativas. El jefe recibe esos valores únicamente mediante boss_sales_financials, filtrada por comercio y rol.
- Se verificaron 4 escenarios remotos de privacidad financiera: empleado sin costos, jefe autorizado, aislamiento entre comercios y denegación anónima.
- El control físico bloquea ventas cuando el jefe activa la pausa de inventario; la base aplica el bloqueo con trigger, no solo con la interfaz.
- Las funciones de reportes mantienen RLS y search_path fijo. La interfaz de suscripción fue retirada.
- La regresión local final fue 104/104, con TypeScript y build de producción aprobados. Las pruebas de navegador cubrieron escritorio y móvil; Axe no reportó violaciones en las pantallas incluidas.

Esta revisión no es una auditoría de penetración. Antes de publicar todavía hay que configurar SMTP, dominio/hosting, backups y restauración, monitoreo, incidentes y Storage privado si se almacenan comprobantes.

