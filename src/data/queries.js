/**
 * queries.js
 * ---------------------------------------------------------------------------
 * Capa de ACCESO A DATOS del sistema (el "seam" para Supabase).
 *
 * Cada funcion devuelve datos ya listos para la UI (con sus JOIN resueltos).
 * Hoy leen del mock `db`; en produccion, el equipo reemplaza el cuerpo de
 * cada funcion por la consulta Supabase indicada en su comentario `// TODO`.
 * La firma y la forma del resultado NO deben cambiar, asi los componentes
 * siguen funcionando sin tocarse.
 *
 * Convencion: todo lo que aqui se expone es de SOLO LECTURA. Las operaciones
 * de escritura (insert/update/delete) se implementaran directamente contra
 * Supabase cuando se conecte el backend.
 * ---------------------------------------------------------------------------
 */
import { db } from './mockDb';

// --- Helpers internos de "JOIN" --------------------------------------------
const categoriaPorId = (id) => db.categorias.find((c) => c.id === id);
const proveedorPorId = (id) => db.proveedores.find((p) => p.id === id);
const productoPorId = (id) => db.productos.find((p) => p.id === id);
const variantePorId = (id) => db.producto_variantes.find((v) => v.id === id);

/** Ordena por fecha `creado_en` descendente (mas reciente primero). */
const porFechaDesc = (a, b) => new Date(b.creado_en) - new Date(a.creado_en);

// ===========================================================================
// CONFIGURACION
// ===========================================================================

/** Lista completa de parametros de configuracion. */
// TODO: Supabase -> supabase.from('configuracion').select('*')
export const getConfiguracion = () => [...db.configuracion];

/** Valor (string) de un parametro por su clave. */
// TODO: Supabase -> select('valor').eq('clave', clave).single()
export const getConfigValor = (clave) =>
  db.configuracion.find((c) => c.clave === clave)?.valor ?? null;

/** Valor numerico de un parametro (ej: porcentaje_iva). */
export const getConfigNumero = (clave) => Number(getConfigValor(clave)) || 0;

// ===========================================================================
// CATALOGO (categorias, proveedores, productos, variantes)
// ===========================================================================

/** Categorias de producto. */
// TODO: Supabase -> supabase.from('categorias').select('*').order('nombre')
export const getCategorias = () => [...db.categorias];

/** Proveedores, con la cuenta de productos asociados. */
// TODO: Supabase -> from('proveedores').select('*, productos(count)')
export const getProveedores = () =>
  db.proveedores.map((p) => ({
    ...p,
    productos_count: db.productos.filter((pr) => pr.proveedor_id === p.id)
      .length,
  }));

/**
 * Variantes con todos sus datos de producto/categoria/proveedor resueltos.
 * Es la fuente de la vista Inventario.
 */
// TODO: Supabase -> from('producto_variantes')
//   .select('*, productos(nombre, codigo_interno, activo, categorias(nombre), proveedores(nombre)))')
export const getVariantesInventario = () =>
  db.producto_variantes.map((v) => {
    const producto = productoPorId(v.producto_id);
    const categoria = categoriaPorId(producto?.categoria_id);
    const proveedor = proveedorPorId(producto?.proveedor_id);
    const hermanas = db.producto_variantes.filter(
      (x) => x.producto_id === v.producto_id,
    );
    return {
      ...v,
      producto_nombre: producto?.nombre ?? '(producto eliminado)',
      codigo_interno: producto?.codigo_interno ?? '',
      producto_activo: producto?.activo ?? false,
      categoria_id: producto?.categoria_id ?? null,
      categoria_nombre: categoria?.nombre ?? 'Sin categoria',
      proveedor_id: producto?.proveedor_id ?? null,
      proveedor_nombre: proveedor?.nombre ?? 'Sin proveedor',
      // valorizacion de la linea (stock a precio de costo)
      valor_stock: v.stock_actual * v.precio_compra,
      tieneVariantes: hermanas.length > 1,
    };
  });

/**
 * Items vendibles para el POS: variantes ACTIVAS de productos ACTIVOS,
 * aplanadas con el formato que espera la grilla y el carrito.
 */
export const getSellableItems = () =>
  getVariantesInventario()
    .filter((v) => v.activo && v.producto_activo)
    .map((v) => ({
      id: v.id,
      codigo: v.codigo_interno,
      codigo_barras: v.codigo_barras,
      id_producto: v.producto_id,
      nombre: v.producto_nombre,
      id_categoria: v.categoria_id,
      variante_nombre: v.variante_nombre,
      unidad_venta: v.unidad_venta,
      precio_venta: v.precio_venta,
      stock_actual: v.stock_actual,
      tieneVariantes: v.tieneVariantes,
    }));

// ===========================================================================
// VENTAS
// ===========================================================================

/** Cabeceras de venta, mas recientes primero. */
// TODO: Supabase -> from('ventas').select('*').order('creado_en', { ascending:false })
export const getVentas = () => [...db.ventas].sort(porFechaDesc);

/** Lineas de una venta, con datos de producto/variante resueltos. */
// TODO: Supabase -> from('detalle_ventas')
//   .select('*, producto_variantes(variante_nombre, unidad_venta, productos(nombre))')
//   .eq('venta_id', ventaId)
export const getDetalleVenta = (ventaId) =>
  db.detalle_ventas
    .filter((d) => d.venta_id === ventaId)
    .map((d) => {
      const variante = variantePorId(d.variante_id);
      const producto = productoPorId(variante?.producto_id);
      return {
        ...d,
        variante_nombre: variante?.variante_nombre ?? '',
        unidad_venta: variante?.unidad_venta ?? 'unidad',
        codigo_barras: variante?.codigo_barras ?? '',
        producto_nombre: producto?.nombre ?? '(producto eliminado)',
      };
    });

/** Todas las lineas de venta (para reportes de productos mas vendidos). */
export const getDetalleVentasGlobal = () =>
  db.detalle_ventas.map((d) => {
    const variante = variantePorId(d.variante_id);
    const producto = productoPorId(variante?.producto_id);
    const venta = db.ventas.find((v) => v.id === d.venta_id);
    return {
      ...d,
      variante_nombre: variante?.variante_nombre ?? '',
      producto_id: variante?.producto_id ?? null,
      producto_nombre: producto?.nombre ?? '(producto eliminado)',
      categoria_id: producto?.categoria_id ?? null,
      venta_fecha: venta?.creado_en ?? null,
    };
  });

// ===========================================================================
// COMPRAS
// ===========================================================================

/** Cabeceras de compra con el nombre del proveedor resuelto. */
// TODO: Supabase -> from('compras').select('*, proveedores(nombre)').order('creado_en', { ascending:false })
export const getCompras = () =>
  [...db.compras].sort(porFechaDesc).map((c) => ({
    ...c,
    proveedor_nombre:
      proveedorPorId(c.proveedor_id)?.nombre ?? '(proveedor eliminado)',
  }));

/** Lineas de una compra, con datos de producto/variante resueltos. */
// TODO: Supabase -> from('detalle_compras')
//   .select('*, producto_variantes(variante_nombre, unidad_venta, productos(nombre))')
//   .eq('compra_id', compraId)
export const getDetalleCompra = (compraId) =>
  db.detalle_compras
    .filter((d) => d.compra_id === compraId)
    .map((d) => {
      const variante = variantePorId(d.variante_id);
      const producto = productoPorId(variante?.producto_id);
      return {
        ...d,
        variante_nombre: variante?.variante_nombre ?? '',
        unidad_venta: variante?.unidad_venta ?? 'unidad',
        producto_nombre: producto?.nombre ?? '(producto eliminado)',
      };
    });

// ===========================================================================
// MOVIMIENTOS DE INVENTARIO
// ===========================================================================

/** Bitacora de movimientos de stock, mas recientes primero. */
// TODO: Supabase -> from('movimientos_inventario')
//   .select('*, producto_variantes(variante_nombre, productos(nombre))')
//   .order('creado_en', { ascending:false })
export const getMovimientos = () =>
  [...db.movimientos_inventario].sort(porFechaDesc).map((m) => {
    const variante = variantePorId(m.variante_id);
    const producto = productoPorId(variante?.producto_id);
    return {
      ...m,
      variante_nombre: variante?.variante_nombre ?? '',
      producto_nombre: producto?.nombre ?? '(producto eliminado)',
    };
  });

/** Movimientos de una variante puntual (detalle de Inventario). */
export const getMovimientosPorVariante = (varianteId) =>
  getMovimientos().filter((m) => m.variante_id === varianteId);

// ===========================================================================
// CLIENTES (derivados de la tabla `ventas`)
// ===========================================================================

/**
 * El esquema no tiene tabla `clientes`: los datos del cliente viven en cada
 * fila de `ventas`. Esta funcion DERIVA la lista de clientes agrupando las
 * ventas por RUT (o por nombre cuando no hay RUT).
 *
 * EQUIPO: si a futuro se crea una tabla `clientes` dedicada, reemplazar esta
 * funcion por un simple SELECT a esa tabla.
 */
export const getClientesDerivados = () => {
  const mapa = new Map();

  for (const venta of db.ventas) {
    // Clave de agrupacion: RUT si existe; si no, el nombre.
    const clave = venta.rut_cliente || `sin-rut:${venta.nombre_cliente}`;

    if (!mapa.has(clave)) {
      mapa.set(clave, {
        clave,
        nombre: venta.nombre_cliente,
        rut: venta.rut_cliente,
        correo: venta.correo_cliente,
        compras: 0,
        total_gastado: 0,
        ultima_compra: venta.creado_en,
      });
    }

    const cliente = mapa.get(clave);
    cliente.compras += 1;
    cliente.total_gastado += venta.total;
    if (new Date(venta.creado_en) > new Date(cliente.ultima_compra)) {
      cliente.ultima_compra = venta.creado_en;
    }
    // Completa el correo si una venta posterior lo tiene.
    if (!cliente.correo && venta.correo_cliente) {
      cliente.correo = venta.correo_cliente;
    }
  }

  return [...mapa.values()].sort((a, b) => b.total_gastado - a.total_gastado);
};

// ===========================================================================
// USUARIOS Y VENTAS EN ESPERA
// ===========================================================================

/** Perfiles de usuario del sistema. */
// TODO: Supabase -> from('usuarios_perfiles').select('*').order('nombre')
export const getUsuarios = () => [...db.usuarios_perfiles];

/** Ventas en espera (carritos apartados). */
// TODO: Supabase -> from('ventas_en_espera').select('*').order('creado_en')
export const getVentasEnEspera = () => [...db.ventas_en_espera];
