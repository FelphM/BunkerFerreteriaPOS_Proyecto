/**
 * App.jsx
 * ---------------------------------------------------------------------------
 * Definicion de rutas del sistema.
 *
 * Todas las vistas se montan dentro de <AppLayout /> (sidebar + contenido),
 * garantizando cohesion visual. La ruta index ("/") es el Punto de Venta.
 * ---------------------------------------------------------------------------
 */
import { Routes, Route } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import PosPage from './pages/PosPage';
import DashboardPage from './pages/DashboardPage';
import InventarioPage from './pages/InventarioPage';
import VentasPage from './pages/VentasPage';
import ComprasPage from './pages/ComprasPage';
import ClientesPage from './pages/ClientesPage';
import ProveedoresPage from './pages/ProveedoresPage';
import ReportesPage from './pages/ReportesPage';
import ConfiguracionPage from './pages/ConfiguracionPage';
import PagePlaceholder from './components/PagePlaceholder';
import './styles/app.css';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<PosPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="inventario" element={<InventarioPage />} />
        <Route path="ventas" element={<VentasPage />} />
        <Route path="compras" element={<ComprasPage />} />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="proveedores" element={<ProveedoresPage />} />
        <Route path="reportes" element={<ReportesPage />} />
        <Route path="configuracion" element={<ConfiguracionPage />} />

        {/* Ruta comodin: pagina no encontrada */}
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
    </Routes>
  );
}
