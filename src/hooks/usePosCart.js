/**
 * usePosCart.js
 * ---------------------------------------------------------------------------
 * Custom Hook con TODA la logica de negocio del Punto de Venta:
 *
 *   - Estado del carrito de compra.
 *   - Alta / baja / edicion de cantidades (acepta decimales).
 *   - Calculos matematicos (subtotal, neto, IVA, total) con useMemo.
 *   - Ventas en espera ("Apartar" / "Recuperar").
 *
 * La UI (componentes) NO contiene logica de negocio: solo consume lo que
 * este hook expone. Para conectar Supabase basta con tocar este archivo.
 *
 * NOTA SOBRE IVA (convencion chilena):
 * Los `precio_venta` ya incluyen IVA (precio a publico). Por eso el total
 * es la suma directa de subtotales y el neto/IVA se desglosan dividiendo
 * por (1 + iva%).
 * ---------------------------------------------------------------------------
 */
import { useState, useMemo, useCallback } from 'react';
import { getConfigNumero, getVentasEnEspera } from '../data/queries';
import { safeQty } from '../utils/format';

export function usePosCart() {
  // -------------------------------------------------------------------------
  // ESTADO
  // -------------------------------------------------------------------------
  const [cart, setCart] = useState([]);

  // Ventas en espera (productos "apartados").
  // TODO: Supabase Select * from ventas_en_espera (al montar la vista POS).
  const [heldSales, setHeldSales] = useState(() => getVentasEnEspera());

  const ivaPct = getConfigNumero('porcentaje_iva');

  // -------------------------------------------------------------------------
  // ACCIONES DEL CARRITO
  // -------------------------------------------------------------------------

  /**
   * Agrega un item vendible (SKU) al carrito. Si ya existe, suma 1.
   * @param {object} item Item aplanado de getSellableItems().
   */
  const addToCart = useCallback((item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);

      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? { ...i, cantidad: safeQty(i.cantidad) + 1 }
            : i,
        );
      }

      // Item de carrito: lo necesario para construir el detalle de venta.
      return [
        ...prev,
        {
          id: item.id, // id de la variante (FK -> producto_variantes)
          codigo: item.codigo,
          id_producto: item.id_producto,
          nombre: item.nombre,
          variante_nombre: item.variante_nombre,
          tieneVariantes: item.tieneVariantes,
          precio_venta: item.precio_venta,
          unidad_venta: item.unidad_venta,
          codigo_barras: item.codigo_barras,
          cantidad: 1,
        },
      ];
    });
  }, []);

  /**
   * Fija la cantidad de un item. Permite decimales y string vacio mientras
   * el cajero edita el input; los calculos usan safeQty().
   */
  const updateQuantity = useCallback((variantId, cantidad) => {
    setCart((prev) =>
      prev.map((i) => (i.id === variantId ? { ...i, cantidad } : i)),
    );
  }, []);

  /** Suma `delta` a la cantidad de un item (botones + / -). */
  const changeQuantity = useCallback((variantId, delta) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.id === variantId
            ? { ...i, cantidad: safeQty(i.cantidad) + delta }
            : i,
        )
        // Si la cantidad llega a 0 (o menos), se quita la linea.
        .filter((i) => safeQty(i.cantidad) > 0),
    );
  }, []);

  /** Elimina un item del carrito. */
  const removeItem = useCallback((variantId) => {
    setCart((prev) => prev.filter((i) => i.id !== variantId));
  }, []);

  /** Vacia por completo el carrito. */
  const clearCart = useCallback(() => setCart([]), []);

  // -------------------------------------------------------------------------
  // VENTAS EN ESPERA ("APARTAR" / "RECUPERAR")
  // -------------------------------------------------------------------------

  /**
   * Aparta la venta actual: la mueve a `ventas_en_espera` y limpia la pantalla.
   * @param {string} nombreReferencia Nombre con el que el cajero la identifica.
   * @returns {boolean} true si se aparto correctamente.
   */
  const pauseSale = useCallback(
    (nombreReferencia) => {
      if (cart.length === 0) return false;

      const nuevaEspera = {
        id: `e-${Date.now()}`, // id temporal; en BD lo genera Supabase.
        nombre_referencia: nombreReferencia?.trim() || 'Venta sin nombre',
        carrito: cart,
      };

      // TODO: Supabase Insert en tabla `ventas_en_espera`
      //       (guardar `carrito` como JSON / jsonb).
      setHeldSales((prev) => [...prev, nuevaEspera]);
      clearCart();
      return true;
    },
    [cart, clearCart],
  );

  /**
   * Recupera una venta apartada: carga su carrito y la quita de la lista.
   * @param {string} esperaId
   */
  const recoverSale = useCallback((esperaId) => {
    setHeldSales((prev) => {
      const espera = prev.find((e) => e.id === esperaId);
      if (espera) setCart(espera.carrito || []);
      // TODO: Supabase Delete de la fila recuperada en `ventas_en_espera`.
      return prev.filter((e) => e.id !== esperaId);
    });
  }, []);

  // -------------------------------------------------------------------------
  // CALCULOS (useMemo: se recalculan solo cuando cambia el carrito)
  // -------------------------------------------------------------------------
  const totals = useMemo(() => {
    // Subtotal por linea = cantidad * precio_venta.
    const total = cart.reduce(
      (acc, i) => acc + safeQty(i.cantidad) * i.precio_venta,
      0,
    );

    // Desglose hacia atras (los precios ya incluyen IVA).
    const neto = total / (1 + ivaPct / 100);
    const iva = total - neto;

    const cantidadItems = cart.reduce(
      (acc, i) => acc + safeQty(i.cantidad),
      0,
    );

    return {
      neto: Math.round(neto),
      iva: Math.round(iva),
      total: Math.round(total),
      cantidadItems,
      lineas: cart.length,
    };
  }, [cart, ivaPct]);

  // -------------------------------------------------------------------------
  // API PUBLICA DEL HOOK
  // -------------------------------------------------------------------------
  return {
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
  };
}
