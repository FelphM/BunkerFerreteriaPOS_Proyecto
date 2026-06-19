/**
 * InventarioPage.jsx
 * ---------------------------------------------------------------------------
 * Inventario: listado de variantes (SKU) con stock, precios y estado.
 * Permite buscar, filtrar por categoria, ver solo alertas de stock,
 * añadir nuevos productos, editar y eliminar los existentes.
 * ---------------------------------------------------------------------------
 */
import { useMemo, useState } from 'react';
import {
  getVariantesInventario,
  getCategorias,
  getMovimientosPorVariante,
} from '../data/queries';
import { supabase } from '../lib/supabaseClient';
import { useQuery } from '../hooks/useQuery';
import { formatCLP, formatFechaHora, formatStock } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Modal from '../components/ui/Modal';
import AddProductModal from '../components/AddProductModal';
import EditProductModal from '../components/EditProductModal';
import AjusteStockModal from '../components/AjusteStockModal';

const COLOR_MOVIMIENTO = {
  VENTA: 'danger',
  INGRESO_PROVEEDOR: 'success',
  AJUSTE_ENTRADA: 'primary',
  AJUSTE_MERMA: 'warning',
  CARGA_INICIAL: 'secondary',
};

function estadoStock(v) {
  if (!v.activo) return { texto: 'Inactivo', color: 'secondary' };
  if (v.stock_actual <= 0) return { texto: 'Agotado', color: 'danger' };
  if (v.stock_actual <= v.stock_minimo)
    return { texto: 'Stock bajo', color: 'warning' };
  return { texto: 'Disponible', color: 'success' };
}

export default function InventarioPage() {
  const { data: variantes = [], refetch: refetchVariantes } = useQuery(getVariantesInventario);
  const { data: categorias = [] } = useQuery(getCategorias);

  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [varianteSel, setVarianteSel] = useState(null);

  // Modales de producto
  const [showAddModal, setShowAddModal] = useState(false);
  const [editandoVariante, setEditandoVariante] = useState(null);
  const [ajustandoStock, setAjustandoStock] = useState(null);

  // Eliminar variante
  const [eliminando, setEliminando] = useState(null);
  const [eliminandoGuardando, setEliminandoGuardando] = useState(false);
  const [eliminandoError, setEliminandoError] = useState(null);

  // Variantes derivadas de la que se está por eliminar (para advertir y cascadear)
  const derivadasDeEliminando = useMemo(
    () => (eliminando ? variantes.filter((v) => v.variante_ref_id === eliminando.id) : []),
    [eliminando, variantes],
  );

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return variantes.filter((v) => {
      if (!mostrarInactivos && !v.activo) return false;
      const coincideTexto =
        !q ||
        v.producto_nombre.toLowerCase().includes(q) ||
        v.codigo_interno.toLowerCase().includes(q) ||
        v.codigo_barras.includes(q);
      const coincideCategoria =
        !categoriaId || v.categoria_id === categoriaId;
      const coincideAlerta =
        !soloAlertas || (v.activo && v.stock_actual <= v.stock_minimo);
      return coincideTexto && coincideCategoria && coincideAlerta;
    });
  }, [variantes, busqueda, categoriaId, soloAlertas, mostrarInactivos]);

  const kpis = useMemo(() => {
    const activas = variantes.filter((v) => v.activo && !v.es_derivada);
    return {
      total: variantes.filter((v) => v.activo).length,
      valor: variantes.reduce((s, v) => s + (v.valor_stock ?? 0), 0),
      bajo: activas.filter((v) => v.stock_actual <= v.stock_minimo).length,
      agotados: activas.filter((v) => v.stock_actual <= 0).length,
    };
  }, [variantes]);

  // Para derivadas: mostrar movimientos de la variante maestra (el trigger guarda allí)
  const movimientosId = varianteSel?.es_derivada
    ? (varianteSel.variante_maestra_id ?? varianteSel.id)
    : varianteSel?.id;

  const { data: movimientos = [] } = useQuery(
    () => (varianteSel ? getMovimientosPorVariante(movimientosId) : Promise.resolve([])),
    [movimientosId],
  );

  async function handleEliminar() {
    if (!eliminando) return;
    setEliminandoGuardando(true);
    setEliminandoError(null);
    try {
      // Intento borrado definitivo
      const { error: errDel } = await supabase
        .from('producto_variantes')
        .delete()
        .eq('id', eliminando.id);

      if (errDel) {
        if (errDel.code === '23503') {
          // Tiene ventas/movimientos o variantes derivadas → desactivar en cadena
          const idsADesactivar = [eliminando.id, ...derivadasDeEliminando.map((d) => d.id)];
          const { error: errSoft } = await supabase
            .from('producto_variantes')
            .update({ activo: false })
            .in('id', idsADesactivar);
          if (errSoft) throw new Error(errSoft.message);
        } else {
          throw new Error(errDel.message);
        }
      } else {
        // Borrado exitoso: si no quedan más variantes, borrar el producto padre
        const { data: resto } = await supabase
          .from('producto_variantes')
          .select('id')
          .eq('producto_id', eliminando.producto_id);
        if (!resto || resto.length === 0) {
          await supabase.from('productos').delete().eq('id', eliminando.producto_id);
        }
      }

      refetchVariantes();
      setEliminando(null);
    } catch (err) {
      setEliminandoError(err.message);
    } finally {
      setEliminandoGuardando(false);
    }
  }

  return (
    <>
      <PageHeader
        titulo="Inventario"
        icono="bi-box-seam"
        descripcion={`${variantes.filter((v) => v.activo).length} variantes activas`}
      />

      <div className="fp-page-body">
        {/* KPIs */}
        <div className="row g-3 mb-3">
          <div className="col-sm-6 col-xl-3">
            <StatCard titulo="Variantes" valor={kpis.total} icono="bi-upc" color="primary" />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard
              titulo="Valor inventario"
              valor={formatCLP(kpis.valor)}
              subtitulo="a precio de costo"
              icono="bi-cash-coin"
              color="success"
            />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard titulo="Stock bajo" valor={kpis.bajo} icono="bi-exclamation-triangle" color="warning" />
          </div>
          <div className="col-sm-6 col-xl-3">
            <StatCard titulo="Agotados" valor={kpis.agotados} icono="bi-x-octagon" color="danger" />
          </div>
        </div>

        {/* Filtros + tabla */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white d-flex flex-wrap gap-2 align-items-center">
            <div className="input-group input-group-sm fp-filtro-busqueda">
              <span className="input-group-text bg-white">
                <i className="bi bi-search" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por nombre o codigo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            <select
              className="form-select form-select-sm w-auto"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              <option value="">Todas las categorias</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>

            <div className="form-check form-switch ms-1">
              <input
                className="form-check-input"
                type="checkbox"
                id="soloAlertas"
                checked={soloAlertas}
                onChange={(e) => setSoloAlertas(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="soloAlertas">
                Solo stock bajo
              </label>
            </div>

            <div className="form-check form-switch ms-1">
              <input
                className="form-check-input"
                type="checkbox"
                id="mostrarInactivos"
                checked={mostrarInactivos}
                onChange={(e) => setMostrarInactivos(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="mostrarInactivos">
                Mostrar inactivos
              </label>
            </div>

            <div className="ms-auto d-flex align-items-center gap-2">
              <span className="small text-secondary">{filtradas.length} resultado(s)</span>
              <button
                type="button"
                className="btn fp-btn-accent"
                onClick={() => setShowAddModal(true)}
              >
                <i className="bi bi-plus-circle-fill me-1" />
                Añadir Producto
              </button>
            </div>
          </div>

          {/* Tabla */}
          <div className="table-responsive">
            <table className="table table-hover align-middle m-0">
              <thead className="table-light">
                <tr className="text-nowrap">
                  <th>Codigo</th>
                  <th>Producto</th>
                  <th>Categoria</th>
                  <th className="text-end">P. Compra</th>
                  <th className="text-end">Margen</th>
                  <th className="text-end">P. Venta</th>
                  <th className="text-end">Stock</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center text-secondary py-4">
                      Sin resultados para los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filtradas.map((v) => {
                    const estado = estadoStock(v);
                    return (
                      <tr key={v.id} className={!v.activo ? 'opacity-50' : ''}>
                        <td className="text-nowrap">
                          <div>{v.codigo_interno}</div>
                          <small className="text-secondary">{v.codigo_barras}</small>
                        </td>
                        <td>
                          <div className="fw-semibold text-nowrap">{v.producto_nombre}</div>
                          <small className="text-secondary">
                            {v.variante_nombre} &middot; {v.unidad_venta}
                            {v.es_derivada && (
                              <span
                                className="badge bg-primary bg-opacity-10 text-primary ms-1"
                                title={`Stock compartido con "${v.variante_maestra_nombre}" (factor ${v.factor_conversion})`}
                              >
                                <i className="bi bi-link-45deg" /> derivada
                              </span>
                            )}
                          </small>
                        </td>
                        <td className="text-nowrap">{v.categoria_nombre}</td>
                        <td className="text-end text-nowrap">{formatCLP(v.precio_compra)}</td>
                        <td className="text-end">{v.margen_ganancia}%</td>
                        <td className="text-end text-nowrap fw-semibold">{formatCLP(v.precio_venta)}</td>
                        <td className="text-end">
                          {formatStock(v.stock_actual)} {v.unidad_venta}
                        </td>
                        <td>
                          <span className={`badge bg-${estado.color}`}>{estado.texto}</span>
                        </td>
                        <td className="text-end text-nowrap">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary me-1"
                            title="Editar producto"
                            onClick={() =>
                              setEditandoVariante({ id: v.id, id_producto: v.producto_id })
                            }
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success me-1"
                            title="Ajustar stock"
                            onClick={() => setAjustandoStock(v)}
                          >
                            <i className="bi bi-boxes" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary me-1"
                            onClick={() => setVarianteSel(v)}
                          >
                            <i className="bi bi-clock-history me-1" />
                            Movimientos
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            title="Eliminar variante"
                            onClick={() => { setEliminando(v); setEliminandoError(null); }}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: añadir nuevo producto */}
      <AddProductModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        onProductoCreado={() => refetchVariantes()}
      />

      {/* Modal: editar producto existente */}
      <EditProductModal
        item={editandoVariante}
        onClose={() => setEditandoVariante(null)}
        onGuardado={() => {
          refetchVariantes();
          setEditandoVariante(null);
        }}
      />

      {/* Modal: ajuste de stock */}
      <AjusteStockModal
        variante={ajustandoStock}
        onClose={() => setAjustandoStock(null)}
        onAjustado={() => {
          refetchVariantes();
          setAjustandoStock(null);
        }}
      />

      {/* Modal: confirmar eliminación */}
      <Modal
        show={eliminando !== null}
        onClose={() => { setEliminando(null); setEliminandoError(null); }}
        titulo="Eliminar variante"
        icono="bi-trash"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setEliminando(null); setEliminandoError(null); }}
              disabled={eliminandoGuardando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleEliminar}
              disabled={eliminandoGuardando}
            >
              {eliminandoGuardando
                ? <><span className="spinner-border spinner-border-sm me-2" />Eliminando...</>
                : <><i className="bi bi-trash me-1" />Eliminar</>}
            </button>
          </>
        }
      >
        {eliminando && (
          <>
            <p className="mb-3">
              ¿Estás seguro de que quieres eliminar esta variante?
            </p>

            {/* Variante principal */}
            <div className="p-3 rounded mb-3" style={{ background: 'var(--bs-tertiary-bg)' }}>
              <div className="fw-semibold">{eliminando.producto_nombre}</div>
              <small className="text-secondary">
                {eliminando.variante_nombre} · {eliminando.unidad_venta}
              </small>
            </div>

            {/* Advertencia de variantes derivadas */}
            {derivadasDeEliminando.length > 0 && (
              <div className="alert alert-warning py-2 mb-3">
                <div className="fw-semibold mb-1">
                  <i className="bi bi-exclamation-triangle-fill me-1" />
                  Esta es la variante maestra de {derivadasDeEliminando.length} variante(s) derivada(s):
                </div>
                <ul className="mb-1 ps-3">
                  {derivadasDeEliminando.map((d) => (
                    <li key={d.id}>
                      <small>{d.variante_nombre} · {d.unidad_venta}</small>
                    </li>
                  ))}
                </ul>
                <small>
                  Al eliminar esta variante, las derivadas también serán{' '}
                  <strong>desactivadas</strong> y dejarán de aparecer en el POS.
                </small>
              </div>
            )}

            <p className="text-secondary small mb-0">
              <i className="bi bi-info-circle me-1" />
              Si la variante tiene historial de ventas o movimientos, será{' '}
              <strong>desactivada</strong> en lugar de eliminada permanentemente.
              Los datos históricos se conservan.
            </p>
            {eliminandoError && (
              <div className="alert alert-danger py-2 mt-3 mb-0">
                <i className="bi bi-exclamation-triangle me-2" />{eliminandoError}
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Modal: movimientos de la variante */}
      <Modal
        show={varianteSel !== null}
        onClose={() => setVarianteSel(null)}
        titulo={
          varianteSel
            ? varianteSel.es_derivada
              ? `Movimientos: ${varianteSel.producto_nombre} — ${varianteSel.variante_maestra_nombre} (maestra de ${varianteSel.variante_nombre})`
              : `Movimientos: ${varianteSel.producto_nombre} ${varianteSel.variante_nombre}`
            : ''
        }
        icono="bi-clock-history"
        size="lg"
        footer={
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setVarianteSel(null)}
          >
            Cerrar
          </button>
        }
      >
        {varianteSel?.es_derivada && (
          <div className="alert alert-info py-2 mb-3 small">
            <i className="bi bi-link-45deg me-1" />
            Los movimientos se registran en la variante maestra{' '}
            <strong>&ldquo;{varianteSel.variante_maestra_nombre}&rdquo;</strong>.
            Factor: 1&nbsp;{varianteSel.variante_maestra_unidad}&nbsp;=&nbsp;
            {varianteSel.factor_conversion}&nbsp;{varianteSel.unidad_venta}.
          </div>
        )}
        {movimientos.length === 0 ? (
          <p className="text-secondary text-center m-0 py-3">
            Esta variante no registra movimientos.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle m-0">
              <thead className="table-light">
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th className="text-end">Cantidad</th>
                  <th className="text-end">Stock</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr key={m.id}>
                    <td className="text-nowrap text-secondary">
                      {formatFechaHora(m.creado_en)}
                    </td>
                    <td>
                      <span className={`badge bg-${COLOR_MOVIMIENTO[m.tipo_movimiento] || 'secondary'}`}>
                        {m.tipo_movimiento.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-end">{m.cantidad}</td>
                    <td className="text-end text-nowrap">
                      {m.stock_anterior} &rarr; {m.stock_nuevo}
                    </td>
                    <td><small>{m.observaciones}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </>
  );
}
