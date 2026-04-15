# Módulo: FINANCES — Finanzas / Gastos

**Ruta base:** `/api/v1/finances`

## Descripción general

Gestiona los gastos operativos del negocio (compra de flores, servicios, transporte, salarios, etc.).
Cada gasto se asocia a una sesión de caja y actualiza automáticamente el flujo de efectivo.

> El capital de trabajo y los cierres mensuales se gestionan exclusivamente en el módulo **Equity** (`/api/v1/equity`).

---

## Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/finances` | Listar gastos con filtros | Sí |
| GET | `/finances/summary/category` | Resumen de gastos por categoría | Sí |
| GET | `/finances/daily` | Gastos diarios (últimos 30 días) | Sí |
| GET | `/finances/categories` | Categorías válidas de gasto | Sí |
| GET | `/finances/payment-methods` | Métodos de pago válidos | Sí |
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
      { "category": "flowers", "count": "12", "total": "850.00" },
      { "category": "salaries", "count": "2", "total": "3000.00" }
    ],
    "summary": {
      "total_expenses": 4200.00,
      "total_count": 18
    }
  }
}
```

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
    { "date": "2024-01-20", "total_amount": "185.00", "count": "3" },
    { "date": "2024-01-19", "total_amount": "50.00", "count": "1" }
  ]
}
```

---

## GET /finances/categories

```json
{
  "success": true,
  "message": "Valid categories retrieved successfully",
  "data": ["flowers", "services", "transport", "salaries", "utilities", "supplies", "other"]
}
```

---

## GET /finances/payment-methods

```json
{
  "success": true,
  "message": "Valid payment methods retrieved successfully",
  "data": ["cash", "transfer", "card", "yape", "plin"]
}
```

---

## GET /finances/:id

Obtiene un gasto por su ID. Devuelve el objeto gasto completo.

---

## POST /finances

Crea un nuevo gasto. Se registra automáticamente en el flujo de caja de la sesión indicada.

### Request Body
```json
{
  "cashbox_id": 3,
  "description": "Compra de rosas rojas - Proveedor Flores del Norte",
  "amount": 150.00,
  "category": "flowers",
  "payment_method": "cash",
  "receipt_number": "B001-00123",
  "notes": "string (opcional)",
  "date": "2024-01-20"
}
```

| Campo | Requerido | Descripción |
|-------|-----------|-------------|
| `cashbox_id` | Sí | ID de la sesión de caja activa |
| `description` | Sí | Descripción del gasto |
| `amount` | Sí | Monto mayor a 0 |
| `category` | Sí | Ver categorías válidas |
| `payment_method` | No | Ver métodos válidos |
| `receipt_number` | No | Número de comprobante |
| `notes` | No | Notas adicionales |
| `date` | No | YYYY-MM-DD |

> `user_id` se toma automáticamente del token JWT.

### Response 201
```json
{
  "success": true,
  "message": "Expense created successfully",
  "data": { ...objeto gasto }
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

### Response 200
Devuelve el objeto gasto actualizado.

---

## DELETE /finances/:id

Elimina lógicamente un gasto. Solo `admin`.
Al eliminar, se revierte automáticamente la entrada de flujo de caja asociada.

### Response 200
```json
{ "success": true, "message": "Expense deleted successfully", "data": null }
```

---

## Uso en el frontend

```
Registro de gastos durante el turno:
1. GET /finances/categories → cargar opciones del selector
2. GET /cashbox/status → obtener cashbox_id activo
3. POST /finances → registrar el gasto

Reporte de gastos:
- GET /finances/summary/category → gráfico de torta por categoría
- GET /finances/daily → gráfico de línea de gastos diarios
- GET /finances?start_date=X&end_date=Y → tabla detallada

Capital de trabajo y cierres mensuales → ver módulo Equity (/api/v1/equity)
```
