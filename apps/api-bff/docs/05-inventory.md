# Módulo: INVENTORY — Inventario

**Ruta base:** `/api/v1/inventory`

## Descripción general

Registra y consulta todos los movimientos de stock. Cada movimiento actualiza `stock_cached` del producto
y queda registrado en el kardex. Al crear un movimiento de tipo `OUT` o `WASTE`, si el stock resultante
queda por debajo del mínimo, se genera automáticamente una alerta de stock bajo.

---

## Endpoints

| Método | Ruta | Descripción | Rol requerido |
|--------|------|-------------|---------------|
| GET | `/inventory` | Listar movimientos con filtros | Autenticado |
| GET | `/inventory/low-stock` | Productos bajo stock mínimo | Autenticado |
| GET | `/inventory/summary` | Resumen por categoría | Autenticado |
| GET | `/inventory/stats` | Estadísticas de movimientos | Autenticado |
| GET | `/inventory/stock/:productId` | Stock actual de un producto | Autenticado |
| GET | `/inventory/kardex/:productId` | Historial kardex con balance acumulado | Autenticado |
| GET | `/inventory/:id` | Movimiento por ID | Autenticado |
| POST | `/inventory` | Crear movimiento de stock | `admin`, `warehouse` |
| POST | `/inventory/bulk` | Crear múltiples movimientos | `admin`, `warehouse` |
| POST | `/inventory/validate-stock` | Validar disponibilidad de stock | Autenticado |

---

## Tipos de movimiento (`movement_type`)

| Código enviado | Código en BD | Efecto en stock | Descripción |
|----------------|--------------|-----------------|-------------|
| `IN` | `purchase` | + positivo | Entrada de stock (compra, recepción) |
| `OUT` | `sale` | − negativo | Salida de stock |
| `ADJUSTMENT` | `adjustment` | + o − | Ajuste de inventario |
| `WASTE` | `waste` | − negativo | Merma o desperdicio |

> Los tipos se aceptan en mayúsculas o minúsculas.
> Los movimientos generados automáticamente por ventas usan el código `sale`; por cancelaciones, `return`.

---

## Objeto Movimiento

```json
{
  "id": 25,
  "product_id": 1,
  "product_name": "Rosa Roja",
  "movement_type_id": 1,
  "movement_type_code": "purchase",
  "quantity": 100,
  "unit_cost": 1.50,
  "reference_table": "manual_adjustment",
  "reference_id": null,
  "user_id": 2,
  "user_first_name": "Juan",
  "user_last_name": "Perez",
  "created_at": "2024-01-15T10:00:00.000Z"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID del movimiento |
| `product_id` | number | ID del producto |
| `product_name` | string | Nombre del producto (join) |
| `movement_type_id` | number | ID interno del tipo de movimiento |
| `movement_type_code` | string | Código del tipo: `purchase`, `sale`, `waste`, `adjustment`, `return` |
| `quantity` | number | Cantidad (positivo = entrada, negativo = salida) |
| `unit_cost` | number \| null | Costo unitario al momento del movimiento |
| `reference_table` | string \| null | Tabla de referencia (`sales`, `manual_adjustment`, etc.) |
| `reference_id` | number \| null | ID del registro de referencia |
| `user_id` | number | ID del usuario que realizó el movimiento |
| `user_first_name` | string | Nombre del usuario |
| `user_last_name` | string | Apellido del usuario |
| `created_at` | string ISO | Fecha y hora del movimiento |

---

## GET /inventory

Lista movimientos con filtros opcionales, ordenados del más reciente al más antiguo.

### Query Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `product_id` | number | Filtrar por producto |
| `movement_type` | string | Filtrar por tipo: `IN`, `OUT`, `ADJUSTMENT`, `WASTE` |
| `start_date` | string | Fecha inicio (YYYY-MM-DD) |
| `end_date` | string | Fecha fin (YYYY-MM-DD) |
| `limit` | number | Máximo de resultados |

### Response 200
```json
{
  "success": true,
  "message": "Inventory movements retrieved successfully",
  "data": [
    {
      "id": 25,
      "product_id": 1,
      "product_name": "Rosa Roja",
      "movement_type_id": 1,
      "movement_type_code": "purchase",
      "quantity": 100,
      "unit_cost": 1.50,
      "reference_table": "manual_adjustment",
      "reference_id": null,
      "user_id": 2,
      "user_first_name": "Juan",
      "user_last_name": "Perez",
      "created_at": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

---

## GET /inventory/low-stock

Productos con `stock_cached <= min_stock`, ordenados por mayor déficit primero.

### Response 200
```json
{
  "success": true,
  "message": "Inventory movements low stock retrieved successfully",
  "data": [
    {
      "id": 3,
      "category_id": 1,
      "category_name": "Flores",
      "name": "Girasol",
      "sku": "GIR-001",
      "unit_of_measure": "und",
      "cost_price": 2.00,
      "sell_price": 4.00,
      "stock_cached": 3,
      "min_stock": 10,
      "description": null,
      "image_url": null,
      "show_in_catalog": false,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "deleted_at": null
    }
  ]
}
```

---

## GET /inventory/summary

Resumen de inventario agrupado por categoría.

### Response 200
```json
{
  "success": true,
  "message": "Inventory summary retrieved successfully",
  "data": [
    {
      "category_id": 1,
      "category_name": "Flores",
      "total_products": "8",
      "total_stock": "450",
      "total_value": "675.00",
      "average_stock": "56.2500000000000000"
    }
  ]
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `category_id` | number | ID de la categoría |
| `category_name` | string | Nombre de la categoría |
| `total_products` | string | Cantidad de productos activos en la categoría |
| `total_stock` | string | Suma total de unidades en stock |
| `total_value` | string | Valor total (stock × costo) |
| `average_stock` | string | Promedio de stock por producto |

---

## GET /inventory/stats

Estadísticas de movimientos en un período.

### Query Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `start_date` | string | Fecha inicio (YYYY-MM-DD) |
| `end_date` | string | Fecha fin (YYYY-MM-DD) |

### Response 200
```json
{
  "success": true,
  "message": "Movement statistics retrieved successfully",
  "data": {
    "summary": {
      "total_movements": "25",
      "inbound_movements": "10",
      "outbound_movements": "15",
      "total_inbound": "500",
      "total_outbound": "320"
    },
    "by_type": [
      {
        "movement_type": "sale",
        "count": "12",
        "total_quantity": "280"
      },
      {
        "movement_type": "purchase",
        "count": "8",
        "total_quantity": "400"
      },
      {
        "movement_type": "waste",
        "count": "3",
        "total_quantity": "25"
      },
      {
        "movement_type": "adjustment",
        "count": "2",
        "total_quantity": "15"
      }
    ]
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `summary.total_movements` | string | Total de movimientos en el período |
| `summary.inbound_movements` | string | Movimientos con quantity > 0 |
| `summary.outbound_movements` | string | Movimientos con quantity < 0 |
| `summary.total_inbound` | string | Suma de unidades entrantes |
| `summary.total_outbound` | string | Suma de unidades salientes (valor absoluto) |
| `by_type[].movement_type` | string | Código del tipo de movimiento |
| `by_type[].count` | string | Número de movimientos de ese tipo |
| `by_type[].total_quantity` | string | Suma de unidades (valor absoluto) |

---

## GET /inventory/stock/:productId

Stock actual de un producto específico.

### Response 200
```json
{
  "success": true,
  "message": "Current stock retrieved successfully",
  "data": {
    "product_id": "1",
    "stock": 150
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `product_id` | string | ID del producto (como string, viene del path param) |
| `stock` | number | Stock actual (`stock_cached`) |

### Errores
| Código | Mensaje |
|--------|---------|
| 404 | `Product not found` |

---

## GET /inventory/kardex/:productId

Historial completo de movimientos de un producto con balance acumulado.

### Query Parameters
| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Máximo de registros |

### Response 200
```json
{
  "success": true,
  "message": "Kardex history retrieved successfully",
  "data": [
    {
      "id": 10,
      "product_id": 1,
      "product_name": "Rosa Roja",
      "movement_type_id": 2,
      "movement_type_code": "sale",
      "quantity": -5,
      "unit_cost": 1.50,
      "reference_table": "sales",
      "reference_id": 42,
      "user_id": 2,
      "user_first_name": "Maria",
      "user_last_name": "Lopez",
      "created_at": "2024-01-20T14:30:00.000Z",
      "balance": 145
    }
  ]
}
```

| Campo adicional | Tipo | Descripción |
|-----------------|------|-------------|
| `balance` | number | Stock acumulado después de este movimiento |

> El kardex se devuelve en orden cronológico ascendente (más antiguo primero) con el balance calculado.

---

## GET /inventory/:id

Obtiene un movimiento específico por su ID.

### Response 200
Devuelve el objeto movimiento completo (misma estructura que el listado).

---

## POST /inventory

Crea un movimiento de stock. Roles: `admin`, `warehouse`.
El `user_id` se toma automáticamente del token JWT.

### Request Body
```json
{
  "product_id": "number — requerido",
  "movement_type": "string — requerido: IN | OUT | ADJUSTMENT | WASTE",
  "quantity": "number — requerido, debe ser mayor a 0",
  "reason": "string — opcional: purchase | return | adjustment | sale | damage | theft | production | transfer | initial_stock | waste",
  "unit_cost": "number — opcional, si no se envía usa el cost_price del producto"
}
```

> Para movimientos `OUT`, el sistema verifica que haya stock suficiente antes de crear el movimiento.

### Ejemplo — entrada de stock
```json
{
  "product_id": 1,
  "movement_type": "IN",
  "quantity": 100,
  "reason": "purchase",
  "unit_cost": 1.50
}
```

### Ejemplo — merma
```json
{
  "product_id": 3,
  "movement_type": "WASTE",
  "quantity": 5,
  "reason": "damage"
}
```

### Response 201
```json
{
  "success": true,
  "message": "Inventory movement created successfully",
  "data": {
    "id": 26,
    "product_id": 1,
    "product_name": "Rosa Roja",
    "movement_type_id": 1,
    "movement_type_code": "purchase",
    "quantity": 100,
    "unit_cost": 1.50,
    "reference_table": "manual_adjustment",
    "reference_id": null,
    "user_id": 2,
    "user_first_name": "Juan",
    "user_last_name": "Perez",
    "created_at": "2024-01-20T10:00:00.000Z"
  }
}
```

### Errores
| Código | Mensaje |
|--------|---------|
| 400 | `Product ID, movement type, quantity, and user ID are required` |
| 400 | `Invalid movement type. Valid types are: IN, OUT, ADJUSTMENT, WASTE` |
| 400 | `Quantity must be greater than 0` |
| 400 | `Insufficient stock. Available: X, Requested: Y` |
| 404 | `Product not found` |

---

## POST /inventory/bulk

Crea múltiples movimientos en una sola operación. Se procesan secuencialmente.
Roles: `admin`, `warehouse`.

### Request Body
```json
{
  "movements": [
    {
      "product_id": "number — requerido",
      "movement_type": "string — requerido",
      "quantity": "number — requerido",
      "reason": "string — opcional",
      "unit_cost": "number — opcional"
    }
  ]
}
```

### Ejemplo
```json
{
  "movements": [
    { "product_id": 1, "movement_type": "IN", "quantity": 50, "reason": "purchase" },
    { "product_id": 2, "movement_type": "IN", "quantity": 30, "reason": "purchase" },
    { "product_id": 5, "movement_type": "WASTE", "quantity": 3, "reason": "damage" }
  ]
}
```

### Response 201
```json
{
  "success": true,
  "message": "Bulk movements created successfully",
  "data": [
    {
      "id": 27,
      "product_id": 1,
      "movement_type_code": "purchase",
      "quantity": 50,
      "unit_cost": 1.50,
      "created_at": "2024-01-20T10:00:00.000Z"
    },
    {
      "id": 28,
      "product_id": 2,
      "movement_type_code": "purchase",
      "quantity": 30,
      "unit_cost": 2.00,
      "created_at": "2024-01-20T10:00:00.000Z"
    }
  ]
}
```

---

## POST /inventory/validate-stock

Verifica disponibilidad de stock para una lista de productos. No crea ningún movimiento.

### Request Body
```json
{
  "items": [
    {
      "product_id": "number — requerido",
      "quantity": "number — requerido, mayor a 0"
    }
  ]
}
```

### Ejemplo
```json
{
  "items": [
    { "product_id": 1, "quantity": 10 },
    { "product_id": 3, "quantity": 15 }
  ]
}
```

### Response 200
```json
{
  "success": true,
  "message": "Stock validation completed",
  "data": {
    "valid": false,
    "unavailable": [
      {
        "product_id": 3,
        "product_name": "Girasol",
        "available": 5,
        "requested": 15,
        "reason": "Insufficient stock"
      }
    ],
    "total_items": 2,
    "valid_items": 1
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `valid` | boolean | `true` si todos los items tienen stock suficiente |
| `unavailable` | array | Items con stock insuficiente o producto no encontrado |
| `unavailable[].product_id` | number | ID del producto |
| `unavailable[].product_name` | string | Nombre del producto |
| `unavailable[].available` | number | Stock disponible actual |
| `unavailable[].requested` | number | Cantidad solicitada |
| `unavailable[].reason` | string | `"Insufficient stock"` \| `"Product not found"` \| `"Quantity must be greater than 0"` |
| `total_items` | number | Total de items validados |
| `valid_items` | number | Items con stock suficiente |

---

## Ideas de uso para el frontend

```
Registro de compra de insumos:
- POST /inventory con movement_type: "IN", reason: "purchase"
- Para múltiples productos: POST /inventory/bulk

Registro de merma:
- POST /inventory con movement_type: "WASTE", reason: "damage"

Kardex de producto:
- GET /inventory/kardex/:productId → tabla con balance acumulado
- quantity positivo = entrada, negativo = salida
- balance = stock después de cada movimiento

Dashboard de inventario:
- GET /inventory/summary → tarjetas por categoría (total_value es el más útil)
- GET /inventory/stats → gráfico de movimientos por tipo
- GET /inventory/low-stock → lista de productos a reponer

Antes de crear una venta manual:
- POST /inventory/validate-stock → verificar disponibilidad
- Si valid === false, mostrar los items de unavailable al usuario
```
