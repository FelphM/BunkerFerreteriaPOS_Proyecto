/**
 * navItems.js
 * ---------------------------------------------------------------------------
 * Fuente UNICA de verdad para la navegacion lateral.
 *
 * Tanto el <Sidebar /> como el router (App.jsx) consumen este arreglo, de modo
 * que agregar/quitar una seccion se hace en un solo lugar y todo queda en
 * sincronia (paths, iconos y etiquetas).
 *
 * `icono` usa nombres de Bootstrap Icons.
 * ---------------------------------------------------------------------------
 */
export const navItems = [
  { path: '/', label: 'Punto de Venta', icono: 'bi-basket' },
  { path: '/dashboard', label: 'Dashboard', icono: 'bi-speedometer2' },
  { path: '/inventario', label: 'Inventario', icono: 'bi-box-seam' },
  { path: '/ventas', label: 'Ventas', icono: 'bi-graph-up-arrow' },
  { path: '/compras', label: 'Compras', icono: 'bi-bag' },
  { path: '/facturas', label: 'Facturas', icono: 'bi-receipt' },
  { path: '/clientes', label: 'Clientes', icono: 'bi-people' },
  { path: '/proveedores', label: 'Proveedores', icono: 'bi-truck' },
  { path: '/categorias', label: 'Categorias', icono: 'bi-tags' },
  { path: '/cotizaciones', label: 'Cotizaciones', icono: 'bi-file-earmark-text' },
  { path: '/reportes', label: 'Reportes', icono: 'bi-file-earmark-bar-graph' },
  { path: '/configuracion', label: 'Configuracion', icono: 'bi-gear' },
];
