/**
 * PosPage.jsx
 * ---------------------------------------------------------------------------
 * Vista PRINCIPAL: Punto de Venta de Ferromat S.A.
 *
 * Orquesta los 4 bloques de la pantalla:
 *   - BARRA SUPERIOR : <PosTopBar />     (filtro de grilla + Añadir Producto)
 *   - PANEL IZQUIERDO: <CartPanel />     (carrito de venta)
 *   - PANEL CENTRAL  : <ProductGrid />   (catalogo por categorias)
 *   - PANEL DERECHO  : <CheckoutPanel /> (cobro)
 *   + Modales: <AddProductModal /> y <HeldSalesModal />
 * ---------------------------------------------------------------------------
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSellableItems, getCategorias, getVariantesInventario, getClientes } from '../data/queries';
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

  // Catalogo cargado desde Supabase.
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

  // Carga productos con bajo stock al montar (se refresca al abrir el modal).
  useEffect(() => {
    getVariantesInventario()
      .then((variantes) => {
        setProductosBajoStock(
          variantes.filter((v) => v.activo && v.stock_actual <= v.stock_minimo),
        );
      })
      .catch(console.error);
  }, []);

  // Estado de UI.
  const [query, setQuery] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [cliente, setCliente] = useState('');
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

  // ---- PISTOLA DE CODIGO DE BARRAS ------------------------------------
  // Detecta lecturas rapidas y agrega directo al carrito.
  const handleScan = useCallback(
    (code) => {
      const item = sellableItems.find((i) => i.codigo_barras === code);
      if (item) {
        addToCart(item);
      } else {
        console.warn(`[POS] Codigo de barras sin coincidencia: ${code}`);
      }
    },
    [sellableItems, addToCart],
  );
  useBarcodeScanner(handleScan);

  const resetCheckoutForm = () => {
    setMetodoPago('Efectivo');
    setMontoRecibido('');
    setCliente('');
    setNotas('');
    setErrorVenta(null);
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
      rutCliente: null,
      correoCliente: null,
      metodoPago,
      observaciones: notas.trim() || null,
    });

    if (result.success) {
      refreshPendingCount();
      resetCheckoutForm();
      if (result.offline) {
        window.alert('Venta guardada localmente (sin conexion).\nSe sincronizara automaticamente al recuperar la red.');
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
    if (ok) resetCheckoutForm();
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
          onChangeCliente={setCliente}
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
        onClienteCreado={() => {
          setShowNuevoCliente(false);
          getClientes().then(setClientes).catch(console.error);
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

      {/* ================= MODAL: PREVIEW COTIZACION =================== */}
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
    </div>
  );
}
