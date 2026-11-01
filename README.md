# Gestión Comercio

Aplicación privada para productos, ventas y conteos de stock. Usa Next.js, React, TypeScript, CSS propio y Supabase/PostgreSQL.

El menú diario tiene cinco tareas: Inicio, Catálogo/Categorías, Ventas, Contar stock y Resumen. Administración aparece únicamente para el jefe.

## Ejecutar

Requiere Node.js, pnpm y el proyecto Supabase configurado.

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Abrí http://127.0.0.1:3000/acceso. Para desarrollar, usá `pnpm dev`.

Las variables van en `.env.local`; seguí [la configuración de Supabase](docs/SUPABASE.md). No sobrescribas un archivo de entorno existente. El sistema no permite ingresar cuando el servicio de identidad no está disponible.

## Verificar

```powershell
pnpm typecheck
pnpm test
pnpm test:ui
pnpm build
pnpm audit --prod
```

- `test` ejecuta PostgreSQL embebido con PGlite y valida permisos, cálculos, stock, auditoría e idempotencia.
- `test:ui` abre Edge en escritorio y móvil con un servidor de prueba aislado en 3100 y una API local en 54329. Los datos son ficticios. No usa las credenciales ni la base real del comercio.
- `test:e2e` conserva los recorridos públicos y las pruebas remotas que requieren habilitar explícitamente `REMOTE_QA`. Los casos públicos sin configuración necesitan un servidor aislado sin variables de servicio.

## Documentación

- [Manual corto](docs/MANUAL.md)
- [Cambios y avance de simplificación](docs/SIMPLIFICACION.md)
- [Pruebas y límites de evidencia](docs/PRUEBAS.md)
- [Instalación de Supabase](docs/SUPABASE.md)
- [Seguridad](docs/SEGURIDAD.md)

La simplificación no borra datos ni migraciones históricas. Las ventas y devoluciones mantienen permisos por comercio y transacciones auditadas.

La integración remota debe volver a verificarse cuando el proyecto Supabase responda. Las comprobaciones remotas antiguas se conservan como evidencia histórica, no como una validación del servicio actual.
