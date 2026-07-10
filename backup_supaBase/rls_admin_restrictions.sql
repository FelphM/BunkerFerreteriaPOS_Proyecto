-- =============================================================================
-- RESTRICCIÓN DE PERMISOS POR ROL (Administrador vs Cajero/Bodega)
-- =============================================================================
-- Ejecutar en el SQL Editor de Supabase. Implementa a nivel de base de datos
-- lo que el diagrama de casos de uso define como exclusivo de Administrador:
--   - Gestionar Catálogo (Productos y Variantes)
--   - Registrar Compras
--   - Configurar Sistema (parámetros generales)
--
-- El frontend (RequireAdmin.jsx + navItems.js) ya oculta/bloquea estas
-- secciones en la UI para no-admins, pero eso es solo UX: cualquiera con la
-- anon key podría llamar a la API REST de Supabase directamente. Las policies
-- de acá son la barrera real.
--
-- Se usan políticas RESTRICTIVE (en vez de reemplazar las que ya existan)
-- porque no se pudo confirmar el estado exacto de policies previas sobre
-- estas tablas: una RESTRICTIVE se combina con AND sobre cualquier policy
-- PERMISSIVE existente, angostando el acceso sin necesidad de conocer o
-- tocar esas policies previas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: true si el usuario autenticado actual tiene rol 'admin'.
-- No necesita SECURITY DEFINER: usuarios_select ya permite leer
-- usuarios_perfiles a cualquier usuario autenticado.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_perfiles up
    WHERE up.id = auth.uid() AND up.rol = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- GESTIONAR CATÁLOGO: solo admin crea/edita/borra productos y variantes.
-- El SELECT queda abierto a propósito: el POS necesita leer el catálogo
-- completo (incluido stock_actual) para que cualquier cajero pueda vender.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS productos_admin_insert ON public.productos;
CREATE POLICY productos_admin_insert ON public.productos
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS productos_admin_update ON public.productos;
CREATE POLICY productos_admin_update ON public.productos
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS productos_admin_delete ON public.productos;
CREATE POLICY productos_admin_delete ON public.productos
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.es_admin());

DROP POLICY IF EXISTS variantes_admin_insert ON public.producto_variantes;
CREATE POLICY variantes_admin_insert ON public.producto_variantes
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS variantes_admin_update ON public.producto_variantes;
CREATE POLICY variantes_admin_update ON public.producto_variantes
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS variantes_admin_delete ON public.producto_variantes;
CREATE POLICY variantes_admin_delete ON public.producto_variantes
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.es_admin());

-- -----------------------------------------------------------------------------
-- IMPORTANTE: la venta de un cajero dispara tg_descontar_stock_venta, que
-- hace un UPDATE sobre producto_variantes (descontar stock_actual). Esa
-- función NO es SECURITY DEFINER hoy, así que corre con los permisos del
-- cajero que vende — la policy restrictiva de arriba la bloquearía y
-- ROMPERÍA TODAS LAS VENTAS de no-admins.
--
-- Se la promueve a SECURITY DEFINER para que el descuento de stock lo
-- ejecute el sistema (como corresponde al caso de uso "Descontar Stock
-- Automáticamente", incluido por "Gestionar Venta en Mostrador"), pasando
-- por alto la restricción de catálogo solo para esta operación puntual del
-- trigger — la validación de negocio (stock suficiente) sigue intacta
-- dentro de la misma función.
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.procesar_resta_stock_por_venta() SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- REGISTRAR COMPRAS: solo admin crea/edita/borra compras y sus líneas.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS compras_admin_insert ON public.compras;
CREATE POLICY compras_admin_insert ON public.compras
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS compras_admin_update ON public.compras;
CREATE POLICY compras_admin_update ON public.compras
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS compras_admin_delete ON public.compras;
CREATE POLICY compras_admin_delete ON public.compras
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.es_admin());

DROP POLICY IF EXISTS detalle_compras_admin_insert ON public.detalle_compras;
CREATE POLICY detalle_compras_admin_insert ON public.detalle_compras
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS detalle_compras_admin_update ON public.detalle_compras;
CREATE POLICY detalle_compras_admin_update ON public.detalle_compras
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS detalle_compras_admin_delete ON public.detalle_compras;
CREATE POLICY detalle_compras_admin_delete ON public.detalle_compras
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.es_admin());

-- -----------------------------------------------------------------------------
-- CONFIGURAR SISTEMA: solo admin puede modificar parámetros (IVA, margen,
-- días de alerta). Esto reemplaza/angosta la policy configuracion_update
-- documentada en ConfiguracionPage.jsx (la que sea que exista hoy).
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS configuracion_admin_update ON public.configuracion;
CREATE POLICY configuracion_admin_update ON public.configuracion
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());
