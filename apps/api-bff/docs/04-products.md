# Módulo: PRODUCTS — Productos

**Ruta base:** `/api/v1/products`

## Descripción general

Gestiona el catálogo de productos (flores, materiales, insumos). Incluye control de stock, búsqueda,
visibilidad en catálogo público y soft delete con restauración.

---

## Endpoints

| Método | Ruta | Descripción | Rol requerido |
|--------|------|-------------|---------------|
| GET | `/products` | Listar todos los productos | Autenticado |
| GET | `/products/search?q=` | Buscar productos por nombre | Autenticado |
| GET | `/products/low-stock` | Productos con stock bajo o igual al mínimo | Autenticado |
| GET | `/products/catalog` | Catálogo público (solo visibles) | Autenticado |
| GET | `/products/:id` | Obtener producto por ID | Autenticado |
| GET | `/products/category/:categoryId` | Productos por categoría | Autenticado |
| POST | `/products` | Crear nuevo producto | `admin`, `warehouse` |
| PUT | `/products/:id` | Actualizar producto | `admin`, `warehouse` |
| DELETE | `/products/:id` | Eliminar producto (soft delete) | `admin` |
| PUT | `/products/:id/restore` | Restaurar producto eliminado | `admin` |
| PUT | `/products/:id/stock` | Actualizar stock manualmente | `admin`, `warehouse` |
| PUT | `/products/:id/catalog` | Cambiar visibilidad en catálogo | `admin`, `warehouse` |
| PATCH | `/products/:id/catalog` | Cambiar visibilidad en catálogo | `admin`, `warehouse` |

---

## Objeto Producto

```json
{
  "id": 1,
  "category_id": 2,
  "category_name": "Flores",
  "name": "Rosa Roja",
  "sku": "ROS-001",
  "unit_of_measure": "und",
  "cost_price": 1.50,
  "sell_price": 3.00,
  "stock_cached": 150,
  "min_stock": 20,
  "description": "Rosa de calidad premium",
  "image_url": "https://ejemplo.com/rosa.jpg",
  "show_in_catalog": true,
  "is_active": true,
  "created_at": "2024-01-01T00:00:00.000Z",
  "deleted_at": null
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID único del producto |
| `category_id` | number | ID de la categoría |
| `category_name` | string | Nombre de la categoría (join) |
| `name` | string | Nombre del producto |
| `sku` | string \| null | Código SKU único |
| `unit_of_measure` | string | Unidad: `und`, `kg`, `docena`, etc. |
| `cost_price` | number | Precio de costo |
| `sell_price` | number | Precio de venta |
| `stock_cached` | number | Stock actual (caché actualizado en cada movimiento) |
| `min_stock` | number | Stock mínimo para alertas |
| `description` | string \| null | Descripción del producto |
| `image_url` | string \| null | URL de imagen |
| `show_in_catalog` | boolean | Si aparece en el catálogo público |
| `is_active` | boolean | Si el producto está activo |
| `created_at` | string (ISO) | Fecha de creación |
| `deleted_at` | string \| null | Fecha de eliminación lógica |

---

## GET /products

Lista todos los productos activos. Por defecto excluye los inactivos.

### Query Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `includeInactive` | boolean | No | Si `true`, incluye productos inactivos |

### Ejemplo de request
```
GET /api/v1/products?includeInactive=false
```

### Response 200
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [
    {
      "id": 1,
      "category_id": 2,
      "category_name": "Flores",
      "name": "Rosa Roja",
      "sku": "ROS-001",
      "unit_of_measure": "und",
      "cost_price": 1.50,
      "sell_price": 3.00,
      "stock_cached": 150,
      "min_stock": 20,
      "description": "Rosa de calidad premium",
      "image_url": null,
      "show_in_catalog": true,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "deleted_at": null
    }
  ]
}
```

---

## GET /products/search

Busca productos por nombre (búsqueda parcial, case-insensitive).

### Query Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `q` | string | Sí | Término de búsqueda |

### Ejemplo de request
```
GET /api/v1/products/search?q=rosa
```

### Response 200
```json
{
  "success": true,
  "message": "Products search completed",
  "data": [
    {
      "id": 1,
      "name": "Rosa Roja",
      "sku": "ROS-001",
      "sell_price": 3.00,
      "stock_cached": 150,
      "category_name": "Flores"
    }
  ]
}
```

---

## GET /products/low-stock

Devuelve productos cuyo `stock_cached` es menor o igual a `min_stock`.

### Response 200
```json
{
  "success": true,
  "message": "Product catalog low stock retrieved successfully",
  "data": [
    {
      "id": 3,
      "name": "Girasol",
      "sku": "GIR-001",
      "stock_cached": 5,
      "min_stock": 10,
      "category_name": "Flores"
    }
  ]
}
```

---

## GET /products/:id

Obtiene un producto por su ID.

### Response 200
```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {
    "id": 1,
    "category_id": 2,
    "category_name": "Flores",
    "name": "Rosa Roja",
    "sku": "ROS-001",
    "unit_of_measure": "und",
    "cost_price": 1.50,
    "sell_price": 3.00,
    "stock_cached": 150,
    "min_stock": 20,
    "description": "Rosa de calidad premium",
    "image_url": null,
    "show_in_catalog": true,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "deleted_at": null
  }
}
```

---

## GET /products/category/:categoryId

Lista todos los productos de una categoría específica.

### Path Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `categoryId` | number | ID de la categoría |

### Response 200
Igual que GET /products pero filtrado por categoría.

---

## POST /products

Crea un nuevo producto. Roles: `admin`, `warehouse`.

> El servicio acepta alias de campos: `price` como alias de `sell_price`, `cost` como alias de `cost_price`,
> `current_stock` como alias de `stock_cached`.

### Request Body
```json
{
  "name": "string — requerido",
  "unit_of_measure": "string — requerido: und, kg, docena, etc.",
  "sell_price": "number — requerido (o 'price' como alias)",
  "cost_price": "number — requerido (o 'cost' como alias)",
  "category_id": "number — opcional",
  "sku": "string — opcional, código único",
  "stock_cached": "number — opcional, default: 0 (o 'current_stock' como alias)",
  "min_stock": "number — opcional, default: 0",
  "description": "string — opcional",
  "image_url": "string — opcional"
}
```

### Ejemplo de request
```json
{
  "category_id": 2,
  "name": "Tulipán Amarillo",
  "sku": "TUL-002",
  "unit_of_measure": "und",
  "cost_price": 2.00,
  "sell_price": 4.50,
  "stock_cached": 80,
  "min_stock": 15,
  "description": "Tulipán importado de Holanda"
}
```

### Response 201
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": 10,
    "category_id": 2,
    "category_name": "Flores",
    "name": "Tulipán Amarillo",
    "sku": "TUL-002",
    "unit_of_measure": "und",
    "cost_price": 2.00,
    "sell_price": 4.50,
    "stock_cached": 80,
    "min_stock": 15,
    "description": "Tulipán importado de Holanda",
    "image_url": null,
    "show_in_catalog": false,
    "is_active": true,
    "created_at": "2024-01-20T10:00:00.000Z",
    "deleted_at": null
  }
}
```

---

## PUT /products/:id

Actualiza un producto. Todos los campos son opcionales.
Acepta los mismos alias que POST: `price`/`sell_price`, `cost`/`cost_price`, `current_stock`/`stock_cached`.

### Request Body (todos opcionales)
```json
{
  "category_id": "number",
  "name": "string",
  "sku": "string",
  "unit_of_measure": "string",
  "cost_price": "number (o 'cost' como alias)",
  "sell_price": "number (o 'price' como alias)",
  "stock_cached": "number (o 'current_stock' como alias)",
  "min_stock": "number",
  "description": "string",
  "image_url": "string"
}
```

### Response 200
Devuelve el producto actualizado con la misma estructura del objeto producto.

---

## DELETE /products/:id

Elimina lógicamente un producto. Solo `admin`.

### Response 200
```json
{
  "success": true,
  "message": "Product deleted successfully",
  "data": null
}
```

---

## PUT /products/:id/restore

Restaura un producto eliminado. Solo `admin`.

### Response 200
```json
{
  "success": true,
  "message": "Product restored successfully",
  "data": {
    "id": 5,
    "name": "Orquídea",
    "is_active": true,
    "deleted_at": null
  }
}
```

---

## PUT /products/:id/stock

Actualiza el stock de un producto manualmente. Roles: `admin`, `warehouse`.

> **Nota:** Para trazabilidad completa, usar `POST /inventory` en lugar de este endpoint.
> Este endpoint actualiza `stock_cached` directamente sin crear un movimiento de inventario.

### Request Body
```json
{
  "quantity": "number (requerido) — debe ser mayor a 0",
  "operation": "string (opcional, default: 'add') — 'add' o 'subtract'"
}
```

### Ejemplo de request
```json
{
  "quantity": 50,
  "operation": "add"
}
```

### Response 200
```json
{
  "success": true,
  "message": "Stock updated successfully",
  "data": {
    "id": 1,
    "name": "Rosa Roja",
    "stock_cached": 200
  }
}
```

### Errores posibles
| Código | Mensaje |
|--------|---------|
| 400 | `Valid quantity is required` |

---

## PUT /products/:id/catalog — PATCH /products/:id/catalog

Cambia la visibilidad del producto en el catálogo público. Roles: `admin`, `warehouse`.

### Request Body
```json
{
  "show_in_catalog": "boolean (requerido)"
}
```

### Ejemplo de request
```json
{
  "show_in_catalog": true
}
```

### Response 200
```json
{
  "success": true,
  "message": "Product catalog visibility updated",
  "data": {
    "id": 1,
    "name": "Rosa Roja",
    "show_in_catalog": true
  }
}
```

---

## Ideas de uso para el frontend

```
Listado de productos con filtros:
- GET /products → tabla principal
- GET /products?includeInactive=true → incluir inactivos
- GET /products/search?q=rosa → buscador en tiempo real

Formulario de venta (POS):
- GET /products → cargar catálogo disponible
- Filtrar por stock_cached > 0 en el frontend

Alertas de stock:
- GET /products/low-stock → badge con cantidad en el menú
- Comparar stock_cached vs min_stock para colorear filas

Gestión de inventario:
- GET /products/category/:id → filtrar por categoría
- PUT /products/:id/stock → ajuste rápido de stock
- POST /inventory → movimiento con trazabilidad completa

Catálogo público:
- PUT /products/:id/catalog con { show_in_catalog: true/false }
- GET /catalog/products → vista pública sin auth
```
