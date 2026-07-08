/**
 * PosPage.jsx
 * ---------------------------------------------------------------------------
 * Vista PRINCIPAL: Punto de Venta de Ferromat S.A.
 *
 * Orquesta los 4 bloques de la pantalla:
 *   - BARRA SUPERIOR : <PosTopBar />     (filtro de grilla + Añadir Producto)
 *   - PANEL IZQUIERDO: <CartPanel />     (carrito de venta)
 *   - PANEL CENTRAL  : <ProductGrid />   (catálogo por categorías)
 *   - PANEL DERECHO  : <CheckoutPanel /> (cobro)
 *   + Modales: <AddProductModal /> y <HeldSalesModal />
 * ---------------------------------------------------------------------------
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSellableItems, getCategorias, getVariantesInventario, getClientes } from '../data/queries';
import { supabase } from '../lib/supabaseClient';
import { usePosCart } from '../hooks/usePosCart';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { formatCLP } from '../utils/format';
import PosTopBar from '../components/PosTopBar';
import CartPanel from '../components/CartPanel';
import ProductGrid from '../components/ProductGrid';
import CheckoutPanel from '../components/CheckoutPanel';
import AddProductModal from '../components/AddProductModal';
import AddClienteModal from '../components/AddClienteModal';
import HeldSalesModal from '../components/HeldSalesModal';
import { guardarCotizacion } from '../components/CotizacionesModal';
import BajoStockModal from '../components/BajoStockModal';
import CotizarPreviewModal from '../components/CotizarPreviewModal';
import EditProductModal from '../components/EditProductModal';
import TicketVentaModal from '../components/TicketVentaModal';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function PosPage() {
  const {
    cart, heldSales, totals, ivaPct,
    addToCart, updateQuantity, changeQuantity, removeItem, clearCart,
    pauseSale, recoverSale, finalizarVenta,
  } = usePosCart();

  // Catálogo cargado desde Supabase.
  const [sellableItems, setSellableItems] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    Promise.all([getSellableItems(), getCategorias()])
      .then(([items, cats]) => { setSellableItems(items); setCategorias(cats); })
      .catch(console.error)
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    getClientes().then(setClientes).catch(console.error);
  }, []);

  // Carga productos con bajo stock y se mantiene al día vía Supabase Realtime
  // (antes solo cargaba una vez al montar y quedaba desactualizado durante la sesión).
  useEffect(() => {
    const cargarBajoStock = () => {
      getVariantesInventario()
        .then((variantes) => {
          setProductosBajoStock(
            variantes.filter((v) => v.activo && v.stock_actual <= v.stock_minimo),
          );
        })
        .catch(console.error);
    };

    cargarBajoStock();

    const channel = supabase
      .channel('pos-stock-alertas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'producto_variantes' },
        cargarBajoStock,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Estado de UI.
  const [query, setQuery] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [cliente, setCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null); // cliente registrado elegido en el buscador (id, nombre, rut, correo)
  const [notas, setNotas] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [showBajoStock, setShowBajoStock] = useState(false);
  const [productosBajoStock, setProductosBajoStock] = useState([]);
  const [cotizacionPreview, setCotizacionPreview] = useState(null);
  const [editando, setEditando] = useState(null); // item del POS a editar
  const [ticketData, setTicketData] = useState(null); // ticket tras venta exitosa
  const { isOnline, pendingCount, syncing, sincronizar, refreshPendingCount } = useOnlineStatus();
  const [errorVenta, setErrorVenta] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const searchInputRef = useRef(null);
  const hayItems = cart.length > 0;

  // ---- ATAJOS DE TECLADO ----------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F3') {
        e.preventDefault();
        setShowAddProduct(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ---- PISTOLA DE CÓDIGO DE BARRAS ------------------------------------
  // Detecta lecturas rápidas y agrega directo al carrito.
  const handleScan = useCallback(
    (code) => {
      const item = sellableItems.find((i) => i.codigo_barras === code);
      if (item) {
        addToCart(item);
      } else {
        console.warn(`[POS] Código de barras sin coincidencia: ${code}`);
      }
    },
    [sellableItems, addToCart],
  );
  useBarcodeScanner(handleScan);

  const resetCheckoutForm = () => {
    setMetodoPago('Efectivo');
    setMontoRecibido('');
    setCliente('');
    setClienteSeleccionado(null);
    setNotas('');
    setErrorVenta(null);
  };

  /** El cajero editó el nombre a mano: ya no corresponde al cliente elegido en el buscador. */
  const handleChangeCliente = (valor) => {
    setCliente(valor);
    setClienteSeleccionado(null);
  };

  // ---- HANDLERS -------------------------------------------------------

  /** Agrega un item desde el modal o la grilla y cierra el modal. */
  const handleAddItem = useCallback(
    (item) => {
      addToCart(item);
      // No cerramos el modal: el cajero puede seguir agregando productos.
    },
    [addToCart],
  );

  /** COBRAR: inserta la venta en Supabase y limpia la pantalla. */
  const handleCobrar = async () => {
    if (!hayItems) return;
    setErrorVenta(null);

    // Capturar snapshot ANTES de que finalizarVenta limpie el carrito
    const cartSnapshot = [...cart];
    const totalsSnapshot = { ...totals };
    const nombreClienteSnapshot = cliente.trim() || 'Cliente General';
    const montoRecibidoSnapshot = montoRecibido;
    const metodoPagoSnapshot = metodoPago;

    const result = await finalizarVenta({
      nombreCliente: nombreClienteSnapshot,
      rutCliente: clienteSeleccionado?.rut ?? null,
      correoCliente: clienteSeleccionado?.correo ?? null,
      metodoPago,
      observaciones: notas.trim() || null,
    });

    if (result.success) {
      refreshPendingCount();
      resetCheckoutForm();
      if (result.offline) {
        window.alert('Venta guardada localmente (sin conexión).\nSe sincronizará automáticamente al recuperar la red.');
      } else {
        setTicketData({
          venta: result.venta,
          items: cartSnapshot,
          totals: totalsSnapshot,
          metodoPago: metodoPagoSnapshot,
          montoRecibido: montoRecibidoSnapshot,
          ivaPct,
          nombreCliente: nombreClienteSnapshot,
        });
      }
    } else {
      setErrorVenta(result.error ?? 'Error al procesar la venta.');
    }
  };

  /** APARTAR: guarda el carrito en `ventas_en_espera`. */
  const handleApartar = async () => {
    const nombre = window.prompt(
      'Nombre de referencia para la venta apartada:',
      cliente.trim() || `Cliente ${heldSales.length + 1}`,
    );
    if (nombre === null) return;
    const ok = await pauseSale(nombre);
    if (ok) {
      resetCheckoutForm();
      showToast('Venta apartada con éxito');
    }
  };

  /** COTIZAR: abre preview para confirmar antes de guardar. */
  const handleCotizar = () => {
    if (!hayItems) return;
    const items = cart.map((item) => ({
      nombre: item.nombre,
      sku: item.sku ?? null,
      cantidad: item.cantidad,
      precio_unitario: item.precio_venta,
    }));
    setCotizacionPreview({
      fecha: new Date().toISOString(),
      cliente,
      notas,
      items,
      subtotal: totals.neto,
      iva: totals.iva,
      total: totals.total,
    });
  };

  const handleConfirmarCotizacion = () => {
    if (cotizacionPreview) guardarCotizacion(cotizacionPreview);
    setCotizacionPreview(null);
    showToast('Cotización creada con éxito');
  };

  const handleRecoverSale = async (esperaId) => {
    await recoverSale(esperaId);
    setShowHeldModal(false);
  };

  const handleProductoCreado = async ({ producto, variante }) => {
    try {
      // 1. Recargar el catálogo
      const [items, cats] = await Promise.all([getSellableItems(), getCategorias()]);
      setSellableItems(items);
      setCategorias(cats);
      
      // 2. Añadir el nuevo producto al carrito automáticamente
      const newItem = items.find((i) => i.id === variante.id);
      if (newItem) {
        addToCart(newItem);
      }
    } catch (err) {
      console.error("Error recargando catálogo tras crear producto:", err);
    }
  };

  // ---- RENDER ---------------------------------------------------------
  return (
    <div className="fp-pos d-flex flex-column h-100">
      {/* ===================== BARRA SUPERIOR ========================== */}
      <PosTopBar
        ref={searchInputRef}
        query={query}
        onQueryChange={setQuery}
        onOpenAddProduct={() => setShowAddProduct(true)}
        onOpenHeld={() => setShowHeldModal(true)}
        onOpenBajoStock={() => setShowBajoStock(true)}
        bajoStockCount={productosBajoStock.length}
        heldSalesCount={heldSales.length}
        isOnline={isOnline}
        pendingCount={pendingCount}
        syncing={syncing}
        onSincronizar={sincronizar}
      />

      {/* =================== CUERPO (3 PANELES) ======================== */}
      <div className="fp-pos-body">
        <CartPanel
          cart={cart}
          onChangeQuantity={changeQuantity}
          onSetQuantity={updateQuantity}
          onRemoveItem={removeItem}
          onClearCart={clearCart}
        />

        <ProductGrid
          items={sellableItems}
          categorias={categorias}
          query={query}
          onAddItem={handleAddItem}
          onEditItem={setEditando}
          cargando={cargando}
        />

        <CheckoutPanel
          totals={totals}
          ivaPct={ivaPct}
          metodoPago={metodoPago}
          onChangeMetodoPago={setMetodoPago}
          montoRecibido={montoRecibido}
          onChangeMontoRecibido={setMontoRecibido}
          cliente={cliente}
          onChangeCliente={handleChangeCliente}
          onSeleccionarCliente={setClienteSeleccionado}
          notas={notas}
          onChangeNotas={setNotas}
          hayItems={hayItems}
          errorVenta={errorVenta}
          onCobrar={handleCobrar}
          onApartar={handleApartar}
          onCotizar={handleCotizar}
          clientes={clientes}
          onAbrirNuevoCliente={() => setShowNuevoCliente(true)}
        />
      </div>

      {/* ===================== MODAL: AÑADIR PRODUCTO ================== */}
      <AddProductModal
        show={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        onProductoCreado={handleProductoCreado}
      />

      {/* ===================== MODAL: NUEVO CLIENTE ==================== */}
      <AddClienteModal
        show={showNuevoCliente}
        onClose={() => setShowNuevoCliente(false)}
        onClienteCreado={(nuevoCliente) => {
          setShowNuevoCliente(false);
          getClientes().then(setClientes).catch(console.error);
          if (nuevoCliente) {
            setCliente(nuevoCliente.nombre ?? '');
            setClienteSeleccionado(nuevoCliente);
          }
        }}
      />

      {/* ===================== MODAL: VENTAS APARTADAS ================= */}
      <HeldSalesModal
        show={showHeldModal}
        onClose={() => setShowHeldModal(false)}
        heldSales={heldSales}
        onRecover={handleRecoverSale}
      />

      {/* =================== MODAL: EDITAR PRODUCTO ==================== */}
      <EditProductModal
        item={editando}
        onClose={() => setEditando(null)}
        onGuardado={async () => {
          const [items, cats] = await Promise.all([getSellableItems(), getCategorias()]);
          setSellableItems(items);
          setCategorias(cats);
          setEditando(null);
        }}
      />

      {/* ================= MODAL: PREVIEW COTIZACIÓN =================== */}
      <CotizarPreviewModal
        show={!!cotizacionPreview}
        cotizacion={cotizacionPreview}
        onGuardar={handleConfirmarCotizacion}
        onCancelar={() => setCotizacionPreview(null)}
      />

      {/* ===================== MODAL: BAJO STOCK ======================= */}
      <BajoStockModal
        show={showBajoStock}
        onClose={() => setShowBajoStock(false)}
        productos={productosBajoStock}
      />

      {/* ================== MODAL: TICKET DE VENTA ===================== */}
      <TicketVentaModal
        ticketData={ticketData}
        onClose={() => setTicketData(null)}
      />

      {/* ======================== TOAST ================================= */}
      {toast && (
        <div
          className="position-fixed bottom-0 end-0 p-3"
          style={{ zIndex: 9999 }}
        >
          <div className="toast show align-items-center text-white bg-success border-0 shadow">
            <div className="d-flex">
              <div className="toast-body fw-semibold">
                <i className="bi bi-check-circle me-2" />{toast}
              </div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                onClick={() => setToast(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
