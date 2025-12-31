# Manual de Usuario - Minimal Gym

Este manual describe el uso del sistema de gimnasio (web) para administracion y operacion diaria.

## Acceso
- URL: abrir el dominio configurado por tu empresa.
- Iniciar sesion con tu usuario y password.
- En la primera ejecucion puede aparecer el boton de crear admin inicial.

## Menu principal
- Dashboard: indicadores en tiempo real (membresias activas, check-ins de hoy, pagos, caja).
- Members: altas, edicion y consulta de miembros.
- Membership Plans: planes y precios de membresia.
- Subscriptions: suscripciones de miembros (renovaciones y cambios de plan).
- Payments: pagos de suscripciones.
- Products: productos y precios.
- Sales: ventas de productos (POS).
- Cash: apertura y cierre de caja.
- Expenses: gastos operativos.
- Reports: reportes de ingresos, inventario y suscripciones.
- Audit: bitacora de cambios.
- Config: impuestos, recibos y logo.
- Check-ins: historial y control de entrada.

## Members
- Ir a Members y usar "Add member".
- Captura nombre, contacto, foto y estado.
- Editar desde la tabla o abrir el QR del miembro.
- El QR contiene el ID del miembro.

## Check-in publico
- Pantalla publica: /checkin
- Se puede escanear QR o usar un escaner con teclado.
- El sistema valida membresia activa y registra el check-in automaticamente.

## Products
- Ir a Products y usar "Add product".
- Captura SKU (unico), nombre, precio, costo, categoria y foto.
- El grid muestra la foto y el estado activo.

## Sales (POS)
- Ir a Sales y usar "New sale".
- Seleccionar productos desde el grid y ajustar cantidades.
- Revisar carrito y totales.
- Registrar pago opcional (metodo y monto).

## Payments
- Ir a Payments y usar "Record payment".
- Seleccionar miembro, suscripcion, metodo y monto.
- Pagos no-cash requieren comprobante.

## Subscriptions
- Crear suscripcion desde la fila del miembro.
- Renovar redirige a pago.
- Upgrade/Downgrade plan crea una suscripcion nueva y solicita pago antes de cancelar la anterior.

## Expenses
- Ir a Expenses y usar "Add expense".
- Capturar descripcion, monto, fecha y notas.

## Cash
- Abrir caja antes de registrar ventas/pagos.
- Cerrar caja al final del dia.
- La caja debe estar abierta para crear/renovar/cambiar suscripciones.

## Configuracion
- Cambiar impuestos, prefijo/folio de recibo y logo.
- El logo aparece en el login y la barra lateral.

## Consejos
- Usar HTTPS en dispositivos moviles para activar camara.
- Mantener SKUs unicos para evitar errores.

## Versiones
- Las versiones del API y del frontend se muestran en el login y en la barra lateral.

