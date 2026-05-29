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
import { getSellableItems, getCategorias } from '../data/queries';
import { usePosCart } from '../hooks/usePosCart';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { formatCLP } from '../utils/format';
import PosTopBar from '../components/PosTopBar';
import CartPanel from '../components/CartPanel';
import ProductGrid from '../components/ProductGrid';
import CheckoutPanel from '../components/CheckoutPanel';
import AddProductModal from '../components/AddProductModal';
import HeldSalesModal from '../components/HeldSalesModal';

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

  useEffect(() => {
    Promise.all([getSellableItems(), getCategorias()])
      .then(([items, cats]) => { setSellableItems(items); setCategorias(cats); })
      .catch(console.error)
      .finally(() => setCargando(false));
  }, []);

  // Estado de UI.
  const [query, setQuery] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [cliente, setCliente] = useState('');
  const [notas, setNotas] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [errorVenta, setErrorVenta] = useState(null);

  const searchInputRef = useRef(null);
  const hayItems = cart.length > 0;

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

    const result = await finalizarVenta({
      nombreCliente: cliente.trim() || 'Cliente General',
      rutCliente: null,
      correoCliente: null,
      metodoPago,
      observaciones: notas.trim() || null,
    });

    if (result.success) {
      window.alert(
        `Venta #${result.venta?.numero_venta ?? ''} registrada\n` +
        `Total: ${formatCLP(totals.total)}\nPago: ${metodoPago}`,
      );
      resetCheckoutForm();
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

  /** COTIZAR: sin afectar stock. */
  const handleCotizar = () => {
    if (!hayItems) return;
    window.alert(`Cotizacion por ${formatCLP(totals.total)}.\nNo descuenta stock.`);
  };

  const handleRecoverSale = async (esperaId) => {
    await recoverSale(esperaId);
    setShowHeldModal(false);
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
        />
      </div>

      {/* ===================== MODAL: AÑADIR PRODUCTO ================== */}
      <AddProductModal
        show={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        items={sellableItems}
        onAddItem={handleAddItem}
      />

      {/* ===================== MODAL: VENTAS APARTADAS ================= */}
      <HeldSalesModal
        show={showHeldModal}
        onClose={() => setShowHeldModal(false)}
        heldSales={heldSales}
        onRecover={handleRecoverSale}
      />
    </div>
  );
}
