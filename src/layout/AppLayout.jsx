/**
 * AppLayout.jsx
 * ---------------------------------------------------------------------------
 * Cascaron (shell) de la aplicacion: combina el <Sidebar /> fijo con el area
 * de contenido. El <Outlet /> de react-router-dom renderiza la vista activa.
 *
 * Todas las vistas (POS, Dashboard, Inventario, ...) viven dentro de este
 * layout, lo que garantiza cohesion visual en todo el sistema.
 * ---------------------------------------------------------------------------
 */
import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { db } from '../data/mockDb';

export default function AppLayout() {
  const [itemsCriticos, setItemsCriticos] = useState(0);
  const [alertaCerrada, setAlertaCerrada] = useState(false);

  useEffect(() => {
    const verificarStockBajo = () => {

      const totalBajoStock = db.producto_variantes.filter(
        (v) => v.activo && v.stock_actual <= v.stock_minimo
      ).length;

      setItemsCriticos(totalBajoStock);

      if (totalBajoStock === 0) {
        setAlertaCerrada(false);
      }
    };

    verificarStockBajo();

    // NOTA PARA MIGRACION: al implementar supabase o lo que sea
    //                      configurar  canal de realtime
    //                      para que la funcion verificarStockBajo funcione
    //                      correctamente con la tabla "producto_variantes"

  }, [db.producto_variantes]);

  return (
    <div className="fp-app d-flex vh-100 overflow-hidden">
      <Sidebar />
      <main className="fp-content flex-grow-1 d-flex flex-column overflow-hidden">
        <Outlet />
        {itemsCriticos > 0 && !alertaCerrada && (
          <div 
            className="alert alert-warning alert-dismissible fade show shadow-lg border-start border-4 border-warning m-3 position-absolute" 
            role="alert"
            style={{ 
              bottom: '10px', 
              right: '10px', 
              zIndex: 1100, 
              maxWidth: '380px' 
            }}
          >
            <div className="d-flex align-items-center">
              <i className="bi bi-exclamation-triangle-fill me-2 fs-4 text-warning"></i>
              <div>
                <strong>Alerta de Inventario:</strong><br/>
                Hay {itemsCriticos} {itemsCriticos === 1 ? 'producto' : 'productos'} con stock bajo el mínimo.
              </div>
            </div>
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setAlertaCerrada(true)}
              aria-label="Cerrar"
            ></button>
          </div>
        )}
      </main>
    </div>
  );
}
