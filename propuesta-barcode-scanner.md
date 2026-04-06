# Propuesta: Búsqueda y Registro por Código de Barras

## Objetivo

Permitir que los usuarios busquen y registren productos usando un lector de código de barras externo (USB/Bluetooth) o la cámara del dispositivo, integrando esta funcionalidad en los flujos de inventario, ventas y gestión de productos existentes.

---

## Casos de uso

| Flujo | Acción |
|---|---|
| Inventario | Escanear producto para registrar entrada/salida de stock |
| Ventas (POS) | Escanear producto para añadirlo al carrito |
| Productos | Escanear para buscar o asignar código de barras al crear/editar |
| Recetas | Escanear ingrediente para buscarlo rápidamente |

---

## Fuentes de escaneo

### 1. Lector externo (USB / Bluetooth)
Los lectores físicos se comportan como teclados: envían el código seguido de `Enter`. No requieren ninguna librería especial — solo capturar el evento `keydown` en un input con foco y detectar la secuencia de caracteres seguida de `Enter` en menos de ~50ms por carácter (para distinguirlo de escritura manual).

### 2. Cámara del dispositivo
Usa la API `getUserMedia` del navegador para acceder a la cámara y procesar frames en tiempo real.

**Librería recomendada: `@zxing/browser`**
- Soporta EAN-13, EAN-8, Code128, QR, UPC-A, UPC-E y más
- Funciona en navegador sin dependencias nativas
- Licencia Apache 2.0, activamente mantenida
- Alternativa: `html5-qrcode` (más simple, menos control)

---

## Stack tecnológico

### Frontend
| Componente | Tecnología |
|---|---|
| Escaneo por cámara | `@zxing/browser` |
| Escaneo por lector externo | Event listener nativo (`keydown`) |
| UI del escáner | Componente modal con preview de cámara |
| Permisos de cámara | Web API `navigator.mediaDevices.getUserMedia` |

### Backend (api-bff — ya existente)
| Componente | Cambio necesario |
|---|---|
| `products` tabla | Columna `barcode VARCHAR(100)` (única, nullable) |
| `GET /products?barcode=xxx` | Nuevo query param en el endpoint existente |
| `productModel.findByBarcode()` | Nuevo método de búsqueda |
| Schema de validación | Añadir `barcode` a create/update de productos |

---

## Cambios en base de datos

```sql
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS barcode VARCHAR(100) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)
  WHERE barcode IS NOT NULL AND deleted_at IS NULL;
```

---

## Cambios en el backend (api-bff)

### productModel.js — nuevo método
```js
async findByBarcode(barcode) {
  const result = await db.query(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.barcode = $1 AND p.deleted_at IS NULL
  `, [barcode]);
  return result.rows[0] || null;
}
```

### productController.js — búsqueda por barcode
```js
// GET /products?barcode=7501234567890
if (req.query.barcode) {
  const product = await productModel.findByBarcode(req.query.barcode);
  if (!product) return res.status(404).json({ success: false, message: 'Producto no encontrado' });
  return res.json({ success: true, data: product });
}
```

### schemas.js — campo barcode opcional
```js
barcode: Joi.string().max(100).allow(null, '').optional()
```

---

## Flujo de funcionamiento (frontend)

```
Usuario abre modal de escaneo
        │
        ├─ Elige "Cámara"
        │     └─ @zxing/browser activa cámara
        │           └─ Detecta código → llama API
        │
        └─ Usa lector externo
              └─ Input con foco captura keydown
                    └─ Secuencia rápida + Enter → llama API

API responde con producto → se ejecuta acción del contexto
(agregar a venta / mostrar detalle / rellenar formulario)
```

---

## Componente frontend sugerido

Un único componente reutilizable `<BarcodeScanner>` que:
- Recibe una prop `onScan(barcode)` — callback con el código detectado
- Recibe una prop `mode: 'camera' | 'external' | 'auto'`
- En modo `auto`: activa el input para lector externo siempre, y ofrece botón para abrir cámara
- Muestra feedback visual al detectar (éxito / no encontrado)
- Se puede embeber en el POS, formulario de producto, y pantalla de inventario

---

## Consideraciones

- **Permisos**: la cámara requiere HTTPS en producción (localhost funciona sin SSL)
- **Compatibilidad**: `@zxing/browser` funciona en Chrome, Firefox, Safari móvil y Edge
- **Lector externo**: compatible con cualquier lector HID estándar sin drivers adicionales
- **Formatos soportados**: EAN-13 y Code128 cubren el 95% de productos comerciales
- **Fallback manual**: siempre mantener un input de texto para ingresar el código manualmente
- **Asignación de barcode**: al crear/editar un producto, el usuario puede escanear para asignar el código en lugar de escribirlo

---

## Estimación de esfuerzo

| Tarea | Estimado |
|---|---|
| Migración SQL + cambios backend | 2-3 horas |
| Componente `<BarcodeScanner>` (cámara + externo) | 4-6 horas |
| Integración en POS (ventas) | 2-3 horas |
| Integración en inventario | 1-2 horas |
| Integración en formulario de producto | 1-2 horas |
| **Total** | **~10-16 horas** |
