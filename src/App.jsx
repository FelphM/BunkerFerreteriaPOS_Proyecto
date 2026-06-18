/**
 * App.jsx
 * ---------------------------------------------------------------------------
 * Definicion de rutas del sistema.
 *
 * ESTRUCTURA:
 *   /login              -> Publica: <LoginPage />
 *   /*                  -> Privada: requiere sesion activa (<ProtectedRoute>)
 *     /                 ->   <AppLayout> con <PosPage />
 *     /dashboard        ->   <AppLayout> con <DashboardPage />
 *     ...               ->   etc.
 *
 * <ProtectedRoute> se encarga de:
 *   - Mostrar un splash mientras carga la sesion inicial.
 *   - Redirigir a /login si no hay sesion.
 *   - Mostrar mensaje de cuenta desactivada si perfil.activo = false.
 * ---------------------------------------------------------------------------
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layout/AppLayout';
import LoginPage from './pages/LoginPage';
import PosPage from './pages/PosPage';
import DashboardPage from './pages/DashboardPage';
import InventarioPage from './pages/InventarioPage';
import VentasPage from './pages/VentasPage';
import ComprasPage from './pages/ComprasPage';
import ClientesPage from './pages/ClientesPage';
import ProveedoresPage from './pages/ProveedoresPage';
import ReportesPage from './pages/ReportesPage';
import ConfiguracionPage from './pages/ConfiguracionPage';
import CategoriasPage from './pages/CategoriasPage';
import CotizacionesPage from './pages/CotizacionesPage';
import FacturasPage from './pages/FacturasPage';
import PagePlaceholder from './components/PagePlaceholder';
import './styles/app.css';

export default function App() {
  return (
    <Routes>
      {/* ==================== RUTAS PUBLICAS ========================== */}
      <Route path="/login" element={<LoginPage />} />

      {/* ==================== RUTAS PRIVADAS ========================== */}
      {/* <ProtectedRoute> verifica la sesion antes de renderizar AppLayout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<PosPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="inventario" element={<InventarioPage />} />
          <Route path="ventas" element={<VentasPage />} />
          <Route path="compras" element={<ComprasPage />} />
          <Route path="clientes" element={<ClientesPage />} />
          <Route path="proveedores" element={<ProveedoresPage />} />
          <Route path="categorias" element={<CategoriasPage />} />
          <Route path="cotizaciones" element={<CotizacionesPage />} />
          <Route path="facturas" element={<FacturasPage />} />
          <Route path="reportes" element={<ReportesPage />} />
          <Route path="configuracion" element={<ConfiguracionPage />} />

          {/* Ruta comodin dentro del sistema */}
          <Route
            path="*"
            element={
              <PagePlaceholder
                titulo="Pagina no encontrada"
                icono="bi-exclamation-triangle"
                descripcion="La ruta solicitada no existe."
              />
            }
          />
        </Route>
      </Route>

      {/* Cualquier otra ruta desconocida redirige al inicio */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
