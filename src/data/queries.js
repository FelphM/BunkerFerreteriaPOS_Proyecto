/**
 * queries.js
 * ---------------------------------------------------------------------------
 * Capa de ACCESO A DATOS del sistema (el "seam" para Supabase).
 *
 * Cada funcion devuelve datos ya listos para la UI (con sus JOIN resueltos).
 * Lee directamente desde Supabase usando el cliente autenticado.
 *
 * NOTA IMPORTANTE SOBRE RLS:
 *   Todas las tablas tienen Row Level Security activo. Las queries solo
 *   funcionan con una sesion activa (auth.role() = 'authenticated').
 *   El cliente Supabase manda el token de sesion automaticamente.
 *
 * NOTA SOBRE `icono`:
 *   El campo `icono` de categorias es SOLO-UI (no existe en la BD).
 *   Se mapea aqui segun el nombre de la categoria. Si agregas categorias
 *   nuevas en Supabase, añade su icono en ICONOS_CATEGORIA.
 * ---------------------------------------------------------------------------
 */
import { supabase } from '../lib/supabaseClient';

// Mapa nombre de categoria -> clase de Bootstrap Icon (solo para la UI).
const ICONOS_CATEGORIA = {
  'Herramientas':  'bi-tools',
  'Tornilleria':   'bi-nut',
  'Electricidad':  'bi-lightning-charge',
  'Plomeria':      'bi-droplet',
  'Pinturas':      'bi-palette',
  'Construccion':  'bi-bricks',
};
const ICONO_DEFAULT = 'bi-box-seam';

// ---------------------------------------------------------------------------
// Helper: lanza el error de Supabase como excepcion de JS para que los
// componentes puedan capturarlo con try/catch o el usuario vea el mensaje.
// ---------------------------------------------------------------------------
function throwIfError({ error }) {
  if (error) throw new Error(error.message ?? 'Error de base de datos');
}

// ===========================================================================
// CONFIGURACION
// ===========================================================================

/** Lista completa de parametros de configuracion. */
export async function getConfiguracion() {
  const res = await supabase.from('configuracion').select('*');
  throwIfError(res);
  return res.data ?? [];
}

/** Valor (string) de un parametro por su clave. */
export async function getConfigValor(clave) {
  const res = await supabase
    .from('configuracion')
    .select('valor')
    .eq('clave', clave)
    .single();
  if (res.error) return null;
  return res.data?.valor ?? null;
}

/** Valor numerico de un parametro (ej: porcentaje_iva). */
export async function getConfigNumero(clave) {
  const val = await getConfigValor(clave);
  return Number(val) || 0;
}

// ===========================================================================
// CATALOGO
// ===========================================================================

/** Categorias de producto, con icono de UI asignado por nombre. */
export async function getCategorias() {
  const res = await supabase
    .from('categorias')
    .select('*')
    .order('nombre');
  throwIfError(res);
  return (res.data ?? []).map((c) => ({
    ...c,
    icono: ICONOS_CATEGORIA[c.nombre] ?? ICONO_DEFAULT,
  }));
}

/** Proveedores con conteo de productos asociados. */
export async function getProveedores() {
  const res = await supabase
    .from('proveedores')
    .select('*, productos(count)')
    .order('nombre');
  throwIfError(res);
  return (res.data ?? []).map((p) => ({
    ...p,
    productos_count: p.productos?.[0]?.count ?? 0,
  }));
}

/**
 * Variantes con datos de producto/categoria/proveedor resueltos.
 * Fuente de la vista Inventario y del catalogo del POS.
 */
export async function getVariantesInventario() {
  const res = await supabase
    .from('producto_variantes')
    .select(`
      id,
      producto_id,
      codigo_barras,
      variante_nombre,
      unidad_venta,
      activo,
      precio_compra,
      margen_ganancia,
      precio_venta,
      stock_actual,
      stock_minimo,
      actualizado_en,
      variante_ref_id,
      factor_conversion,
      productos (
        id,
        nombre,
        codigo_interno,
        activo,
        categoria_id,
        proveedor_id,
        categorias ( id, nombre ),
        proveedores ( id, nombre )
      )
    `)
    .order('actualizado_en', { ascending: false });
  throwIfError(res);

  const rows = res.data ?? [];

  // Lookup de stock real por id — evita self-join que PostgREST no resuelve bien
  const stockById = Object.fromEntries(rows.map((v) => [v.id, v.stock_actual ?? 0]));
  const varianteById = Object.fromEntries(rows.map((v) => [v.id, v]));

  return rows.map((v) => {
    const prod = v.productos ?? {};
    const esDerived = !!v.variante_ref_id;
    const maestra = esDerived ? varianteById[v.variante_ref_id] : null;

    // Stock efectivo: derivadas usan stock_actual de la maestra × factor.
    // toFixed(2) elimina ruido float64 y errores de redondeo del trigger (ej: 29.001 → 29).
    const stockEfectivo = esDerived
      ? parseFloat(((stockById[v.variante_ref_id] ?? 0) * (v.factor_conversion ?? 1)).toFixed(2))
      : (v.stock_actual ?? 0);

    return {
      // Variante
      id: v.id,
      producto_id: v.producto_id,
      codigo_barras: v.codigo_barras ?? '',
      variante_nombre: v.variante_nombre,
      unidad_venta: v.unidad_venta,
      activo: v.activo,
      precio_compra: v.precio_compra,
      margen_ganancia: v.margen_ganancia,
      precio_venta: v.precio_venta,
      stock_actual: stockEfectivo,
      stock_actual_raw: v.stock_actual ?? 0,
      stock_minimo: v.stock_minimo,
      actualizado_en: v.actualizado_en,
      // Trazabilidad cruzada
      es_derivada: esDerived,
      variante_ref_id: v.variante_ref_id ?? null,
      factor_conversion: v.factor_conversion ?? null,
      variante_maestra_id: maestra?.id ?? null,
      variante_maestra_nombre: maestra?.variante_nombre ?? null,
      variante_maestra_unidad: maestra?.unidad_venta ?? null,
      // Producto padre
      producto_nombre: prod.nombre ?? '(eliminado)',
      codigo_interno: prod.codigo_interno ?? '',
      producto_activo: prod.activo ?? false,
      categoria_id: prod.categoria_id ?? null,
      categoria_nombre: prod.categorias?.nombre ?? 'Sin categoria',
      proveedor_id: prod.proveedor_id ?? null,
      proveedor_nombre: prod.proveedores?.nombre ?? 'Sin proveedor',
      // Calculos UI — derivadas no suman al valor total para evitar doble conteo
      valor_stock: esDerived ? 0 : (v.stock_actual ?? 0) * (v.precio_compra ?? 0),
      tieneVariantes: false,
    };
  });
}

/**
 * Items vendibles para el POS: variantes activas de productos activos.
 * Marca `tieneVariantes` para saber si mostrar el nombre de la variante.
 */
export async function getSellableItems() {
  const variantes = await getVariantesInventario();
  const activas = variantes.filter((v) => v.activo && v.producto_activo);

  // Cuenta cuantas variantes tiene cada producto para marcar `tieneVariantes`.
  const conteo = {};
  for (const v of activas) {
    conteo[v.producto_id] = (conteo[v.producto_id] ?? 0) + 1;
  }

  // Obtener los iconos de categoria.
  const cats = await getCategorias();
  const iconoPorCat = Object.fromEntries(cats.map((c) => [c.id, c.icono]));

  return activas.map((v) => ({
    id: v.id,
    codigo: v.codigo_interno,
    codigo_barras: v.codigo_barras,
    id_producto: v.producto_id,
    nombre: v.producto_nombre,
    id_categoria: v.categoria_id,
    icono_categoria: iconoPorCat[v.categoria_id] ?? ICONO_DEFAULT,
    variante_nombre: v.variante_nombre,
    unidad_venta: v.unidad_venta,
    precio_venta: v.precio_venta,
    stock_actual: v.stock_actual,
    tieneVariantes: conteo[v.producto_id] > 1,
  }));
}

// ===========================================================================
// VENTAS
// ===========================================================================

/** Cabeceras de ventas, mas recientes primero. */
export async function getVentas() {
  const res = await supabase
    .from('ventas')
    .select('*')
    .order('creado_en', { ascending: false });
  throwIfError(res);
  return res.data ?? [];
}

/** Lineas de una venta con datos de variante/producto resueltos. */
export async function getDetalleVenta(ventaId) {
  const res = await supabase
    .from('detalle_ventas')
    .select(`
      id,
      venta_id,
      variante_id,
      cantidad,
      precio_unitario,
      subtotal,
      producto_variantes (
        variante_nombre,
        unidad_venta,
        codigo_barras,
        productos ( nombre )
      )
    `)
    .eq('venta_id', ventaId);
  throwIfError(res);

  return (res.data ?? []).map((d) => ({
    id: d.id,
    venta_id: d.venta_id,
    variante_id: d.variante_id,
    cantidad: d.cantidad,
    precio_unitario: d.precio_unitario,
    subtotal: d.subtotal,
    variante_nombre: d.producto_variantes?.variante_nombre ?? '',
    unidad_venta: d.producto_variantes?.unidad_venta ?? 'unidad',
    codigo_barras: d.producto_variantes?.codigo_barras ?? '',
    producto_nombre: d.producto_variantes?.productos?.nombre ?? '(eliminado)',
  }));
}

/** Todas las lineas de venta con datos de producto (para reportes). */
export async function getDetalleVentasGlobal() {
  const res = await supabase
    .from('detalle_ventas')
    .select(`
      id,
      venta_id,
      variante_id,
      cantidad,
      precio_unitario,
      subtotal,
      producto_variantes (
        variante_nombre,
        producto_id,
        productos ( nombre, categoria_id )
      ),
      ventas ( creado_en )
    `);
  throwIfError(res);

  return (res.data ?? []).map((d) => ({
    id: d.id,
    venta_id: d.venta_id,
    variante_id: d.variante_id,
    cantidad: d.cantidad,
    precio_unitario: d.precio_unitario,
    subtotal: d.subtotal,
    variante_nombre: d.producto_variantes?.variante_nombre ?? '',
    producto_id: d.producto_variantes?.producto_id ?? null,
    producto_nombre: d.producto_variantes?.productos?.nombre ?? '(eliminado)',
    categoria_id: d.producto_variantes?.productos?.categoria_id ?? null,
    venta_fecha: d.ventas?.creado_en ?? null,
  }));
}

// ===========================================================================
// COMPRAS
// ===========================================================================

/** Cabeceras de compra con nombre del proveedor, mas recientes primero. */
export async function getCompras() {
  const res = await supabase
    .from('compras')
    .select('*, proveedores ( nombre )')
    .order('creado_en', { ascending: false });
  throwIfError(res);

  return (res.data ?? []).map((c) => ({
    ...c,
    proveedor_nombre: c.proveedores?.nombre ?? '(eliminado)',
  }));
}

/** Lineas de una compra con datos de variante/producto resueltos. */
export async function getDetalleCompra(compraId) {
  const res = await supabase
    .from('detalle_compras')
    .select(`
      id,
      compra_id,
      variante_id,
      cantidad,
      precio_unitario,
      subtotal,
      producto_variantes (
        variante_nombre,
        unidad_venta,
        productos ( nombre )
      )
    `)
    .eq('compra_id', compraId);
  throwIfError(res);

  return (res.data ?? []).map((d) => ({
    id: d.id,
    compra_id: d.compra_id,
    variante_id: d.variante_id,
    cantidad: d.cantidad,
    precio_unitario: d.precio_unitario,
    subtotal: d.subtotal,
    variante_nombre: d.producto_variantes?.variante_nombre ?? '',
    unidad_venta: d.producto_variantes?.unidad_venta ?? 'unidad',
    producto_nombre: d.producto_variantes?.productos?.nombre ?? '(eliminado)',
  }));
}

// ===========================================================================
// MOVIMIENTOS DE INVENTARIO
// ===========================================================================

/** Bitacora de movimientos, mas recientes primero. */
export async function getMovimientos() {
  const res = await supabase
    .from('movimientos_inventario')
    .select(`
      id,
      variante_id,
      tipo_movimiento,
      cantidad,
      stock_anterior,
      stock_nuevo,
      referencia_id,
      observaciones,
      creado_en,
      producto_variantes (
        variante_nombre,
        productos ( nombre )
      )
    `)
    .order('creado_en', { ascending: false });
  throwIfError(res);

  return (res.data ?? []).map((m) => ({
    ...m,
    variante_nombre: m.producto_variantes?.variante_nombre ?? '',
    producto_nombre: m.producto_variantes?.productos?.nombre ?? '(eliminado)',
  }));
}

/** Movimientos de una variante puntual (modal de Inventario). */
export async function getMovimientosPorVariante(varianteId) {
  const res = await supabase
    .from('movimientos_inventario')
    .select(`
      id,
      variante_id,
      tipo_movimiento,
      cantidad,
      stock_anterior,
      stock_nuevo,
      referencia_id,
      observaciones,
      creado_en,
      producto_variantes (
        variante_nombre,
        productos ( nombre )
      )
    `)
    .eq('variante_id', varianteId)
    .order('creado_en', { ascending: false });
  throwIfError(res);

  return (res.data ?? []).map((m) => ({
    ...m,
    variante_nombre: m.producto_variantes?.variante_nombre ?? '',
    producto_nombre: m.producto_variantes?.productos?.nombre ?? '(eliminado)',
  }));
}

// ===========================================================================
// CLIENTES (derivados de ventas)
// ===========================================================================

/**
 * Clientes registrados directamente en la tabla `clientes`.
 */
export async function getClientes() {
  const res = await supabase
    .from('clientes')
    .select('*')
    .order('nombre');
  throwIfError(res);
  return res.data ?? [];
}

/**
 * Clientes derivados de la tabla `ventas`, agrupados por RUT.
 * Se usa para enriquecer la vista de clientes con historial de compras.
 */
export async function getClientesDerivados() {
  const res = await supabase
    .from('ventas')
    .select('nombre_cliente, rut_cliente, correo_cliente, total, creado_en');
  throwIfError(res);

  const mapa = new Map();
  for (const v of (res.data ?? [])) {
    const clave = v.rut_cliente || `sin-rut:${v.nombre_cliente}`;
    if (!mapa.has(clave)) {
      mapa.set(clave, {
        clave,
        nombre: v.nombre_cliente,
        rut: v.rut_cliente,
        correo: v.correo_cliente,
        compras: 0,
        total_gastado: 0,
        ultima_compra: v.creado_en,
      });
    }
    const c = mapa.get(clave);
    c.compras += 1;
    c.total_gastado += v.total ?? 0;
    if (new Date(v.creado_en) > new Date(c.ultima_compra)) {
      c.ultima_compra = v.creado_en;
    }
    if (!c.correo && v.correo_cliente) c.correo = v.correo_cliente;
  }

  return [...mapa.values()].sort((a, b) => b.total_gastado - a.total_gastado);
}

// ===========================================================================
// USUARIOS Y VENTAS EN ESPERA
// ===========================================================================

/** Perfiles de usuario (tabla `usuarios_perfiles`, vinculada a auth.users). */
export async function getUsuarios() {
  const res = await supabase
    .from('usuarios_perfiles')
    .select('*')
    .order('nombre');
  throwIfError(res);
  return res.data ?? [];
}

/** Facturas de proveedores con nombre del proveedor, ordenadas por vencimiento. */
export async function getFacturas() {
  const res = await supabase
    .from('facturas_proveedores')
    .select('*, proveedores ( id, nombre )')
    .order('fecha_vencimiento', { ascending: true });
  throwIfError(res);
  return (res.data ?? []).map((f) => ({
    ...f,
    proveedor_nombre: f.proveedores?.nombre ?? '(eliminado)',
  }));
}

/** Ventas en espera (carritos apartados desde el POS). */
export async function getVentasEnEspera() {
  const res = await supabase
    .from('ventas_en_espera')
    .select('*')
    .order('creado_en');
  throwIfError(res);
  return res.data ?? [];
}
