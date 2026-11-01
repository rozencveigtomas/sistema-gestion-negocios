# Simplificación de la aplicación · cierre local 26/10/2026

Objetivo: vender, consultar productos y contar stock con menos pantallas, campos y explicaciones repetidas.

## Avance

- [x] Revisar pantallas, consultas y validaciones.
- [x] Guardar copia del código anterior en `.local-data/simplificacion-antes.zip`, sin claves.
- [x] Reducir el menú del jefe de 13 enlaces a 6; el del empleado, de 7 a 5.
- [x] Reemplazar el Inicio extenso por tres tareas y tres indicadores.
- [x] Integrar Calendario y Análisis en un Resumen del día.
- [x] Acortar formularios y ocultar extras bajo Más datos.
- [x] Reparar compras sin observación y separar ventas de ajustes manuales.
- [x] Iniciar un conteo en una sola acción, conservando la revisión y aprobación del jefe.
- [x] Retirar código de suscripción sin uso, exportación PDF incompleta y estilos de pantallas retiradas.
- [x] Retirar Tailwind y su plugin: el proyecto usa CSS propio; la desinstalación quitó 19 paquetes.
- [x] Formatear los archivos fuente y centralizar feedback, pagos y validaciones repetidas.
- [x] Compartir las comprobaciones de sesión dentro de una solicitud.
- [x] Desactivar precarga de enlaces para evitar consultas de pantallas que nadie abrió.
- [x] Ejecutar pruebas de PostgreSQL, validaciones, tipado y build de producción.
- [x] Cerrar la regresión final de navegador después de actualizar dependencias: 16/16 casos privados locales y 22/22 públicos.
- [x] Revalidar inicio de sesión real y acceso de jefe a Administración tras restaurar Supabase.
- [ ] Revalidar las demás operaciones contra Supabase real después de la restauración.

## Decisiones de producto

- Las ofertas nuevas usan porcentajes. Se retiraron del alta el precio fijo, el importe fijo y la prioridad; las ofertas históricas siguen siendo legibles y el cálculo del servidor se conserva.
- El resumen diario reemplaza calendario, comparaciones semanales y rankings repetidos.
- La exportación conserva CSV. Se quitó el PDF artesanal, que cortaba el contenido.
- Color agrega la opción al seleccionarla y conserva varios colores. Talle permite opciones y un valor personalizado.
- Ventas muestra el importe antes de ofertas y confirma el importe definitivo al guardar. Nueva venta prepara una operación nueva sin reutilizar el cobro anterior.

## Menos consultas

Sin contar identidad y permisos, Inicio pasó de 7–8 consultas para el jefe a 3. El resumen del jefe pasó de hasta 9 consultas a 2. Ya no se recorre todo el mes para mostrar el inicio ni se descargan filas financieras para construir rankings.

Son reducciones de consultas observables en el código, no una medición de velocidad de Internet.

## Seguridad y compatibilidad

Se conservan RLS, permisos, auditoría, stock transaccional, claves de idempotencia de ventas/devoluciones y límites de cantidades. No hay cambios de esquema remoto ni eliminación de información comercial.

Las compras no requieren la observación retirada. Se rechazan conteos vacíos, productos duplicados en una venta y ventas manuales que eludan el registro del cobro. CSV protege nombres que comienzan con fórmulas.

La auditoría inicial detectó 14 avisos. Se actualizaron Next.js a 16.4.3, Zod a 4.6.6 y la dependencia indirecta source-map-js. La auditoría final de producción no informa vulnerabilidades conocidas.

## Evidencia y límite externo

- Suite local PostgreSQL/validaciones: 113/113.
- Tipado y build de producción: correctos.
- Navegador privado local: 16/16 recorridos de escritorio y móvil, incluyendo accesibilidad de las pantallas principales.
- Navegador público: 22/22 casos; las 22 comprobaciones remotas autenticadas no se ejecutaron.
- Navegador local: datos ficticios en proceso separado; no certifica conexión con Supabase real.
- Supabase volvió a responder después de su restauración. Se verificaron contraseña, perfil de jefe activo, lectura del comercio, limitador de intentos, auditoría y acceso real en navegador a Inicio y Administración.
- Servidor local con Next.js 16.4.3. La sesión real de prueba se cerró correctamente; las operaciones comerciales posteriores a la restauración siguen pendientes de una nueva verificación remota.

