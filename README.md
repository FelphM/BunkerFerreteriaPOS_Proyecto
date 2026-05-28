# 🛠️ Bunker Ferreteria POS - Sistema de Gestión y Punto de Venta

Un sistema de Punto de Venta (POS) e Inventario diseñado específicamente para resolver los desafíos operativos de las ferreterías de tamaño medio. Construido para ser extremadamente rápido, tolerante a interrupciones y amigable para usuarios no técnicos.

## 🎯 ¿El Problema?
Las ferreterías medianas operan bajo constante presión, vendiendo productos en múltiples formatos (unidades, metros, kilos) y sufriendo interrupciones continuas en el mostrador. Bunker Ferreteria POS elimina el uso de cuadernos y memoria, automatizando el control de stock, el cálculo de márgenes y la retención de ventas en espera.

## Características Principales
* **Búsqueda Rapida:** Buscador unificado y optimizado para escáneres de código de barras USB y búsquedas manuales por texto.
* **Venta Fraccionada:** Soporte nativo para vender productos por unidades, kilos, metros o cajas (decimales soportados).
* **Precios Inteligentes:** Cálculo automático del precio de venta final basado en el costo del proveedor y un margen de ganancia configurable.
* **Tolerancia a Interrupciones:** Botón de "Pausar Venta" que guarda el carrito actual en una cola de espera para atender emergencias sin perder datos.
* **Inventario Blindado:** Triggers en base de datos que previenen quiebres de stock y generan alertas automáticas cuando un producto llega a su nivel crítico.

## 💻 Tecnologias y herramientas utilizadas
**Frontend:**
* React 18
* Vite (Bundler ultra-rápido)
* Bootstrap 5 + Bootstrap Icons (UI/UX)

**Backend (BaaS):**
* Supabase
* PostgreSQL (Triggers, Funciones RPC y Row Level Security)

## 🚀 Cómo levantar el proyecto en local

1. Clonar el repositorio:
   ```bash
   1. git clone https://github.com/FelphM/BunkerFerreteriaPOS_Proyecto.git
   2. npm install (dependencias)
   3. npm run dev (ejecutar entorno de desarrollo)

   
## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).
