> Versión actual: ver [SIMPLIFICACION.md](SIMPLIFICACION.md). Las secciones siguientes conservan también el diseño histórico.

# Arquitectura y decisiones

## Alcance y navegación

Aplicación privada para Argentina; Next.js, TypeScript, CSS propio, Supabase Auth y PostgreSQL. Pantallas: acceso/recuperación, Inicio, Productos, Venta, Movimientos, Inventarios, Devoluciones, Gastos, Calendario, Análisis, Empleados, Ofertas, Configuración y Guía contextual. Identidad provisional editable: Gestión Comercio, azul oscuro y turquesa. No se crea un registro público.

## Alternativas de persistencia

- Supabase/PostgreSQL (seleccionada por la especificación): relaciones, transacciones, RLS, identidad y reportes.
- Firestore: viable, con mayor complejidad de relaciones y reportes.
- Airtable/Sheets: solo piloto pequeño.
- SQLite local: solo demostración de un dispositivo; no es la base de esta aplicación.

PGlite ejecuta PostgreSQL en pruebas locales de SQL/RLS. No se usa como backend de la aplicación ni como sustituto de Supabase.

## Modelo completo planificado

businesses → profiles; categories, locations, suppliers → products; sales → sale_items; inventory_movements; expenses; returns; offers; inventory_sessions → inventory_count_items; subscriptions → subscription_payments (backend histórico no expuesto); daily_summaries; audit_logs. Todas las referencias entre entidades privadas se validan dentro del mismo comercio. Costos y notas privadas vivirán separados de las columnas operativas: RLS protege filas, no oculta columnas.

## Permisos

Empleado: perfil propio, catálogo operativo, sus ventas/rendimiento, operaciones autorizadas y conteos. Jefe: además costos, reportes generales, usuarios, configuración, aprobación de ajustes. Las operaciones sensibles se autorizan en la base mediante funciones; no se confía en business_id o role recibidos del navegador. No se permite borrar historiales.

## Flujos transaccionales previstos

Venta: clave de idempotencia por comercio, bloqueo de productos en orden determinista, ofertas vigentes calculadas en servidor, snapshots de precio/costo, venta + artículos + stock + auditoría en una transacción.

Devolución: bloqueo del artículo vendido, límite vendido menos devoluciones anteriores, reintegro máximo proporcional y reposición solo vendible; clave de idempotencia. Una devolución dañada no revierte costo de mercadería como si hubiese vuelto a estar disponible.

Inventario: fotografía de stock y movimientos concurrentes, primer conteo, recuento de diferencias, aprobación del jefe. La aprobación fija el stock a la cantidad final contada. Conviene revisar y aprobar antes de reanudar operaciones sobre esos productos. Nunca se interpreta una diferencia como robo.

Suscripción: el backend histórico queda fuera de la interfaz y sin navegación; no forma parte del flujo operativo actual.

## Construcción y validación

Orden obligatorio: base segura → inventario → operación → control físico → información → calidad. Antes de avanzar se ejecutan las pruebas de cada etapa. Si falta infraestructura externa, se deja la etapa pendiente de integración y no se declara completa.

## Fuentes técnicas consultadas

- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/auth/server-side/advanced-guide
- https://nextjs.org/docs/app/getting-started/installation
- https://pglite.dev/docs/




