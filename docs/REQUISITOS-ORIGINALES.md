Actuá como un equipo senior compuesto por:

- Arquitecto de software.
- Diseñador UX/UI.
- Desarrollador full-stack.
- Especialista en bases de datos.
- Especialista en seguridad.
- Analista de inventario y operaciones comerciales.
- Tester de calidad.

Tu tarea es diseñar y desarrollar una aplicación web privada, intuitiva, segura y responsive para administrar inventario, ventas, gastos, devoluciones, ofertas y desempeño de empleados en pequeños comercios.

No generes solamente una landing page ni una maqueta con botones sin funcionamiento. Construí una aplicación completa, conectada a una base de datos real, con autenticación, permisos, validaciones, auditoría y datos persistentes.

# 1. Información inicial del proyecto

Utilizá los siguientes valores:

- Nombre de la aplicación: `[NOMBRE DE LA APLICACIÓN]`
- Nombre del servicio o empresa: `[NOMBRE DEL SERVICIO]`
- País: Argentina.
- Moneda: pesos argentinos, ARS.
- Zona horaria: America/Argentina/Buenos_Aires.
- Idioma principal: español.
- Precio mensual del servicio: `$[MONTO] ARS`.
- Enlace de pago de Lemon: `[ENLACE DE PAGO DE LEMON]`
- Días previos para comenzar a mostrar el aviso de vencimiento: `7 días`.
- Correo del administrador inicial: `[CORREO DEL ADMINISTRADOR]`
- Colores principales de la marca: `[COLORES]`
- Logotipo: `[LOGOTIPO O INDICAR QUE TODAVÍA NO EXISTE]`

Si falta algún dato crítico, preguntalo antes de publicar la aplicación. Para información estética no crítica, utilizá valores provisionales fáciles de modificar desde Configuración.

No inventes una integración oficial, API o webhook de Lemon si no está disponible o documentado. El enlace de pago debe administrarse desde Configuración y abrir un checkout de Lemon con el monto mensual previamente configurado. Si Lemon no permite verificar automáticamente el pago, implementá confirmación manual por parte del jefe y dejá preparada una interfaz para agregar verificación automática en el futuro.

Un comprobante enviado por un usuario no debe marcar una suscripción como pagada automáticamente.

# 2. Objetivo de la aplicación

La aplicación será utilizada por pequeños comercios que necesitan:

- Conocer el stock real de cada producto y variante.
- Registrar entradas, salidas, ventas y devoluciones.
- Realizar inventarios físicos.
- Comparar el conteo real con el stock registrado.
- Identificar diferencias sin acusar automáticamente robo o fraude.
- Conocer ventas, gastos y ganancia.
- Analizar el desempeño de empleados.
- Consultar ventas por fecha, categoría y horario.
- Crear ofertas por producto o categoría.
- Llevar un registro de devoluciones diarias y mensuales.
- Recibir avisos cuando esté por vencer la mensualidad del servicio.
- Pagar la mensualidad mediante un enlace de Lemon.
- Mantener protegidos los datos comerciales.

La aplicación debe resultar sencilla para personas con poca experiencia tecnológica.

# 3. Tecnología recomendada

Construí la aplicación con:

- Frontend: Next.js con TypeScript.
- Diseño: Tailwind CSS y componentes accesibles.
- Backend y base de datos: Supabase con PostgreSQL.
- Autenticación: Supabase Auth.
- Seguridad de datos: Row Level Security en todas las tablas privadas.
- Funciones de servidor: acciones del servidor o funciones seguras equivalentes.
- Gráficos: una librería confiable como Recharts.
- Formularios: validación tanto en cliente como en servidor.
- Exportaciones: CSV y PDF.
- Diseño responsive, preparado para computadora, tablet y teléfono.

Si el entorno elegido no soporta estas tecnologías, adaptá la arquitectura manteniendo las mismas funciones, seguridad y reglas de negocio.

Nunca coloques claves administrativas, secretos, credenciales o claves privadas en el código del navegador.

# 4. Opciones de base de datos

Antes de implementar, mostrale al responsable un resumen corto de estas alternativas:

## Opción A: Supabase con PostgreSQL — recomendada

Elegir esta opción por defecto porque:

- Los productos, ventas, empleados, devoluciones y movimientos están relacionados.
- Permite autenticación y permisos por comercio.
- Facilita reportes por día, mes, categoría y empleado.
- Permite utilizar Row Level Security.
- Puede crecer sin rehacer completamente la aplicación.

## Opción B: Firebase Firestore

Puede servir para un prototipo rápido, pero las relaciones, reportes financieros y consultas complejas pueden requerir más trabajo y duplicación de información.

## Opción C: Airtable o Google Sheets

Puede utilizarse para una prueba piloto con pocos productos y pocos usuarios. No debe recomendarse como base definitiva para información comercial sensible, múltiples empleados, auditoría avanzada o un volumen alto de operaciones.

## Opción D: SQLite local

Solamente adecuada para una demostración que funcione en un único dispositivo. No utilizarla para una aplicación web con varios usuarios trabajando simultáneamente.

A menos que el responsable elija otra alternativa, continuar con Supabase y PostgreSQL.

# 5. Aplicación privada y autenticación

La aplicación debe ser privada.

No debe existir registro público abierto. Las cuentas solamente pueden ser creadas o invitadas por un jefe autorizado.

Crear dos perfiles principales:

## Empleado

Puede:

- Iniciar sesión con correo o usuario y contraseña.
- Consultar los productos necesarios para trabajar.
- Registrar ventas.
- Registrar movimientos autorizados.
- Registrar devoluciones.
- Participar en conteos de inventario.
- Consultar solamente su propio rendimiento.
- Cambiar su contraseña.
- Consultar la guía de uso.

No puede:

- Ver ganancias globales si el jefe no lo autoriza.
- Ver costos internos de compra.
- Modificar usuarios, roles o suscripciones.
- Eliminar registros históricos.
- Aprobar ajustes sensibles de stock.
- Confirmar pagos del servicio.
- Cambiar configuraciones generales.

## Jefe

Puede:

- Utilizar todas las funciones del empleado.
- Consultar todo el inventario.
- Ver costos, gastos, ingresos y ganancias.
- Consultar el rendimiento de todos los empleados.
- Crear, editar, archivar y reactivar productos.
- Crear empleados y administrar permisos.
- Aprobar ajustes de inventario.
- Configurar ofertas.
- Consultar auditorías.
- Configurar el enlace y monto de Lemon.
- Confirmar manualmente una mensualidad.
- Exportar reportes.
- Administrar categorías y ubicaciones.

Las contraseñas deben almacenarse mediante el sistema seguro de autenticación. Nunca guardar contraseñas como texto visible en la base de datos.

Incluir:

- Recuperación de contraseña.
- Cierre de sesión.
- Caducidad segura de sesión.
- Protección contra intentos repetidos.
- Opción de desactivar empleados sin borrar su historial.
- Registro de último acceso.
- Separación total de los datos de diferentes comercios.

# 6. Estructura general de la interfaz

Diseñar una interfaz limpia y profesional, con:

- Menú lateral en computadora.
- Navegación inferior o menú compacto en teléfono.
- Barra superior con buscador, notificaciones y usuario activo.
- Buen contraste.
- Tipografía legible.
- Botones grandes.
- Estados de carga.
- Mensajes de error comprensibles.
- Confirmaciones visuales al guardar.
- Navegación con teclado.
- Etiquetas accesibles.
- Formatos argentinos para fechas, horarios y moneda.

Secciones principales:

1. Inicio.
2. Productos.
3. Registrar venta.
4. Movimientos de stock.
5. Inventarios.
6. Devoluciones.
7. Calendario.
8. Análisis.
9. Empleados.
10. Ofertas.
11. Suscripción.
12. Configuración.

# 7. Guía de utilización

En la esquina superior derecha debe existir permanentemente un botón visible llamado “Guía” con un icono de ayuda.

Al presionarlo debe abrirse un panel lateral o ventana con:

- Explicación general de la aplicación.
- Primeros pasos.
- Cómo crear un producto.
- Cómo registrar una venta.
- Cómo sumar o retirar stock.
- Cómo hacer un conteo físico.
- Cómo registrar una devolución.
- Cómo crear una oferta.
- Cómo interpretar los reportes.
- Cómo pagar la mensualidad.
- Diferencia entre empleado y jefe.
- Preguntas frecuentes.
- Botón para contactar soporte: `[MEDIO DE SOPORTE]`.

La guía debe reconocer la pantalla actual y abrir directamente el tema correspondiente. Agregar pequeños recorridos guiados para la primera visita del usuario.

# 8. Administración de productos

En la pantalla Productos debe existir un botón flotante o claramente visible con el símbolo “+” y el texto “Agregar producto”.

Al presionarlo debe abrirse un formulario con:

## Datos obligatorios

- Nombre.
- Identificador interno o SKU.
- Categoría.
- Costo unitario.
- Precio de venta.
- Stock inicial.
- Unidad de medida.
- Ubicación física.

## Datos opcionales

- Código de barras.
- Descripción.
- Marca.
- Proveedor.
- Color.
- Talle o tamaño.
- Modelo.
- Variante.
- Foto.
- Stock mínimo.
- Stock ideal.
- Fecha de vencimiento, cuando corresponda.
- Notas internas.
- Oferta o descuento.
- Estado activo o archivado.

El identificador interno debe ser único dentro de cada comercio.

Una referencia representa una variante concreta. Por ejemplo, una remera negra talle M y una remera negra talle L deben considerarse referencias distintas, aunque pertenezcan al mismo producto general.

Permitir:

- Buscar por nombre, SKU o código de barras.
- Filtrar por categoría, color, ubicación, stock bajo y oferta.
- Ordenar por nombre, precio, stock y cantidad vendida.
- Editar productos.
- Duplicar productos para crear variantes.
- Importar productos desde CSV.
- Exportar productos a CSV y PDF.
- Cargar productos por lote.
- Archivar productos sin borrar su historial.

# 9. Botones “+” y “−”

El botón “+” debe permitir:

- Crear un producto nuevo desde Productos.
- Sumar unidades a un producto existente desde su ficha.
- Registrar el motivo de la entrada.
- Registrar cantidad, fecha, responsable, proveedor y observación.

El botón “−” debe permitir retirar unidades, pero no borrar silenciosamente información.

Al presionarlo, solicitar:

- Producto.
- Cantidad.
- Motivo: venta, daño, pérdida, consumo interno, traslado, corrección autorizada u otro.
- Fecha y hora.
- Usuario responsable.
- Observación.
- Evidencia opcional.
- Aprobación del jefe cuando el ajuste sea sensible.

La cantidad retirada no puede superar el stock disponible, salvo que el jefe active explícitamente una política de stock negativo.

Para eliminar un producto del catálogo utilizar una opción separada llamada “Archivar producto”, con confirmación. No hacer eliminación física si el producto tiene ventas, devoluciones o movimientos asociados.

# 10. Registro de ventas

Como los análisis dependen de las ventas, incluir un módulo simple de registro.

Permitir:

- Seleccionar uno o varios productos.
- Buscar por nombre, SKU o código de barras.
- Indicar cantidad.
- Aplicar automáticamente ofertas válidas.
- Mostrar subtotal, descuento y total.
- Elegir método de pago.
- Asociar la venta al empleado que la registró.
- Guardar fecha y hora exactas.
- Agregar una observación.
- Cancelar una venta solamente con motivo y permiso.
- Emitir un comprobante interno imprimible.
- Registrar opcionalmente un cliente sin hacerlo obligatorio.

Al confirmar una venta:

1. Guardar la venta.
2. Guardar cada artículo vendido.
3. Descontar el stock mediante movimientos de inventario.
4. Registrar el empleado vendedor.
5. Guardar el precio y descuento aplicados en ese momento.
6. Ejecutar toda la operación dentro de una transacción atómica.
7. Evitar ventas duplicadas por doble clic o reintentos.

# 11. Gastos y ganancia

Agregar un módulo para registrar gastos porque no se puede calcular una ganancia real solamente con precios de venta.

Campos de gastos:

- Concepto.
- Categoría.
- Importe.
- Fecha y hora.
- Medio de pago.
- Proveedor opcional.
- Comprobante opcional.
- Observación.
- Usuario que lo registró.
- Estado: pendiente, pagado o anulado.

Calcular claramente:

- Ingresos brutos.
- Descuentos otorgados.
- Ventas netas.
- Costo de mercadería vendida.
- Margen bruto.
- Gastos operativos.
- Devoluciones y reintegros.
- Ganancia estimada.

Fórmula base:

Ganancia estimada = ventas netas − costo de productos vendidos − gastos − reintegros.

Mostrar una aclaración indicando que es una estimación administrativa y que no reemplaza un informe contable o impositivo.

# 12. Devoluciones

Crear una sección específica de devoluciones.

Toda devolución debe relacionarse, cuando sea posible, con:

- Venta original.
- Producto.
- Variante.
- Cantidad.
- Precio abonado.
- Importe reintegrado.
- Fecha y hora.
- Empleado que la registró.
- Motivo.
- Estado del producto.
- Observación.
- Evidencia opcional.
- Aprobación del jefe cuando corresponda.

Estado del producto devuelto:

- Reingresa al stock.
- Dañado.
- Se envía al proveedor.
- No vendible.
- Pendiente de revisión.

Si reingresa al stock, crear automáticamente un movimiento de entrada. Si no es vendible, no sumarlo al stock disponible.

Mostrar por producto:

- Devoluciones del día.
- Devoluciones del mes.
- Total histórico.
- Unidades devueltas.
- Importe reintegrado.
- Porcentaje de devolución respecto de las unidades vendidas.
- Motivos más frecuentes.

No guardar “devueltos diarios” y “devueltos mensuales” como campos manuales dentro del producto. Calcularlos desde la tabla de devoluciones para evitar inconsistencias.

# 13. Ofertas y descuentos

Permitir crear ofertas para:

- Un producto.
- Una variante.
- Una categoría completa.

Tipos:

- Porcentaje de descuento.
- Monto fijo.
- Precio promocional.
- Oferta por cantidad, opcional.

Campos:

- Nombre de la oferta.
- Tipo.
- Valor.
- Fecha y hora de inicio.
- Fecha y hora de finalización.
- Productos o categorías alcanzadas.
- Estado activo.
- Descripción.
- Usuario creador.

Reglas:

- Una oferta vencida no debe aplicarse.
- El precio final nunca puede ser negativo.
- Mostrar precio original y precio final.
- Registrar en cada venta qué oferta fue aplicada.
- Definir prioridad cuando coincidan varias ofertas.
- Por defecto, no acumular ofertas salvo que el jefe lo habilite.

# 14. Dashboard del empleado

Cuando ingrese un empleado, mostrar:

- Saludo y nombre.
- Ventas realizadas hoy.
- Unidades vendidas hoy.
- Importe vendido hoy.
- Devoluciones registradas.
- Comparación con su jornada anterior.
- Productos con stock bajo que necesite conocer.
- Actividades pendientes.
- Accesos rápidos a vender, devolución, conteo y guía.

El empleado solamente debe ver datos propios o información operativa autorizada.

No mostrar un ranking humillante públicamente. La comparación completa de empleados debe quedar disponible para el jefe.

# 15. Dashboard del jefe

Cuando ingrese el jefe, mostrar:

- Ventas del día.
- Ventas del mes.
- Gastos del día y del mes.
- Ganancia estimada.
- Cantidad de productos activos.
- Unidades disponibles.
- Productos sin stock.
- Productos con stock bajo.
- Productos más vendidos.
- Productos menos vendidos.
- Categoría más vendida.
- Horarios con más ventas.
- Empleado con mayor importe vendido.
- Empleado con más unidades vendidas.
- Devoluciones del día y del mes.
- Próximo vencimiento del servicio.
- Diferencias de inventario pendientes de aprobación.

Permitir cambiar el período:

- Hoy.
- Ayer.
- Últimos 7 días.
- Mes actual.
- Mes anterior.
- Rango personalizado.

Diferenciar “quién vendió más” según:

- Importe total.
- Cantidad de ventas.
- Unidades vendidas.
- Ganancia generada.

# 16. Análisis diario automático

Generar todos los días un resumen del día anterior.

El análisis debe basarse en datos reales y contener:

- Ingresos.
- Gastos.
- Costo de mercadería vendida.
- Ganancia estimada.
- Cantidad de ventas.
- Ticket promedio.
- Producto más vendido.
- Categoría más vendida.
- Franja horaria con más ventas.
- Empleado con mayor importe vendido.
- Empleado con más unidades vendidas.
- Cantidad e importe de devoluciones.
- Productos agotados.
- Productos debajo del stock mínimo.
- Movimientos de stock inusuales.
- Diferencias de inventario pendientes.
- Comparación con el día anterior.
- Comparación con el promedio de los últimos 7 días.

Guardar una instantánea del análisis diario para conservar el historial.

El análisis debe usar cálculos determinísticos. No depender de inteligencia artificial para obtener números. Si se incorpora IA para redactar conclusiones, debe recibir datos ya calculados y no inventar resultados.

# 17. Calendario

Crear una vista mensual de calendario.

Cada día debe mostrar:

- Importe vendido.
- Cantidad de operaciones.
- Cantidad de unidades.
- Gastos.
- Ganancia estimada.
- Devoluciones.
- Indicador de inventario realizado.

Al seleccionar un día, abrir un detalle con:

- Ventas por hora.
- Ventas por categoría.
- Ventas por producto.
- Ventas por empleado.
- Métodos de pago.
- Gastos.
- Devoluciones.
- Entradas y salidas de stock.

Agregar gráficos por hora y categoría. Todos los datos deben respetar la zona horaria de Buenos Aires.

# 18. Conteo físico de inventario

Crear un módulo específico para inventarios físicos, teniendo en cuenta que el conteo es una fotografía del stock en un momento determinado.

Flujo:

1. El jefe crea una sesión de inventario.
2. Selecciona sector, categorías o productos.
3. Indica si las ventas estarán pausadas.
4. Si existen movimientos durante el conteo, deben quedar registrados.
5. Un empleado cuenta y otro registra.
6. Se permite cambiar funciones.
7. El sistema compara stock esperado con cantidad contada.
8. Las diferencias se vuelven a contar.
9. El jefe revisa y aprueba cualquier ajuste.
10. Se genera un informe final.

Campos:

- Nombre de sesión.
- Comercio.
- Sector.
- Ubicación.
- Fecha y hora de inicio y cierre.
- Responsable del conteo.
- Responsable del registro.
- Producto o referencia.
- Cantidad esperada.
- Primer conteo.
- Segundo conteo.
- Cantidad final.
- Diferencia.
- Observación.
- Estado.
- Aprobación del jefe.

Estados:

- Preparación.
- En curso.
- Recuento.
- Pendiente de aprobación.
- Finalizado.
- Cancelado.

No ajustar automáticamente el stock porque exista una diferencia. El jefe debe aprobarla.

No afirmar que una diferencia significa robo. Puede deberse a movimientos durante el conteo, ventas sin registrar, devoluciones, errores de unidad o errores de carga.

Permitir definir límites de servicio:

- Hasta `[100]` referencias.
- Hasta `[300]` unidades.
- Hasta `[4]` horas presenciales.
- Cantidad de locales.
- Sectores incluidos.
- Servicios adicionales presupuestados por separado.

# 19. Suscripción mensual y Lemon

Crear una sección llamada “Suscripción”.

Mostrar:

- Plan actual.
- Precio mensual.
- Fecha del último pago.
- Fecha del próximo vencimiento.
- Estado: activa, próxima a vencer, vencida, pendiente de confirmación o suspendida.
- Historial de pagos.
- Botón “Pagar mensualidad”.

El botón debe abrir el enlace configurable de Lemon:

`[ENLACE DE PAGO DE LEMON]`

El pago debe mostrar el monto mensual preconfigurado de:

`$[MONTO] ARS`

No permitir que un empleado modifique el monto ni el enlace.

Avisos:

- A 7 días: aviso informativo amarillo.
- A 3 días: aviso destacado naranja.
- A 1 día: aviso urgente.
- El día del vencimiento: aviso rojo.
- Después del vencimiento: indicar que el servicio está vencido.

El jefe debe poder cerrar temporalmente el aviso, pero debe reaparecer en el siguiente inicio de sesión mientras siga pendiente.

Si no existe verificación automática confiable:

1. El usuario presiona “Ya realicé el pago”.
2. Puede adjuntar un comprobante.
3. El estado cambia a “Pendiente de confirmación”.
4. Un administrador autorizado verifica el pago.
5. Recién entonces se actualiza el vencimiento.

No bloquear ni eliminar información ante un vencimiento. Si se decide limitar funciones, ofrecer un período de gracia configurable y mantener el acceso de solo lectura.

# 20. Modelo de datos

Diseñar como mínimo las siguientes tablas:

## businesses

- id
- name
- tax_identifier opcional
- timezone
- currency
- active
- created_at
- updated_at

## users o profiles

- id
- business_id
- auth_user_id
- name
- email
- role: boss o employee
- active
- last_login_at
- created_at
- updated_at

## products

- id
- business_id
- internal_identifier
- barcode
- name
- description
- brand
- category_id
- supplier_id opcional
- cost_price
- sale_price
- color
- size
- model
- variant
- unit_of_measure
- minimum_stock
- ideal_stock
- location_id
- image_url
- expiration_date opcional
- active
- created_at
- updated_at

## categories

- id
- business_id
- name
- description
- active

## locations

- id
- business_id
- name
- description
- active

## suppliers

- id
- business_id
- name
- contact_information
- notes
- active

## inventory_movements

- id
- business_id
- product_id
- movement_type
- quantity
- previous_stock
- resulting_stock
- reason
- reference_type
- reference_id
- notes
- performed_by
- approved_by opcional
- occurred_at
- created_at

## sales

- id
- business_id
- sale_number
- seller_id
- customer_id opcional
- subtotal
- discount_total
- total
- payment_method
- status
- notes
- sold_at
- created_at

## sale_items

- id
- sale_id
- product_id
- quantity
- unit_cost_snapshot
- unit_price_snapshot
- discount_snapshot
- final_unit_price
- line_total
- offer_id opcional

## expenses

- id
- business_id
- concept
- category
- amount
- payment_method
- supplier_id opcional
- receipt_url opcional
- status
- notes
- registered_by
- occurred_at
- created_at

## returns

- id
- business_id
- original_sale_id opcional
- sale_item_id opcional
- product_id
- quantity
- paid_unit_price
- refund_amount
- reason
- product_condition
- returns_to_available_stock
- status
- registered_by
- approved_by opcional
- returned_at
- created_at

## offers

- id
- business_id
- name
- offer_type
- value
- applies_to
- product_id opcional
- category_id opcional
- starts_at
- ends_at
- stackable
- priority
- active
- created_by
- created_at

## inventory_sessions

- id
- business_id
- name
- sector
- status
- movements_paused
- started_at
- ended_at
- created_by
- approved_by opcional
- notes

## inventory_count_items

- id
- inventory_session_id
- product_id
- expected_quantity
- first_count
- second_count
- final_count
- difference
- counted_by
- verified_by
- notes
- adjustment_approved

## subscriptions

- id
- business_id
- plan_name
- monthly_amount
- currency
- payment_url
- status
- last_paid_at
- next_due_at
- grace_period_days
- created_at
- updated_at

## subscription_payments

- id
- subscription_id
- amount
- currency
- payment_method
- external_reference opcional
- receipt_url opcional
- status
- submitted_by
- verified_by opcional
- paid_at
- verified_at
- created_at

## daily_summaries

- id
- business_id
- summary_date
- gross_income
- net_sales
- cost_of_goods
- expenses
- refunds
- estimated_profit
- sales_count
- units_sold
- average_ticket
- top_product_id
- top_category_id
- top_seller_id
- returns_count
- generated_at

## audit_logs

- id
- business_id
- user_id
- action
- entity_type
- entity_id
- previous_values
- new_values
- ip_address opcional
- created_at

El stock disponible no debe depender de un campo modificado sin control. Debe surgir de movimientos de inventario o mantenerse como valor resumido actualizado transaccionalmente.

# 21. Seguridad y privacidad

Implementar:

- Row Level Security en todas las tablas privadas.
- Separación por business_id.
- Políticas diferentes para jefe y empleado.
- Validación de permisos en el servidor.
- Protección contra manipulación del rol desde el navegador.
- Protección contra lectura o modificación de otro comercio.
- Auditoría de operaciones sensibles.
- URLs privadas y temporales para comprobantes.
- Copias de seguridad.
- Sanitización de entradas.
- Protección contra inyección.
- Límite de intentos de acceso.
- Confirmación para operaciones irreversibles.
- Eliminación lógica en lugar de eliminación física.
- Registro de cambios de precio, stock, ofertas, roles y suscripción.
- Exportación de datos del comercio.
- Política de conservación y eliminación de archivos.

Probar expresamente:

- Que un empleado no pueda convertirse en jefe modificando una solicitud.
- Que un usuario de un comercio no pueda leer otro comercio.
- Que un empleado no pueda cambiar el precio de la suscripción.
- Que no puedan modificarse ventas pasadas sin dejar auditoría.
- Que una devolución no aumente stock dos veces.
- Que un doble clic no cree una venta duplicada.

# 22. Datos de demostración

Crear datos de prueba claramente identificados:

- Un comercio.
- Un jefe.
- Dos empleados.
- Cinco categorías.
- Veinte productos con distintas variantes.
- Ventas distribuidas en varios días y horarios.
- Gastos.
- Tres devoluciones con resultados distintos.
- Productos con stock normal, bajo y agotado.
- Dos ofertas.
- Una sesión de inventario con diferencias.
- Una suscripción próxima a vencer.

No mezclar los datos de demostración con los datos reales una vez activada la aplicación.

# 23. Estados vacíos y mensajes

No mostrar pantallas vacías sin explicación.

Ejemplos:

- “Todavía no hay productos. Presioná + para agregar el primero.”
- “No existen ventas para este período.”
- “No se encontraron diferencias en este inventario.”
- “No hay devoluciones registradas este mes.”
- “La mensualidad vence dentro de 3 días.”
- “No pudimos guardar el movimiento. Revisá los datos e intentá nuevamente.”

Los errores deben explicar qué ocurrió y cómo resolverlo, sin mostrar detalles técnicos sensibles.

# 24. Pruebas de aceptación

La aplicación se considera terminada solamente si se comprueba que:

1. Un usuario no autenticado no puede acceder.
2. Jefe y empleado ven paneles diferentes.
3. El botón Guía aparece arriba a la derecha.
4. El botón “+” crea productos y registra entradas.
5. El botón “−” registra salidas con motivo y auditoría.
6. Archivar un producto no borra su historial.
7. Una venta descuenta stock correctamente.
8. Una devolución puede reintegrar stock según su estado.
9. Las devoluciones diarias y mensuales se calculan correctamente.
10. Las ofertas por producto y categoría respetan fechas y prioridades.
11. El calendario muestra ventas por día, categoría y horario.
12. El análisis diario coincide con los datos de origen.
13. El jefe puede ver stock, costos y ganancias.
14. El empleado no puede ver información restringida.
15. Las diferencias de inventario requieren aprobación.
16. El botón de pago abre el enlace de Lemon configurado.
17. El aviso aparece cuando faltan 7, 3 y 1 días.
18. Un comprobante no confirma automáticamente el pago.
19. Los datos de dos comercios permanecen completamente separados.
20. La aplicación funciona correctamente en teléfono y computadora.
21. Todas las acciones críticas dejan registro de auditoría.
22. Los cálculos utilizan ARS y la zona horaria de Buenos Aires.

# 25. Orden obligatorio de implementación

Trabajá por etapas y no intentes construir todo simultáneamente.

## Etapa 1: Base segura

- Base de datos.
- Autenticación.
- Roles.
- Permisos.
- Navegación.
- Configuración del comercio.

## Etapa 2: Inventario mínimo funcional

- Productos.
- Categorías.
- Ubicaciones.
- Entradas y salidas.
- Stock bajo.
- Historial de movimientos.

## Etapa 3: Operación comercial

- Ventas.
- Gastos.
- Devoluciones.
- Ofertas.

## Etapa 4: Control físico

- Sesiones de inventario.
- Recuentos.
- Diferencias.
- Aprobaciones.

## Etapa 5: Información gerencial

- Dashboard del jefe.
- Dashboard del empleado.
- Calendario.
- Análisis diario.
- Exportaciones.

## Etapa 6: Suscripción

- Datos del plan.
- Link de Lemon.
- Historial de pagos.
- Avisos de vencimiento.
- Confirmación manual o automática si existe una integración verificable.

## Etapa 7: Calidad

- Pruebas.
- Seguridad.
- Rendimiento.
- Accesibilidad.
- Responsive.
- Datos de demostración.
- Guía de utilización.

Al terminar cada etapa:

1. Explicá qué se implementó.
2. Indicá qué archivos o componentes se crearon.
3. Mostrá cómo probarlo.
4. Ejecutá las pruebas.
5. Corregí errores antes de continuar.
6. No marques funciones incompletas como terminadas.

# 26. Resultado esperado

Entregá:

- Aplicación web funcional.
- Código organizado.
- Base de datos y migraciones.
- Políticas de seguridad.
- Datos de demostración.
- Instrucciones de instalación.
- Variables de entorno de ejemplo sin secretos reales.
- Manual de uso.
- Manual breve del administrador.
- Pruebas realizadas.
- Lista de decisiones técnicas.
- Limitaciones conocidas.
- Recomendaciones para una segunda versión.

Antes de escribir código, presentá:

1. Resumen de la solución.
2. Mapa de pantallas.
3. Modelo de datos.
4. Matriz de permisos.
5. Flujo de ventas.
6. Flujo de devoluciones.
7. Flujo de inventario físico.
8. Flujo de suscripción.
9. Elección de base de datos con justificación.
10. Plan de construcción por etapas.

Después de presentar ese plan, comenzá directamente la implementación de la Etapa 1.

No reduzcas las funciones solicitadas, no uses datos simulados como solución definitiva y no des por terminada la aplicación hasta haber validado todos los criterios de aceptación.