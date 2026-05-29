/**
 * offlineDB.js
 * ---------------------------------------------------------------------------
 * Base de datos local Dexie (IndexedDB) para operaciones offline.
 *
 * Tablas:
 *   ventas_pendientes  - Ventas capturadas sin conexion, pendientes de sync.
 *
 * Esquema de cada venta_pendiente:
 *   {
 *     id          (auto),
 *     creado_en   ISO string,
 *     intentos    number,
 *     error       string | null,    // ultimo error de sync
 *     datos: {
 *       nombreCliente, rutCliente, correoCliente, metodoPago, observaciones,
 *       lineas: [{ variante_id, cantidad, precio_unitario }],
 *       totals: { neto, iva, total }
 *     }
 *   }
 * ---------------------------------------------------------------------------
 */
import Dexie from 'dexie';

const db = new Dexie('BunkerPOS');

db.version(1).stores({
  ventas_pendientes: '++id, creado_en, intentos',
});

export default db;
