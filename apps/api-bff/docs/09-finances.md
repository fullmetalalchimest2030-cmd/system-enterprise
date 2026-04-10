# Módulo: FINANCES — Finanzas / Gastos

**Ruta base:** `/api/v1/finances`

## Descripción general

Gestiona los gastos operativos del negocio (compra de flores, servicios, transporte, salarios, etc.).
Cada gasto se asocia a una sesión de caja y actualiza automáticamente el flujo de efectivo.
También expone endpoints de consulta para el capital de trabajo (algunos deprecados).

---

## Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/finances` | Listar gastos con filtros | Sí |
| GET | `/finances/summary/category` | Resumen de gastos por categoría | Sí |
| GET | `/finances/daily` | Gastos diarios (últimos 30 días) | Sí |
| GET | `/finances/categories` | Categorías válidas de gasto | Sí |
| GET | `/finances/payment-methods` | Métodos de pago válidos | Sí |
| GET | `/finances/inventory-value` | Valor total del inventario | Sí |
| GET | `/finances/waste-value` | Valor de mermas en un período | Sí |
| GET | `/finances/cash-in-boxes` | Efectivo en cajas en un período | Sí |
| GET | `/finances/capital-config` | Configuración de capital inicial | `admin` |
| GET | `/finances/working-capital` | Capital de trabajo ⚠️ Deprecado | Sí |
| GET | `/finances/:id` | Gasto por ID | Sí |
| POST | `/finances` | Crear nuevo gasto | Sí |
| PUT | `/finances/:id` | Actualizar gasto | Sí |
| DELETE | `/finances/:id` | Eliminar gasto (soft delete) | `admin` |

---

## Categorías válidas de gasto

| Valor | Descripción |
|-------|-------------|
| `flowers` | Compra de flores e insumos florales |
| `services` | Servicios (agua, luz, internet) |
| `transport` | Transporte y delivery |
| `salaries` | Salarios y pagos a personal |
| `utilities` | Servicios públicos |
| `supplies` | Materiales y suministros |
| `other` | Otros gastos |

## Métodos de pago válidos

| Valor | Descripción |
|-------|-------------|
| `cash` | Efectivo |
| `transfer` | Transferencia bancaria |
| `card` | Tarjeta |
| `yape` | Yape |
| `plin` | Plin |

---

## Objeto Gasto

```json
{
  "id": 1,
  "cashbox_id": 3,
  "category": "flowers",
  "description": "Compra de rosas rojas al proveedor",
  "amount": 150.00,
  "user_id": 2,
  "user_first_name": "Maria",
  "user_last_name": "Lopez",
  "created_at": "2024-01-20T10:00:00.000Z",
  "deleted_at": null
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID único del gasto |
| `cashbox_id` | number | ID de la sesión de caja asociada |
| `category` | string | Categoría del gasto |
| `description` | string | Descripción del gasto |
| `amount` | number | Monto del gasto |
| `user_id` | number | ID del usuario que registró el gasto |
| `user_first_name` | string | Nombre del usuario |
| `user_last_name` | string | Apellido del usuario |
| `created_at` | string (ISO) | Fecha de creación |
| `deleted_at` | string \| null | Fecha de eliminación lógica |

---

## GET /finances

Lista gastos con filtros opcionales.

### Query Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `category` | string | No | Filtrar por categoría |
| `payment_method` | string | No | Filtrar por método de pago |
| `user_id` | number | No | Filtrar por usuario |
| `start_date` | string | No | Fecha inicio (YYYY-MM-DD) |
| `end_date` | string | No | Fecha fin (YYYY-MM-DD) |
| `limit` | number | No | Máximo de resultados |

### Ejemplo de request
```
GET /api/v1/finances?category=flowers&start_date=2024-01-01&end_date=2024-01-31
```

### Response 200
```json
{
  "success": true,
  "message": "Expenses retrieved successfully",
  "data": [
    {
      "id": 1,
      "cashbox_id": 3,
      "category": "flowers",
      "description": "Compra de rosas rojas al proveedor",
      "amount": 150.00,
      "user_id": 2,
      "user_first_name": "Maria",
      "user_last_name": "Lopez",
      "created_at": "2024-01-20T10:00:00.000Z",
      "deleted_at": null
    }
  ]
}
```

---

## GET /finances/summary/category

Resumen de gastos agrupados por categoría.

### Query Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `start_date` | string | No | Fecha inicio |
| `end_date` | string | No | Fecha fin |

### Response 200
```json
{
  "success": true,
  "message": "Expenses summary retrieved successfully",
  "data": {
    "by_category": [
      {
        "category": "flowers",
        "count": "12",
        "total": "850.00"
      },
      {
        "category": "salaries",
        "count": "2",
        "total": "3000.00"
      }
    ],
    "summary": {
      "total_expenses": 4200.00,
      "total_count": 18
    }
  }
}
```

### Campos de respuesta — `data.by_category[]`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `category` | string | Categoría del gasto |
| `count` | string | Número de gastos en esa categoría |
| `total` | string | Monto total de la categoría |

### Campos de respuesta — `data.summary`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `total_expenses` | number | Suma total de todos los gastos |
| `total_count` | number | Número total de gastos |

---

## GET /finances/daily

Gastos agrupados por día. Por defecto muestra los últimos 30 días.

### Query Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `start_date` | string | No | Fecha inicio |
| `end_date` | string | No | Fecha fin |

### Response 200
```json
{
  "success": true,
  "message": "Daily expenses retrieved successfully",
  "data": [
    {
      "date": "2024-01-20",
      "total_amount": "185.00",
      "count": "3"
    },
    {
      "date": "2024-01-19",
      "total_amount": "50.00",
      "count": "1"
    }
  ]
}
```

### Campos de respuesta — cada item
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `date` | string | Fecha (YYYY-MM-DD) |
| `total_amount` | string | Monto total del día |
| `count` | string | Número de gastos del día |

---

## GET /finances/categories

Devuelve la lista de categorías válidas.

### Response 200
```json
{
  "success": true,
  "message": "Valid categories retrieved successfully",
  "data": ["flowers", "services", "transport", "salaries", "utilities", "supplies", "other"]
}
```

---

## GET /finances/payment-methods

Devuelve la lista de métodos de pago válidos.

### Response 200
```json
{
  "success": true,
  "message": "Valid payment methods retrieved successfully",
  "data": ["cash", "transfer", "card", "yape", "plin"]
}
```

---

## GET /finances/inventory-value

Devuelve el valor total del inventario actual (stock × costo de cada producto).

### Response 200
```json
{
  "success": true,
  "message": "Inventory value retrieved successfully",
  "data": {
    "inventory_value": 4250.00
  }
}
```

---

## GET /finances/waste-value

Devuelve el valor monetario de las mermas en un período.

### Query Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `start_date` | string | No | Fecha inicio |
| `end_date` | string | No | Fecha fin |

### Response 200
```json
{
  "success": true,
  "message": "Waste value retrieved successfully",
  "data": {
    "waste_value": 125.50
  }
}
```

---

## GET /finances/cash-in-boxes

Devuelve el efectivo total en cajas (abiertas y cerradas) en un período.

### Query Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `start_date` | string | No | Fecha inicio (default: últimos 30 días) |
| `end_date` | string | No | Fecha fin |

### Response 200
```json
{
  "success": true,
  "message": "Cash in boxes retrieved successfully",
  "data": {
    "cash_in_boxes": 1850.00
  }
}
```

---

## GET /finances/capital-config

Devuelve la configuración del capital inicial. Solo `admin`.

### Response 200
```json
{
  "success": true,
  "message": "Capital config retrieved successfully",
  "data": {
    "initial_capital": 10000.00,
    "has_initial_capital": true,
    "source": "equity"
  }
}
```

### Campos de respuesta — `data`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `initial_capital` | number | Capital inicial configurado |
| `has_initial_capital` | boolean | Si hay capital inicial configurado |
| `source` | string | `"equity"` (desde historial) o `"environment"` (desde variable de entorno) |

---

## GET /finances/working-capital ⚠️ DEPRECADO

> **Este endpoint está deprecado.** Usar `GET /equity/current-capital` para el capital actual.

Devuelve el cálculo completo del capital de trabajo.

### Response 200
```json
{
  "success": true,
  "message": "Working capital retrieved successfully",
  "data": {
    "period": {
      "start_date": null,
      "end_date": null
    },
    "components": {
      "initial_capital": 10000.00,
      "initial_capital_source": "equity",
      "inventory_gross": 4250.00,
      "waste_deductions": 125.50,
      "inventory_net": 4124.50,
      "cash_in_boxes": 1850.00,
      "total_expenses": 3200.00
    },
    "working_capital": 12774.50,
    "status": "solid",
    "status_label": "Sólido",
    "status_color": "green"
  }
}
```

### Valores de `status`
| Valor | Label | Color | Descripción |
|-------|-------|-------|-------------|
| `solid` | Sólido | green | Capital saludable |
| `warning` | Advertencia | yellow | Capital bajo |
| `low` | Bajo | orange | Capital muy bajo |
| `critical` | Crítico | red | Capital negativo |

---

## GET /finances/:id

Obtiene un gasto por su ID.

### Response 200
Devuelve el objeto gasto completo.

---

## POST /finances

Crea un nuevo gasto. El gasto se registra automáticamente en el flujo de caja de la sesión indicada.

### Request Body
```json
{
  "cashbox_id": "number (requerido) — ID de la sesión de caja activa",
  "description": "string (requerido) — descripción del gasto",
  "amount": "number (requerido) — monto mayor a 0",
  "category": "string (requerido) — flowers | services | transport | salaries | utilities | supplies | other",
  "payment_method": "string (opcional) — cash | transfer | card | yape | plin",
  "receipt_number": "string (opcional) — número de comprobante",
  "notes": "string (opcional)",
  "date": "string (opcional) — YYYY-MM-DD"
}
```

> El campo `user_id` se toma automáticamente del token JWT.

### Ejemplo de request
```json
{
  "cashbox_id": 3,
  "description": "Compra de rosas rojas - Proveedor Flores del Norte",
  "amount": 150.00,
  "category": "flowers",
  "payment_method": "cash",
  "receipt_number": "B001-00123"
}
```

### Response 201
```json
{
  "success": true,
  "message": "Expense created successfully",
  "data": {
    "id": 8,
    "cashbox_id": 3,
    "category": "flowers",
    "description": "Compra de rosas rojas - Proveedor Flores del Norte",
    "amount": 150.00,
    "user_id": 2,
    "user_first_name": "Maria",
    "user_last_name": "Lopez",
    "created_at": "2024-01-20T10:00:00.000Z",
    "deleted_at": null
  }
}
```

### Errores posibles
| Código | Mensaje |
|--------|---------|
| 400 | `Cashbox ID is required` |
| 400 | `Description, amount, and category are required` |
| 400 | `Amount must be greater than 0` |
| 400 | `Invalid category. Valid categories are: ...` |
| 400 | `Invalid payment method. Valid methods are: ...` |

---

## PUT /finances/:id

Actualiza un gasto existente. Todos los campos son opcionales.

### Request Body (todos opcionales)
```json
{
  "category": "string",
  "description": "string",
  "amount": "number"
}
```

### Response 200
Devuelve el objeto gasto actualizado.

---

## DELETE /finances/:id

Elimina lógicamente un gasto. Solo `admin`.
Al eliminar, se revierte automáticamente la entrada de flujo de caja asociada.

### Response 200
```json
{
  "success": true,
  "message": "Expense deleted successfully",
  "data": null
}
```

---

## Ideas de uso para el frontend

```
Registro de gastos durante el turno:
1. GET /finances/categories → cargar opciones del selector
2. GET /cashbox/status → obtener cashbox_id activo
3. POST /finances → registrar el gasto

Reporte de gastos:
- GET /finances/summary/category → gráfico de torta por categoría
- GET /finances/daily → gráfico de línea de gastos diarios
- GET /finances?start_date=X&end_date=Y → tabla detallada

Panel de capital de trabajo (admin):
- GET /finances/inventory-value → valor del inventario
- GET /finances/waste-value → pérdidas por merma
- GET /finances/cash-in-boxes → efectivo disponible
- GET /equity/current-capital → capital actual (reemplaza working-capital)
```
