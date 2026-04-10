# Módulo: SALES — Ventas

**Ruta base:** `/api/v1/sales`

## Descripción general

Gestiona el ciclo completo de ventas. Al crear una venta:
- El stock se descuenta automáticamente (productos e ingredientes de recetas).
- Se registra el pago y se actualiza el flujo de caja de la sesión.
- El `total_amount` **siempre se calcula internamente** — el valor enviado por el cliente se ignora por seguridad.

Al cancelar una venta, el stock se restaura y el flujo de caja se revierte.

---

## Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/sales` | Listar ventas con filtros | Sí |
| GET | `/sales/today` | Ventas del día actual | Sí |
| GET | `/sales/stats` | Estadísticas de ventas | Sí |
| GET | `/sales/employee/:employeeId` | Ventas por empleado | Sí |
| GET | `/sales/:id` | Venta por ID con items | Sí |
| GET | `/sales/:id/detailed` | Venta con items detallados | Sí |
| POST | `/sales` | Crear nueva venta | Sí |
| POST | `/sales/quick-sale` | Venta rápida (POS) | Sí |
| POST | `/sales/calculate-total` | Calcular total sin crear venta | Sí |
| PUT | `/sales/:id` | Actualizar datos de venta | Sí |
| POST | `/sales/:id/complete` | Completar venta pendiente | Sí |
| DELETE | `/sales/:id` | Cancelar venta (restaura stock) | Sí |

---

## Objeto Venta

```json
{
  "id": 42,
  "user_id": 2,
  "user_first_name": "Maria",
  "user_last_name": "Lopez",
  "cashbox_id": 3,
  "cashbox_status": "open",
  "ticket_number": "TKT00000042",
  "customer_identifier": "DNI12345678",
  "customer_name": "Pedro Ramirez",
  "subtotal": 30.00,
  "discount_percentage": 10,
  "discount_amount": 3.00,
  "total_amount": 27.00,
  "status": "completed",
  "notes": null,
  "created_at": "2024-01-20T14:30:00.000Z",
  "updated_at": null,
  "deleted_at": null
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID único de la venta |
| `user_id` | number | ID del empleado que realizó la venta |
| `user_first_name` | string | Nombre del empleado |
| `user_last_name` | string | Apellido del empleado |
| `cashbox_id` | number \| null | ID de la sesión de caja |
| `cashbox_status` | string \| null | Estado de la caja: `open` \| `closed` |
| `ticket_number` | string | Número de ticket generado automáticamente (ej: `TKT00000042`) |
| `customer_identifier` | string \| null | DNI u otro identificador del cliente |
| `customer_name` | string \| null | Nombre del cliente |
| `subtotal` | number | Subtotal antes de descuento |
| `discount_percentage` | number | Porcentaje de descuento (0-100) |
| `discount_amount` | number | Monto de descuento calculado |
| `total_amount` | number | Total final (calculado internamente) |
| `status` | string | `completed` \| `cancelled` \| `refunded` |
| `notes` | string \| null | Notas adicionales |
| `created_at` | string ISO | Fecha de creación |
| `updated_at` | string \| null | Última actualización |
| `deleted_at` | string \| null | Fecha de cancelación lógica |

---

## Objeto Item de Venta

Aparece en GET /sales/:id y GET /sales/:id/detailed

```json
{
  "id": 1,
  "sale_id": 42,
  "product_id": 3,
  "recipe_id": null,
  "product_name": "Rosa Roja",
  "product_sku": "ROS-001",
  "recipe_name": null,
  "item_name_snapshot": "Rosa Roja",
  "quantity": 5,
  "unit_price_at_sale": 3.00,
  "unit_cost_at_sale": 1.50
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID del item |
| `sale_id` | number | ID de la venta |
| `product_id` | number \| null | ID del producto (null si es receta) |
| `recipe_id` | number \| null | ID de la receta (null si es producto) |
| `product_name` | string \| null | Nombre del producto (join) |
| `product_sku` | string \| null | SKU del producto |
| `recipe_name` | string \| null | Nombre de la receta (join) |
| `item_name_snapshot` | string | Nombre del item al momento de la venta |
| `quantity` | number | Cantidad vendida |
| `unit_price_at_sale` | number | Precio unitario al momento de la venta |
| `unit_cost_at_sale` | number | Costo unitario al momento de la venta |

---

## GET /sales

### Query Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `status` | string | `completed` \| `cancelled` \| `refunded` |
| `payment_method` | string | `cash` \| `yape` \| `plin` \| `transfer` \| `card` |
| `employee_id` | number | Filtrar por empleado |
| `customer_id` | number | Filtrar por cliente |
| `start_date` | string | Fecha inicio (YYYY-MM-DD) |
| `end_date` | string | Fecha fin (YYYY-MM-DD) |
| `limit` | number | Máximo de resultados |

### Response 200
```json
{
  "success": true,
  "message": "Sales retrieved successfully",
  "data": [
    {
      "id": 42,
      "user_id": 2,
      "user_first_name": "Maria",
      "user_last_name": "Lopez",
      "cashbox_id": 3,
      "cashbox_status": "open",
      "ticket_number": "TKT00000042",
      "customer_identifier": null,
      "customer_name": null,
      "subtotal": 30.00,
      "discount_percentage": 0,
      "discount_amount": 0,
      "total_amount": 30.00,
      "status": "completed",
      "notes": null,
      "created_at": "2024-01-20T14:30:00.000Z",
      "updated_at": null,
      "deleted_at": null
    }
  ]
}
```

---

## GET /sales/today

Ventas del día actual. Sin filtros adicionales.

### Response 200
Misma estructura que GET /sales.

---

## GET /sales/stats

### Query Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `start_date` | string | Fecha inicio |
| `end_date` | string | Fecha fin |

### Response 200
```json
{
  "success": true,
  "message": "Sales statistics retrieved successfully",
  "data": {
    "summary": {
      "total_sales": 145,
      "total_amount": 4350.00,
      "average_sale": 30.00
    },
    "by_payment_method": [
      {
        "payment_method": "cash",
        "count": "80",
        "total": "2400.00"
      },
      {
        "payment_method": "yape",
        "count": "45",
        "total": "1350.00"
      },
      {
        "payment_method": "plin",
        "count": "20",
        "total": "600.00"
      }
    ]
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `summary.total_sales` | number | Número de ventas completadas |
| `summary.total_amount` | number | Monto total vendido |
| `summary.average_sale` | number | Promedio por venta |
| `by_payment_method[].payment_method` | string | Código del método de pago |
| `by_payment_method[].count` | string | Número de transacciones |
| `by_payment_method[].total` | string | Monto total por método |

---

## GET /sales/employee/:employeeId

### Query Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `status` | string | Filtrar por estado |
| `start_date` | string | Fecha inicio |
| `end_date` | string | Fecha fin |

### Response 200
Misma estructura que GET /sales pero filtrado por empleado.

---

## GET /sales/:id

Venta por ID. Incluye los items de la venta.

### Response 200
```json
{
  "success": true,
  "message": "Sale retrieved successfully",
  "data": {
    "id": 42,
    "user_id": 2,
    "user_first_name": "Maria",
    "user_last_name": "Lopez",
    "cashbox_id": 3,
    "cashbox_status": "open",
    "ticket_number": "TKT00000042",
    "customer_identifier": "DNI12345678",
    "customer_name": "Pedro Ramirez",
    "subtotal": 30.00,
    "discount_percentage": 10,
    "discount_amount": 3.00,
    "total_amount": 27.00,
    "status": "completed",
    "notes": null,
    "created_at": "2024-01-20T14:30:00.000Z",
    "updated_at": null,
    "deleted_at": null,
    "items": [
      {
        "id": 1,
        "sale_id": 42,
        "product_id": 3,
        "recipe_id": null,
        "product_name": "Rosa Roja",
        "product_sku": "ROS-001",
        "recipe_name": null,
        "item_name_snapshot": "Rosa Roja",
        "quantity": 5,
        "unit_price_at_sale": 3.00,
        "unit_cost_at_sale": 1.50
      }
    ]
  }
}
```

---

## GET /sales/:id/detailed

Igual que GET /sales/:id pero con items enriquecidos con datos adicionales del producto.

### Response 200
```json
{
  "success": true,
  "message": "Detailed sale retrieved successfully",
  "data": {
    "id": 42,
    "ticket_number": "TKT00000042",
    "total_amount": 27.00,
    "status": "completed",
    "created_at": "2024-01-20T14:30:00.000Z",
    "items": [
      {
        "id": 1,
        "sale_id": 42,
        "product_id": 3,
        "recipe_id": null,
        "product_name": "Rosa Roja",
        "product_code": "ROS-001",
        "item_name_snapshot": "Rosa Roja",
        "quantity": 5,
        "unit_price_at_sale": 3.00,
        "unit_cost_at_sale": 1.50
      }
    ]
  }
}
```

---

## POST /sales

Crea una nueva venta. El stock se descuenta automáticamente.

> **Seguridad:** `total_amount` se calcula internamente. Si se envía, se ignora.
> `employee_id` se toma del token JWT si no se envía en el body.

### Request Body
```json
{
  "cashbox_id": "number — requerido, ID de la sesión de caja abierta",
  "payment_method_id": "number — requerido, ID del método de pago",
  "items": [
    {
      "product_id": "number — opcional (usar product_id O recipe_id, no ambos)",
      "recipe_id": "number — opcional",
      "name": "string — requerido, nombre para el ticket",
      "quantity": "number — requerido, mayor a 0",
      "price": "number — requerido, precio unitario de venta",
      "cost": "number — opcional, costo unitario"
    }
  ],
  "employee_id": "number — opcional, se toma del token si no se envía",
  "customer_identifier": "string — opcional, DNI u otro ID",
  "customer_name": "string — opcional",
  "discount_percentage": "number — opcional, 0-100, default: 0",
  "status": "string — opcional, default: 'completed'",
  "notes": "string — opcional"
}
```

### IDs de métodos de pago (`payment_method_id`)
| ID | Código | Descripción |
|----|--------|-------------|
| 1 | `cash` | Efectivo |
| 2 | `yape` | Yape |
| 3 | `plin` | Plin |
| 4 | `transfer` | Transferencia bancaria |
| 5 | `card` | Tarjeta |

### Ejemplo — venta de productos
```json
{
  "cashbox_id": 3,
  "payment_method_id": 1,
  "customer_name": "Pedro Ramirez",
  "customer_identifier": "DNI12345678",
  "discount_percentage": 10,
  "items": [
    {
      "product_id": 1,
      "name": "Rosa Roja",
      "quantity": 5,
      "price": 3.00,
      "cost": 1.50
    },
    {
      "product_id": 4,
      "name": "Tulipán",
      "quantity": 3,
      "price": 4.50,
      "cost": 2.00
    }
  ]
}
```

### Ejemplo — venta de receta
```json
{
  "cashbox_id": 3,
  "payment_method_id": 2,
  "items": [
    {
      "recipe_id": 1,
      "name": "Ramo Romántico",
      "quantity": 1,
      "price": 45.00,
      "cost": 15.00
    }
  ]
}
```

### Response 201
```json
{
  "success": true,
  "message": "Sale created successfully",
  "data": {
    "id": 43,
    "user_id": 2,
    "cashbox_id": 3,
    "ticket_number": "TKT00000043",
    "customer_identifier": "DNI12345678",
    "customer_name": "Pedro Ramirez",
    "subtotal": 28.50,
    "discount_percentage": 10,
    "discount_amount": 2.85,
    "total_amount": 25.65,
    "status": "completed",
    "notes": null,
    "created_at": "2024-01-20T15:00:00.000Z",
    "updated_at": null,
    "deleted_at": null
  }
}
```

### Errores
| Código | Mensaje |
|--------|---------|
| 400 | `User ID is required` |
| 400 | `Sale must have at least one item` |
| 400 | `Each item must have either product_id or recipe_id` |
| 400 | `Each item must have a positive quantity` |
| 400 | `Each item must have a positive price` |
| 400 | `Insufficient stock: <nombre del producto>` |
| 404 | `Product not found: <id>` |

---

## POST /sales/quick-sale

Idéntico a POST /sales. Optimizado para flujo POS. Acepta el mismo body y devuelve la misma respuesta.

---

## POST /sales/calculate-total

Calcula el total sin crear la venta. Útil para mostrar el total en tiempo real.

### Request Body
```json
{
  "details": [
    {
      "price": "number — requerido",
      "quantity": "number — requerido"
    }
  ]
}
```

### Response 200
```json
{
  "success": true,
  "message": "Total calculated successfully",
  "data": {
    "total": 28.50
  }
}
```

---

## PUT /sales/:id

Actualiza datos de una venta. No modifica items ni stock.
No se puede actualizar una venta cancelada.

### Request Body (todos opcionales)
```json
{
  "status": "string — completed | cancelled | refunded",
  "customer_identifier": "string",
  "customer_name": "string",
  "payment_method_id": "number",
  "notes": "string"
}
```

### Response 200
Devuelve el objeto venta actualizado (sin items).

### Errores
| Código | Mensaje |
|--------|---------|
| 400 | `Cannot update a cancelled sale` |
| 404 | `Sale not found` |

---

## POST /sales/:id/complete

Completa una venta en estado `pending`.

### Request Body
```json
{
  "payment_method_id": "number — requerido",
  "notes": "string — opcional"
}
```

### Response 200
Devuelve el objeto venta con `status: "completed"`.

### Errores
| Código | Mensaje |
|--------|---------|
| 400 | `Only pending sales can be completed` |
| 404 | `Sale not found` |

---

## DELETE /sales/:id

Cancela una venta. Restaura automáticamente el stock de todos los productos e ingredientes,
y revierte las entradas de flujo de caja asociadas.

### Response 200
```json
{
  "success": true,
  "message": "Sale cancelled successfully",
  "data": {
    "id": 42,
    "user_id": 2,
    "cashbox_id": 3,
    "ticket_number": "TKT00000042",
    "total_amount": 27.00,
    "status": "cancelled",
    "updated_at": "2024-01-20T16:00:00.000Z",
    "stock_restored": true
  }
}
```

| Campo adicional | Tipo | Descripción |
|-----------------|------|-------------|
| `stock_restored` | boolean | Siempre `true` — confirma que el stock fue restaurado |

### Errores
| Código | Mensaje |
|--------|---------|
| 400 | `Sale is already cancelled` |
| 404 | `Sale not found` |

---

## Ideas de uso para el frontend

```
POS (Punto de Venta):
1. GET /cashbox/status → verificar caja abierta, obtener cashbox_id
2. GET /products → cargar catálogo
3. GET /recipes/available → cargar recetas disponibles
4. POST /sales/calculate-total → mostrar total en tiempo real al agregar items
5. POST /sales/quick-sale → procesar venta

Historial de ventas:
- GET /sales?start_date=X&end_date=Y → tabla con filtros
- GET /sales/:id → detalle con items
- DELETE /sales/:id → cancelar con confirmación

Reporte del día:
- GET /sales/today → ventas del día
- GET /sales/stats → estadísticas del período

Ventas por empleado:
- GET /sales/employee/:id → historial del empleado
```
