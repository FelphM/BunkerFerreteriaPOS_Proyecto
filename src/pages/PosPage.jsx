/**
 * PosPage.jsx
 * ---------------------------------------------------------------------------
 * Vista PRINCIPAL: Punto de Venta de Ferromat S.A.
 *
 * Orquesta los 4 bloques de la pantalla:
 *   - BARRA SUPERIOR : <PosTopBar />     (buscar / escanear / fecha)
 *   - PANEL IZQUIERDO: <CartPanel />     (carrito de venta)
 *   - PANEL CENTRAL  : <ProductGrid />   (catalogo por categorias)
 *   - PANEL DERECHO  : <CheckoutPanel /> (cobro) + <HeldSalesModal />
 *
 * La logica de negocio del carrito vive en el hook usePosCart. Aqui solo se
 * conecta el hook con la UI y se maneja el estado del formulario de cobro.
 * ---------------------------------------------------------------------------
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { getSellableItems } from '../data/queries';
import { usePosCart } from '../hooks/usePosCart';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { formatCLP } from '../utils/format';
import PosTopBar from '../components/PosTopBar';
import CartPanel from '../components/CartPanel';
import ProductGrid from '../components/ProductGrid';
import CheckoutPanel from '../components/CheckoutPanel';
import HeldSalesModal from '../components/HeldSalesModal';

export default function PosPage() {
  // --- Logica de negocio (carrito, totales, ventas apartadas) -------------
  const {
    cart,
    heldSales,
    totals,
    ivaPct,
    addToCart,
    updateQuantity,
    changeQuantity,
    removeItem,
    clearCart,
    pauseSale,
    recoverSale,
  } = usePosCart();

  // --- Catalogo de items vendibles (memo: se calcula una sola vez) --------
  const sellableItems = useMemo(() => getSellableItems(), []);

  // --- Estado de UI / formulario de cobro ---------------------------------
  const [query, setQuery] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [cliente, setCliente] = useState('');
  const [notas, setNotas] = useState('');
  const [showHeldModal, setShowHeldModal] = useState(false);

  const searchInputRef = useRef(null);
  const hayItems = cart.length > 0;

  // -------------------------------------------------------------------------
  // PISTOLA DE CODIGO DE BARRAS
  // -------------------------------------------------------------------------
  // Al leer un codigo, buscamos el SKU y lo agregamos directo al carrito.
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

  // -------------------------------------------------------------------------
  // HANDLERS DE FORMULARIO
  // -------------------------------------------------------------------------

  /** Reinicia el formulario de cobro tras finalizar/limpiar una venta. */
  const resetCheckoutForm = () => {
    setMetodoPago('efectivo');
    setMontoRecibido('');
    setCliente('');
    setNotas('');
  };

  /** Boton "Escanear": enfoca el buscador para la pistola/tipeo. */
  const handleScanClick = () => searchInputRef.current?.focus();

  /** Acceso rapido "Nuevo cliente". */
  const handleAddClient = () => {
    // TODO: Supabase Insert en tabla `clientes` (abrir modal de alta).
    window.alert('Alta de cliente: pendiente de implementar.');
  };

  /** COBRAR: finaliza la venta y limpia la pantalla. */
  const handleCobrar = () => {
    if (!hayItems) return;

    // TODO: Supabase Insert en tabla `ventas`
    //       (cabecera: neto, iva, total, metodo_pago, cliente, notas, fecha).
    // TODO: Supabase Insert en tabla `detalle_ventas`
    //       (una fila por item de `cart`: id_variante, cantidad,
    //        precio_unitario, subtotal).
    // TODO: Supabase Update de `stock_actual` en `producto_variantes`
    //       (descontar la cantidad vendida de cada item).

    window.alert(
      `Venta cobrada\n` +
        `Total: ${formatCLP(totals.total)}\n` +
        `Pago: ${metodoPago}\n` +
        `Cliente: ${cliente.trim() || 'Publico en general'}`,
    );
    clearCart();
    resetCheckoutForm();
  };

  /** APARTAR: deja la venta en espera (ventas_en_espera). */
  const handleApartar = () => {
    // TODO: reemplazar window.prompt por un modal de input propio.
    const nombre = window.prompt(
      'Nombre de referencia para la venta apartada:',
      cliente.trim() || `Cliente ${heldSales.length + 1}`,
    );
    if (nombre === null) return; // cajero cancelo.
    if (pauseSale(nombre)) resetCheckoutForm();
  };

  /** COTIZAR: genera una cotizacion sin afectar stock. */
  const handleCotizar = () => {
    if (!hayItems) return;
    // TODO: Supabase Insert en tabla `cotizaciones` (+ detalle_cotizaciones).
    window.alert(
      `Cotizacion generada por ${formatCLP(totals.total)}.\n` +
        'La cotizacion no descuenta stock.',
    );
  };

  /** Recupera una venta apartada al carrito actual. */
  const handleRecoverSale = (esperaId) => {
    recoverSale(esperaId);
    setShowHeldModal(false);
  };

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  return (
    <div className="fp-pos d-flex flex-column h-100">
      {/* ===================== BARRA SUPERIOR ========================== */}
      <PosTopBar
        ref={searchInputRef}
        query={query}
        onQueryChange={setQuery}
        onScanClick={handleScanClick}
        onAddClient={handleAddClient}
        onOpenHeld={() => setShowHeldModal(true)}
      />

      {/* ===================== CUERPO (3 PANELES) ====================== */}
      <div className="fp-pos-body">
        {/* PANEL IZQUIERDO: CARRITO */}
        <CartPanel
          cart={cart}
          onChangeQuantity={changeQuantity}
          onSetQuantity={updateQuantity}
          onRemoveItem={removeItem}
          onClearCart={clearCart}
        />

        {/* PANEL CENTRAL: CATALOGO */}
        <ProductGrid
          items={sellableItems}
          query={query}
          onAddItem={addToCart}
        />

        {/* PANEL DERECHO: COBRO */}
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
          onCobrar={handleCobrar}
          onApartar={handleApartar}
          onCotizar={handleCotizar}
        />
      </div>

      {/* ===================== MODAL VENTAS APARTADAS ================== */}
      <HeldSalesModal
        show={showHeldModal}
        onClose={() => setShowHeldModal(false)}
        heldSales={heldSales}
        onRecover={handleRecoverSale}
      />
    </div>
  );
}
