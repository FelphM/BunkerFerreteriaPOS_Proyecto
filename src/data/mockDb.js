/**
 * mockDb.js
 * ---------------------------------------------------------------------------
 * Base de datos SIMULADA del sistema Ferromat S.A.
 *
 * Cada arreglo de este archivo equivale 1:1 a una tabla del esquema SQL de
 * produccion (ver script maestro de Supabase). Los nombres de columna,
 * relaciones y restricciones se respetan para que la migracion a Supabase
 * consista solo en reemplazar las funciones de `queries.js`.
 *
 * EQUIPO (Vicente Munoz / Vicente Varela):
 *  - Los `id` aqui son strings legibles (ej: 'prod-1'). En Supabase seran
 *    UUID reales generados por `gen_random_uuid()`.
 *  - Las columnas GENERATED del esquema (`precio_venta`, `subtotal`) y los
 *    totales que mantienen los triggers se calculan aqui en el "builder"
 *    del final del archivo, para que el dato mock sea siempre consistente.
 *  - `categorias.icono` es un campo SOLO-UI (no existe en el esquema); se usa
 *    para pintar iconos de Bootstrap y puede ignorarse en la BD real.
 * ---------------------------------------------------------------------------
 */

// --- Utilidades internas de generacion -------------------------------------
const AHORA = new Date();
/** ISO string de hace `dias` (y opcionalmente `horas`), relativo a hoy. */
const hace = (dias, horas = 0) =>
  new Date(AHORA.getTime() - dias * 86400000 - horas * 3600000).toISOString();
/**
 * ISO string anclado al DIA DE HOY a una hora fija. Se usa para las ventas
 * "de hoy" para que el KPI funcione sin importar la hora a la que se abra
 * el sistema (restar horas a `AHORA` podria cruzar la medianoche).
 */
const hoyALas = (hora, minuto = 0) => {
  const d = new Date(AHORA);
  d.setHours(hora, minuto, 0, 0);
  return d.toISOString();
};
/** Redondeo a 2 decimales (NUMERIC(10,2) del esquema). */
const round2 = (n) => Math.round(n * 100) / 100;

// ===========================================================================
// TABLA: categorias
// ===========================================================================
const categorias = [
  { id: 'cat-1', nombre: 'Herramientas', descripcion: 'Herramientas manuales y electricas', icono: 'bi-tools', creado_en: hace(120) },
  { id: 'cat-2', nombre: 'Tornilleria', descripcion: 'Tornillos, clavos y fijaciones', icono: 'bi-nut', creado_en: hace(120) },
  { id: 'cat-3', nombre: 'Electricidad', descripcion: 'Material electrico', icono: 'bi-lightning-charge', creado_en: hace(120) },
  { id: 'cat-4', nombre: 'Plomeria', descripcion: 'Gasfiteria y agua', icono: 'bi-droplet', creado_en: hace(120) },
  { id: 'cat-5', nombre: 'Pinturas', descripcion: 'Pinturas y accesorios', icono: 'bi-palette', creado_en: hace(120) },
  { id: 'cat-6', nombre: 'Construccion', descripcion: 'Materiales de obra gruesa', icono: 'bi-bricks', creado_en: hace(120) },
];

// ===========================================================================
// TABLA: proveedores
// ===========================================================================
const proveedores = [
  { id: 'prov-1', nombre: 'Importadora El Tornillo Ltda.', telefono: '+56 2 2345 6780', correo: 'ventas@eltornillo.cl', direccion: 'Av. Industrial 1240, Santiago', observaciones: 'Despacho semanal los martes.', creado_en: hace(110) },
  { id: 'prov-2', nombre: 'Distribuidora Tigre S.A.', telefono: '+56 2 2987 1100', correo: 'contacto@tigredist.cl', direccion: 'Camino a Melipilla 5500, Maipu', observaciones: 'Pedido minimo 20 UF.', creado_en: hace(105) },
  { id: 'prov-3', nombre: 'Comercial Bosch Chile', telefono: '+56 2 2410 9000', correo: 'pedidos@boschcomercial.cl', direccion: 'Av. El Bosque 1230, Las Condes', observaciones: 'Herramientas con garantia 12 meses.', creado_en: hace(98) },
  { id: 'prov-4', nombre: 'Pinturas Sipa Distribucion', telefono: '+56 2 2555 4321', correo: 'distribucion@sipa.cl', direccion: 'Ruta 5 Sur Km 18, San Bernardo', observaciones: '', creado_en: hace(80) },
  { id: 'prov-5', nombre: 'Aceros y Cementos del Sur', telefono: '+56 41 2233 445', correo: 'ventas@acerosdelsur.cl', direccion: 'Av. Las Industrias 800, Concepcion', observaciones: 'Despacho de cemento solo en pallet.', creado_en: hace(60) },
];

// ===========================================================================
// TABLA: productos
// ===========================================================================
const productos = [
  { id: 'prod-1', nombre: 'Martillo Carpintero', descripcion: 'Martillo de una con mango de fibra', categoria_id: 'cat-1', proveedor_id: 'prov-3', codigo_interno: 'HER-001', activo: true, creado_en: hace(90), actualizado_en: hace(5) },
  { id: 'prod-2', nombre: 'Juego de Desarmadores', descripcion: 'Set de desarmadores planos y cruz', categoria_id: 'cat-1', proveedor_id: 'prov-3', codigo_interno: 'HER-002', activo: true, creado_en: hace(90), actualizado_en: hace(20) },
  { id: 'prod-3', nombre: 'Llave Inglesa', descripcion: 'Llave ajustable de acero cromado', categoria_id: 'cat-1', proveedor_id: 'prov-1', codigo_interno: 'HER-003', activo: true, creado_en: hace(88), actualizado_en: hace(12) },
  { id: 'prod-4', nombre: 'Taladro Percutor', descripcion: 'Taladro percutor electrico 650 W', categoria_id: 'cat-1', proveedor_id: 'prov-3', codigo_interno: 'HER-004', activo: true, creado_en: hace(70), actualizado_en: hace(3) },
  { id: 'prod-5', nombre: 'Tornillo Autoperforante', descripcion: 'Tornillo para metal y madera', categoria_id: 'cat-2', proveedor_id: 'prov-1', codigo_interno: 'TOR-001', activo: true, creado_en: hace(85), actualizado_en: hace(8) },
  { id: 'prod-6', nombre: 'Clavos de Acero', descripcion: 'Clavos de acero corriente', categoria_id: 'cat-2', proveedor_id: 'prov-1', codigo_interno: 'TOR-002', activo: true, creado_en: hace(85), actualizado_en: hace(8) },
  { id: 'prod-7', nombre: 'Tarugos Plasticos', descripcion: 'Tarugo plastico para muro', categoria_id: 'cat-2', proveedor_id: 'prov-1', codigo_interno: 'TOR-003', activo: true, creado_en: hace(85), actualizado_en: hace(40) },
  { id: 'prod-8', nombre: 'Cable Electrico Cobre', descripcion: 'Cable de cobre con aislacion', categoria_id: 'cat-3', proveedor_id: 'prov-2', codigo_interno: 'ELE-001', activo: true, creado_en: hace(75), actualizado_en: hace(2) },
  { id: 'prod-9', nombre: 'Interruptor Simple', descripcion: 'Interruptor de pared 9/12', categoria_id: 'cat-3', proveedor_id: 'prov-2', codigo_interno: 'ELE-002', activo: true, creado_en: hace(75), actualizado_en: hace(15) },
  { id: 'prod-10', nombre: 'Foco LED', descripcion: 'Ampolleta LED luz fria', categoria_id: 'cat-3', proveedor_id: 'prov-2', codigo_interno: 'ELE-003', activo: true, creado_en: hace(72), actualizado_en: hace(6) },
  { id: 'prod-11', nombre: 'Tubo PVC Tigre', descripcion: 'Tuberia PVC presion', categoria_id: 'cat-4', proveedor_id: 'prov-2', codigo_interno: 'PLO-001', activo: true, creado_en: hace(70), actualizado_en: hace(4) },
  { id: 'prod-12', nombre: 'Llave de Paso', descripcion: 'Llave de paso bronce', categoria_id: 'cat-4', proveedor_id: 'prov-2', codigo_interno: 'PLO-002', activo: true, creado_en: hace(68), actualizado_en: hace(18) },
  { id: 'prod-13', nombre: 'Cinta de Teflon', descripcion: 'Cinta selladora para roscas', categoria_id: 'cat-4', proveedor_id: 'prov-2', codigo_interno: 'PLO-003', activo: true, creado_en: hace(68), actualizado_en: hace(30) },
  { id: 'prod-14', nombre: 'Pintura Latex', descripcion: 'Pintura latex lavable', categoria_id: 'cat-5', proveedor_id: 'prov-4', codigo_interno: 'PIN-001', activo: true, creado_en: hace(60), actualizado_en: hace(7) },
  { id: 'prod-15', nombre: 'Brocha', descripcion: 'Brocha de cerda natural', categoria_id: 'cat-5', proveedor_id: 'prov-4', codigo_interno: 'PIN-002', activo: true, creado_en: hace(60), actualizado_en: hace(25) },
  { id: 'prod-16', nombre: 'Rodillo de Pintura', descripcion: 'Rodillo con marco metalico', categoria_id: 'cat-5', proveedor_id: 'prov-4', codigo_interno: 'PIN-003', activo: true, creado_en: hace(58), actualizado_en: hace(25) },
  { id: 'prod-17', nombre: 'Cemento Melon', descripcion: 'Cemento de uso general', categoria_id: 'cat-6', proveedor_id: 'prov-5', codigo_interno: 'CON-001', activo: true, creado_en: hace(55), actualizado_en: hace(1) },
  { id: 'prod-18', nombre: 'Candado de Seguridad', descripcion: 'Candado de bronce reforzado', categoria_id: 'cat-6', proveedor_id: 'prov-5', codigo_interno: 'CON-002', activo: false, creado_en: hace(50), actualizado_en: hace(9) },
];

// ===========================================================================
// TABLA: producto_variantes
// `precio_venta` se calcula abajo (columna GENERATED del esquema).
// ===========================================================================
const producto_variantes = [
  { id: 'var-1', producto_id: 'prod-1', codigo_barras: '7800001', variante_nombre: '16 oz', unidad_venta: 'pza', activo: true, precio_compra: 5500, margen_ganancia: 60, stock_actual: 25, stock_minimo: 5, actualizado_en: hace(5) },
  { id: 'var-2', producto_id: 'prod-2', codigo_barras: '7800002', variante_nombre: '6 piezas', unidad_venta: 'set', activo: true, precio_compra: 3100, margen_ganancia: 60, stock_actual: 50, stock_minimo: 8, actualizado_en: hace(20) },
  { id: 'var-3', producto_id: 'prod-3', codigo_barras: '7800003', variante_nombre: '10 Pulgadas', unidad_venta: 'pza', activo: true, precio_compra: 8000, margen_ganancia: 60, stock_actual: 15, stock_minimo: 5, actualizado_en: hace(12) },
  { id: 'var-4', producto_id: 'prod-4', codigo_barras: '7800004', variante_nombre: '650 W', unidad_venta: 'pza', activo: true, precio_compra: 26000, margen_ganancia: 55, stock_actual: 6, stock_minimo: 4, actualizado_en: hace(3) },
  { id: 'var-5', producto_id: 'prod-5', codigo_barras: '7800005', variante_nombre: '6 x 1"', unidad_venta: 'bolsa', activo: true, precio_compra: 1200, margen_ganancia: 65, stock_actual: 150, stock_minimo: 30, actualizado_en: hace(8) },
  { id: 'var-6', producto_id: 'prod-5', codigo_barras: '7800006', variante_nombre: '8 x 1.1/2"', unidad_venta: 'bolsa', activo: true, precio_compra: 1500, margen_ganancia: 65, stock_actual: 90, stock_minimo: 30, actualizado_en: hace(8) },
  { id: 'var-7', producto_id: 'prod-6', codigo_barras: '7800007', variante_nombre: '2 Pulgadas', unidad_venta: 'kg', activo: true, precio_compra: 1250, margen_ganancia: 60, stock_actual: 80, stock_minimo: 20, actualizado_en: hace(8) },
  { id: 'var-8', producto_id: 'prod-7', codigo_barras: '7800008', variante_nombre: 'N. 8', unidad_venta: 'bolsa', activo: true, precio_compra: 900, margen_ganancia: 60, stock_actual: 200, stock_minimo: 40, actualizado_en: hace(40) },
  { id: 'var-9', producto_id: 'prod-8', codigo_barras: '7800009', variante_nombre: '1.5 mm', unidad_venta: 'metro', activo: true, precio_compra: 420, margen_ganancia: 65, stock_actual: 320, stock_minimo: 50, actualizado_en: hace(2) },
  { id: 'var-10', producto_id: 'prod-8', codigo_barras: '7800010', variante_nombre: '2.5 mm', unidad_venta: 'metro', activo: true, precio_compra: 600, margen_ganancia: 65, stock_actual: 210.5, stock_minimo: 50, actualizado_en: hace(2) },
  { id: 'var-11', producto_id: 'prod-9', codigo_barras: '7800011', variante_nombre: '9/12', unidad_venta: 'pza', activo: true, precio_compra: 1850, margen_ganancia: 60, stock_actual: 60, stock_minimo: 12, actualizado_en: hace(15) },
  { id: 'var-12', producto_id: 'prod-10', codigo_barras: '7800012', variante_nombre: '9 W Luz Fria', unidad_venta: 'pza', activo: true, precio_compra: 2100, margen_ganancia: 65, stock_actual: 100, stock_minimo: 20, actualizado_en: hace(6) },
  { id: 'var-13', producto_id: 'prod-11', codigo_barras: '7800013', variante_nombre: '1/2 Pulgada', unidad_venta: 'metro', activo: true, precio_compra: 940, margen_ganancia: 60, stock_actual: 15.5, stock_minimo: 20, actualizado_en: hace(4) },
  { id: 'var-14', producto_id: 'prod-11', codigo_barras: '7800014', variante_nombre: '3/4 Pulgada', unidad_venta: 'metro', activo: true, precio_compra: 1250, margen_ganancia: 60, stock_actual: 8, stock_minimo: 15, actualizado_en: hace(4) },
  { id: 'var-15', producto_id: 'prod-12', codigo_barras: '7800015', variante_nombre: '1/2 Pulgada', unidad_venta: 'pza', activo: true, precio_compra: 5600, margen_ganancia: 60, stock_actual: 12, stock_minimo: 6, actualizado_en: hace(18) },
  { id: 'var-16', producto_id: 'prod-13', codigo_barras: '7800016', variante_nombre: 'Estandar', unidad_venta: 'pza', activo: true, precio_compra: 420, margen_ganancia: 65, stock_actual: 150, stock_minimo: 30, actualizado_en: hace(30) },
  { id: 'var-17', producto_id: 'prod-14', codigo_barras: '7800017', variante_nombre: 'Galon Blanco', unidad_venta: 'galon', activo: true, precio_compra: 11800, margen_ganancia: 60, stock_actual: 8, stock_minimo: 10, actualizado_en: hace(7) },
  { id: 'var-18', producto_id: 'prod-15', codigo_barras: '7800018', variante_nombre: '4 Pulgadas', unidad_venta: 'pza', activo: true, precio_compra: 2150, margen_ganancia: 62, stock_actual: 35, stock_minimo: 10, actualizado_en: hace(25) },
  { id: 'var-19', producto_id: 'prod-16', codigo_barras: '7800019', variante_nombre: '9 Pulgadas', unidad_venta: 'pza', activo: true, precio_compra: 3100, margen_ganancia: 60, stock_actual: 20, stock_minimo: 8, actualizado_en: hace(25) },
  { id: 'var-20', producto_id: 'prod-17', codigo_barras: '7800020', variante_nombre: 'Saco 25 Kg', unidad_venta: 'saco', activo: true, precio_compra: 3650, margen_ganancia: 50, stock_actual: 50, stock_minimo: 15, actualizado_en: hace(1) },
  { id: 'var-21', producto_id: 'prod-18', codigo_barras: '7800021', variante_nombre: '50 mm', unidad_venta: 'pza', activo: false, precio_compra: 4350, margen_ganancia: 60, stock_actual: 0, stock_minimo: 5, actualizado_en: hace(9) },
].map((v) => ({
  // precio_venta: columna GENERATED -> precio_compra * (1 + margen/100)
  ...v,
  precio_venta: round2(v.precio_compra * (1 + v.margen_ganancia / 100)),
}));

/** Busca el precio_venta vigente de una variante (para los detalles). */
const precioVenta = (varianteId) =>
  producto_variantes.find((v) => v.id === varianteId)?.precio_venta ?? 0;
/** Busca el precio_compra vigente de una variante (para los detalles). */
const precioCompra = (varianteId) =>
  producto_variantes.find((v) => v.id === varianteId)?.precio_compra ?? 0;

// ===========================================================================
// TABLA: ventas  (el `total` lo completa el builder al final)
// ===========================================================================
const ventas = [
  { id: 'venta-1', numero_venta: 1001, nombre_cliente: 'Constructora Andes Ltda.', rut_cliente: '76.543.210-K', correo_cliente: 'compras@andes.cl', metodo_pago: 'Transferencia', observaciones: 'Despacho a obra Sector Norte.', creado_en: hoyALas(12, 5) },
  { id: 'venta-2', numero_venta: 1002, nombre_cliente: 'Cliente General', rut_cliente: null, correo_cliente: null, metodo_pago: 'Efectivo', observaciones: '', creado_en: hoyALas(10, 30) },
  { id: 'venta-3', numero_venta: 1003, nombre_cliente: 'Juan Perez', rut_cliente: '12.345.678-9', correo_cliente: 'jperez@gmail.com', metodo_pago: 'Transbank', observaciones: '', creado_en: hoyALas(9, 15) },
  { id: 'venta-4', numero_venta: 1004, nombre_cliente: 'Maestro Luis Soto', rut_cliente: '9.876.543-2', correo_cliente: null, metodo_pago: 'Efectivo', observaciones: 'Cliente frecuente.', creado_en: hace(1, 3) },
  { id: 'venta-5', numero_venta: 1005, nombre_cliente: 'Ferreteria Don Pedro', rut_cliente: '77.111.222-3', correo_cliente: 'donpedro@ferre.cl', metodo_pago: 'Transferencia', observaciones: '', creado_en: hace(1, 7) },
  { id: 'venta-6', numero_venta: 1006, nombre_cliente: 'Cliente General', rut_cliente: null, correo_cliente: null, metodo_pago: 'Efectivo', observaciones: '', creado_en: hace(2, 5) },
  { id: 'venta-7', numero_venta: 1007, nombre_cliente: 'Constructora Andes Ltda.', rut_cliente: '76.543.210-K', correo_cliente: 'compras@andes.cl', metodo_pago: 'Transferencia', observaciones: '', creado_en: hace(3, 2) },
  { id: 'venta-8', numero_venta: 1008, nombre_cliente: 'Maria Gonzalez', rut_cliente: '15.678.901-4', correo_cliente: 'mariag@gmail.com', metodo_pago: 'Transbank', observaciones: '', creado_en: hace(5, 4) },
  { id: 'venta-9', numero_venta: 1009, nombre_cliente: 'Juan Perez', rut_cliente: '12.345.678-9', correo_cliente: 'jperez@gmail.com', metodo_pago: 'Efectivo', observaciones: '', creado_en: hace(8, 6) },
  { id: 'venta-10', numero_venta: 1010, nombre_cliente: 'Maestro Luis Soto', rut_cliente: '9.876.543-2', correo_cliente: null, metodo_pago: 'Efectivo', observaciones: 'Proyecto bano.', creado_en: hace(12, 3) },
  { id: 'venta-11', numero_venta: 1011, nombre_cliente: 'Cliente General', rut_cliente: null, correo_cliente: null, metodo_pago: 'Transbank', observaciones: '', creado_en: hace(16, 5) },
  { id: 'venta-12', numero_venta: 1012, nombre_cliente: 'Ferreteria Don Pedro', rut_cliente: '77.111.222-3', correo_cliente: 'donpedro@ferre.cl', metodo_pago: 'Transferencia', observaciones: 'Pedido mayorista.', creado_en: hace(20, 2) },
  { id: 'venta-13', numero_venta: 1013, nombre_cliente: 'Constructora Andes Ltda.', rut_cliente: '76.543.210-K', correo_cliente: 'compras@andes.cl', metodo_pago: 'Transferencia', observaciones: '', creado_en: hace(25, 4) },
  { id: 'venta-14', numero_venta: 1014, nombre_cliente: 'Cliente General', rut_cliente: null, correo_cliente: null, metodo_pago: 'Efectivo', observaciones: '', creado_en: hace(29, 3) },
];

// ===========================================================================
// TABLA: detalle_ventas
// `precio_unitario` por defecto = precio_venta vigente de la variante.
// `subtotal` (GENERATED) lo completa el builder.
// ===========================================================================
const detalle_ventas = [
  // venta-1
  { id: 'dv-1', venta_id: 'venta-1', variante_id: 'var-20', cantidad: 10 },
  { id: 'dv-2', venta_id: 'venta-1', variante_id: 'var-7', cantidad: 5 },
  { id: 'dv-3', venta_id: 'venta-1', variante_id: 'var-5', cantidad: 8 },
  { id: 'dv-4', venta_id: 'venta-1', variante_id: 'var-13', cantidad: 12 },
  // venta-2
  { id: 'dv-5', venta_id: 'venta-2', variante_id: 'var-12', cantidad: 2 },
  { id: 'dv-6', venta_id: 'venta-2', variante_id: 'var-16', cantidad: 3 },
  // venta-3
  { id: 'dv-7', venta_id: 'venta-3', variante_id: 'var-3', cantidad: 1 },
  { id: 'dv-8', venta_id: 'venta-3', variante_id: 'var-2', cantidad: 1 },
  // venta-4
  { id: 'dv-9', venta_id: 'venta-4', variante_id: 'var-9', cantidad: 25 },
  { id: 'dv-10', venta_id: 'venta-4', variante_id: 'var-11', cantidad: 4 },
  // venta-5
  { id: 'dv-11', venta_id: 'venta-5', variante_id: 'var-17', cantidad: 2 },
  { id: 'dv-12', venta_id: 'venta-5', variante_id: 'var-18', cantidad: 2 },
  { id: 'dv-13', venta_id: 'venta-5', variante_id: 'var-19', cantidad: 1 },
  // venta-6
  { id: 'dv-14', venta_id: 'venta-6', variante_id: 'var-8', cantidad: 3 },
  { id: 'dv-15', venta_id: 'venta-6', variante_id: 'var-5', cantidad: 2 },
  // venta-7
  { id: 'dv-16', venta_id: 'venta-7', variante_id: 'var-20', cantidad: 15 },
  { id: 'dv-17', venta_id: 'venta-7', variante_id: 'var-1', cantidad: 2 },
  // venta-8
  { id: 'dv-18', venta_id: 'venta-8', variante_id: 'var-12', cantidad: 4 },
  { id: 'dv-19', venta_id: 'venta-8', variante_id: 'var-16', cantidad: 2 },
  // venta-9
  { id: 'dv-20', venta_id: 'venta-9', variante_id: 'var-4', cantidad: 1 },
  // venta-10
  { id: 'dv-21', venta_id: 'venta-10', variante_id: 'var-13', cantidad: 6 },
  { id: 'dv-22', venta_id: 'venta-10', variante_id: 'var-14', cantidad: 4 },
  { id: 'dv-23', venta_id: 'venta-10', variante_id: 'var-15', cantidad: 2 },
  // venta-11
  { id: 'dv-24', venta_id: 'venta-11', variante_id: 'var-1', cantidad: 1 },
  { id: 'dv-25', venta_id: 'venta-11', variante_id: 'var-18', cantidad: 3 },
  // venta-12
  { id: 'dv-26', venta_id: 'venta-12', variante_id: 'var-20', cantidad: 20 },
  // venta-13
  { id: 'dv-27', venta_id: 'venta-13', variante_id: 'var-9', cantidad: 50 },
  { id: 'dv-28', venta_id: 'venta-13', variante_id: 'var-10', cantidad: 30 },
  // venta-14
  { id: 'dv-29', venta_id: 'venta-14', variante_id: 'var-6', cantidad: 4 },
  { id: 'dv-30', venta_id: 'venta-14', variante_id: 'var-7', cantidad: 10 },
].map((d) => {
  const precio_unitario = d.precio_unitario ?? precioVenta(d.variante_id);
  return { ...d, precio_unitario, subtotal: round2(d.cantidad * precio_unitario) };
});

// ===========================================================================
// TABLA: compras  (el `total` lo completa el builder)
// ===========================================================================
const compras = [
  { id: 'compra-1', numero_compra: 501, proveedor_id: 'prov-1', estado: 'CONFIRMADA', observaciones: 'Reposicion mensual de tornilleria.', creado_en: hace(4) },
  { id: 'compra-2', numero_compra: 502, proveedor_id: 'prov-2', estado: 'CONFIRMADA', observaciones: 'Material electrico y plomeria.', creado_en: hace(10) },
  { id: 'compra-3', numero_compra: 503, proveedor_id: 'prov-3', estado: 'BORRADOR', observaciones: 'Pendiente confirmar precios de herramientas.', creado_en: hace(1) },
  { id: 'compra-4', numero_compra: 504, proveedor_id: 'prov-4', estado: 'CONFIRMADA', observaciones: 'Linea pinturas temporada.', creado_en: hace(18) },
  { id: 'compra-5', numero_compra: 505, proveedor_id: 'prov-5', estado: 'ANULADA', observaciones: 'Anulada: proveedor sin stock de cemento.', creado_en: hace(7) },
  { id: 'compra-6', numero_compra: 506, proveedor_id: 'prov-1', estado: 'BORRADOR', observaciones: 'Borrador en preparacion.', creado_en: hace(0, 3) },
];

// ===========================================================================
// TABLA: detalle_compras
// `precio_unitario` por defecto = precio_compra vigente de la variante.
// ===========================================================================
const detalle_compras = [
  // compra-1
  { id: 'dc-1', compra_id: 'compra-1', variante_id: 'var-5', cantidad: 100 },
  { id: 'dc-2', compra_id: 'compra-1', variante_id: 'var-6', cantidad: 80 },
  { id: 'dc-3', compra_id: 'compra-1', variante_id: 'var-7', cantidad: 50 },
  { id: 'dc-4', compra_id: 'compra-1', variante_id: 'var-8', cantidad: 150 },
  { id: 'dc-5', compra_id: 'compra-1', variante_id: 'var-3', cantidad: 20 },
  // compra-2
  { id: 'dc-6', compra_id: 'compra-2', variante_id: 'var-9', cantidad: 300 },
  { id: 'dc-7', compra_id: 'compra-2', variante_id: 'var-10', cantidad: 200 },
  { id: 'dc-8', compra_id: 'compra-2', variante_id: 'var-11', cantidad: 60 },
  { id: 'dc-9', compra_id: 'compra-2', variante_id: 'var-12', cantidad: 100 },
  { id: 'dc-10', compra_id: 'compra-2', variante_id: 'var-13', cantidad: 40 },
  // compra-3 (borrador)
  { id: 'dc-11', compra_id: 'compra-3', variante_id: 'var-1', cantidad: 30 },
  { id: 'dc-12', compra_id: 'compra-3', variante_id: 'var-2', cantidad: 40 },
  { id: 'dc-13', compra_id: 'compra-3', variante_id: 'var-4', cantidad: 10 },
  // compra-4
  { id: 'dc-14', compra_id: 'compra-4', variante_id: 'var-17', cantidad: 20 },
  { id: 'dc-15', compra_id: 'compra-4', variante_id: 'var-18', cantidad: 30 },
  { id: 'dc-16', compra_id: 'compra-4', variante_id: 'var-19', cantidad: 25 },
  // compra-5 (anulada)
  { id: 'dc-17', compra_id: 'compra-5', variante_id: 'var-20', cantidad: 100 },
  // compra-6 (borrador)
  { id: 'dc-18', compra_id: 'compra-6', variante_id: 'var-5', cantidad: 50 },
  { id: 'dc-19', compra_id: 'compra-6', variante_id: 'var-7', cantidad: 30 },
].map((d) => {
  const precio_unitario = d.precio_unitario ?? precioCompra(d.variante_id);
  return { ...d, precio_unitario, subtotal: round2(d.cantidad * precio_unitario) };
});

// ===========================================================================
// TABLA: movimientos_inventario
// Dataset representativo de la bitacora de stock (en produccion lo generan
// los triggers de ventas y compras). Los stock_anterior/nuevo son ilustrativos.
// ===========================================================================
const movimientos_inventario = [
  { id: 'mov-1', variante_id: 'var-20', tipo_movimiento: 'CARGA_INICIAL', cantidad: 100, stock_anterior: 0, stock_nuevo: 100, referencia_id: null, observaciones: 'Carga inicial de inventario', creado_en: hace(55) },
  { id: 'mov-2', variante_id: 'var-9', tipo_movimiento: 'CARGA_INICIAL', cantidad: 200, stock_anterior: 0, stock_nuevo: 200, referencia_id: null, observaciones: 'Carga inicial de inventario', creado_en: hace(75) },
  { id: 'mov-3', variante_id: 'var-9', tipo_movimiento: 'INGRESO_PROVEEDOR', cantidad: 300, stock_anterior: 70, stock_nuevo: 370, referencia_id: 'compra-2', observaciones: 'Ajuste automatico de stock por INSERT en compra', creado_en: hace(10) },
  { id: 'mov-4', variante_id: 'var-9', tipo_movimiento: 'VENTA', cantidad: 50, stock_anterior: 370, stock_nuevo: 320, referencia_id: 'venta-13', observaciones: 'Descuento automatico por venta', creado_en: hace(25, 4) },
  { id: 'mov-5', variante_id: 'var-5', tipo_movimiento: 'INGRESO_PROVEEDOR', cantidad: 100, stock_anterior: 60, stock_nuevo: 160, referencia_id: 'compra-1', observaciones: 'Ajuste automatico de stock por INSERT en compra', creado_en: hace(4) },
  { id: 'mov-6', variante_id: 'var-5', tipo_movimiento: 'VENTA', cantidad: 8, stock_anterior: 158, stock_nuevo: 150, referencia_id: 'venta-1', observaciones: 'Descuento automatico por venta', creado_en: hace(0, 2) },
  { id: 'mov-7', variante_id: 'var-20', tipo_movimiento: 'VENTA', cantidad: 15, stock_anterior: 85, stock_nuevo: 70, referencia_id: 'venta-7', observaciones: 'Descuento automatico por venta', creado_en: hace(3, 2) },
  { id: 'mov-8', variante_id: 'var-20', tipo_movimiento: 'VENTA', cantidad: 10, stock_anterior: 60, stock_nuevo: 50, referencia_id: 'venta-1', observaciones: 'Descuento automatico por venta', creado_en: hace(0, 2) },
  { id: 'mov-9', variante_id: 'var-13', tipo_movimiento: 'AJUSTE_MERMA', cantidad: 4, stock_anterior: 19.5, stock_nuevo: 15.5, referencia_id: null, observaciones: 'Merma por tuberia danada en bodega', creado_en: hace(6) },
  { id: 'mov-10', variante_id: 'var-17', tipo_movimiento: 'INGRESO_PROVEEDOR', cantidad: 20, stock_anterior: 0, stock_nuevo: 20, referencia_id: 'compra-4', observaciones: 'Ajuste automatico de stock por INSERT en compra', creado_en: hace(18) },
  { id: 'mov-11', variante_id: 'var-17', tipo_movimiento: 'VENTA', cantidad: 2, stock_anterior: 10, stock_nuevo: 8, referencia_id: 'venta-5', observaciones: 'Descuento automatico por venta', creado_en: hace(1, 7) },
  { id: 'mov-12', variante_id: 'var-4', tipo_movimiento: 'VENTA', cantidad: 1, stock_anterior: 7, stock_nuevo: 6, referencia_id: 'venta-9', observaciones: 'Descuento automatico por venta', creado_en: hace(8, 6) },
  { id: 'mov-13', variante_id: 'var-12', tipo_movimiento: 'INGRESO_PROVEEDOR', cantidad: 100, stock_anterior: 6, stock_nuevo: 106, referencia_id: 'compra-2', observaciones: 'Ajuste automatico de stock por INSERT en compra', creado_en: hace(10) },
  { id: 'mov-14', variante_id: 'var-12', tipo_movimiento: 'VENTA', cantidad: 4, stock_anterior: 104, stock_nuevo: 100, referencia_id: 'venta-8', observaciones: 'Descuento automatico por venta', creado_en: hace(5, 4) },
  { id: 'mov-15', variante_id: 'var-21', tipo_movimiento: 'AJUSTE_MERMA', cantidad: 1, stock_anterior: 1, stock_nuevo: 0, referencia_id: null, observaciones: 'Candado de exhibicion dado de baja', creado_en: hace(9) },
  { id: 'mov-16', variante_id: 'var-14', tipo_movimiento: 'VENTA', cantidad: 4, stock_anterior: 12, stock_nuevo: 8, referencia_id: 'venta-10', observaciones: 'Descuento automatico por venta', creado_en: hace(12, 3) },
];

// ===========================================================================
// TABLA: configuracion  (clave/valor)
// ===========================================================================
const configuracion = [
  { id: 'conf-1', clave: 'nombre_tienda', valor: 'Ferromat S.A.', descripcion: 'Nombre comercial del Punto de Venta', actualizado_en: hace(120) },
  { id: 'conf-2', clave: 'porcentaje_iva', valor: '19', descripcion: 'Impuesto al Valor Agregado (Chile)', actualizado_en: hace(120) },
  { id: 'conf-3', clave: 'margen_default', valor: '60', descripcion: 'Margen de ganancia estandar sugerido para variantes', actualizado_en: hace(120) },
  { id: 'conf-4', clave: 'nombre_caja', valor: 'Caja #1', descripcion: 'Identificador de la caja registradora actual', actualizado_en: hace(30) },
  { id: 'conf-5', clave: 'rut_empresa', valor: '76.123.456-7', descripcion: 'RUT de la empresa para documentos', actualizado_en: hace(120) },
  { id: 'conf-6', clave: 'direccion_tienda', valor: 'Av. Los Maestros 1450, Santiago', descripcion: 'Direccion fisica del local', actualizado_en: hace(120) },
  { id: 'conf-7', clave: 'telefono_tienda', valor: '+56 2 2123 4567', descripcion: 'Telefono de contacto de la tienda', actualizado_en: hace(120) },
  { id: 'conf-8', clave: 'moneda', valor: 'CLP', descripcion: 'Moneda de operacion', actualizado_en: hace(120) },
];

// ===========================================================================
// TABLA: ventas_en_espera  (carrito en JSONB)
// ===========================================================================
const ventas_en_espera = [
  { id: 'esp-1', nombre_referencia: 'Maestro Juan', carrito: [], observaciones: 'Volvera por la tarde.', creado_en: hace(0, 1) },
  {
    id: 'esp-2',
    nombre_referencia: 'Sra. Carmen',
    observaciones: 'Esperando confirmacion de medidas.',
    creado_en: hace(0, 3),
    // El carrito guarda los items tal como los maneja el POS (usePosCart).
    carrito: [
      { id: 'var-13', codigo: 'PLO-001', id_producto: 'prod-11', nombre: 'Tubo PVC Tigre', variante_nombre: '1/2 Pulgada', tieneVariantes: true, precio_venta: 1504, unidad_venta: 'metro', codigo_barras: '7800013', cantidad: 6 },
      { id: 'var-16', codigo: 'PLO-003', id_producto: 'prod-13', nombre: 'Cinta de Teflon', variante_nombre: 'Estandar', tieneVariantes: false, precio_venta: 693, unidad_venta: 'pza', codigo_barras: '7800016', cantidad: 2 },
    ],
  },
];

// ===========================================================================
// TABLA: usuarios_perfiles  (vinculada a auth.users en Supabase)
// ===========================================================================
const usuarios_perfiles = [
  { id: 'usr-1', nombre: 'Felipe Moreira', rol: 'admin', activo: true, creado_en: hace(120), actualizado_en: hace(120) },
  { id: 'usr-2', nombre: 'Vicente Munoz', rol: 'cajero', activo: true, creado_en: hace(60), actualizado_en: hace(15) },
  { id: 'usr-3', nombre: 'Vicente Varela', rol: 'bodega', activo: true, creado_en: hace(60), actualizado_en: hace(15) },
  { id: 'usr-4', nombre: 'Carla Rojas', rol: 'cajero', activo: false, creado_en: hace(40), actualizado_en: hace(5) },
];

// ===========================================================================
// BUILDER: completa columnas que en el esquema mantienen triggers
// (totales de ventas y compras = suma de subtotales de su detalle).
// ===========================================================================
ventas.forEach((v) => {
  v.total = round2(
    detalle_ventas
      .filter((d) => d.venta_id === v.id)
      .reduce((s, d) => s + d.subtotal, 0),
  );
});
compras.forEach((c) => {
  c.total = round2(
    detalle_compras
      .filter((d) => d.compra_id === c.id)
      .reduce((s, d) => s + d.subtotal, 0),
  );
});

/**
 * Objeto que agrupa todas las "tablas". `queries.js` lee desde aqui;
 * ningun componente debe importar `db` directamente.
 */
export const db = {
  categorias,
  proveedores,
  productos,
  producto_variantes,
  movimientos_inventario,
  ventas,
  detalle_ventas,
  compras,
  detalle_compras,
  configuracion,
  ventas_en_espera,
  usuarios_perfiles,
};
