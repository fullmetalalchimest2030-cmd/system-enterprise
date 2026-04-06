# Módulo de Finanzas (Finances Module)

API para la gestión de gastos y cálculo del Capital de Trabajo.

## Tabla de Contenidos

- [Gastos (Expenses)](#gastos-expenses)
- [Capital de Trabajo (Working Capital)](#capital-de-trabajo-working-capital)
- [Configuración](#configuración)

---

## Gastos (Expenses)

### GET /finances

Obtiene todos los gastos con filtros opcionales.

**Autenticación:** Token JWT requerido

**Parámetros de Query:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `category` | string | Filtrar por categoría |
| `user_id` | number | ID del usuario |
| `start_date` | string | Fecha inicio (ISO 8601) |
| `end_date` | string | Fecha fin (ISO 8601) |
| `limit` | number | Límite de resultados |

**Categorías válidas:** `flowers`, `services`, `transport`, `salaries`, `utilities`, `supplies`, `other`

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": "Expenses retrieved successfully",
  "data": [
    {
      "id": 1,
      "cashbox_id": 1,
      "category": "flowers",
      "description": "Compra de rosas",
      "amount": 150.00,
      "user_id": 1,
      "created_at": "2026-03-25T10:00:00Z"
    }
  ]
}
```

---

### GET /finances/:id

Obtiene un gasto específico por ID.

**Autenticación:** Token JWT requerido

**Parámetros de Path:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | number | ID del gasto |

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": "Expense retrieved successfully",
  "data": {
    "id": 1,
    "cashbox_id": 1,
    "category": "flowers",
    "description": "Compra de rosas",
    "amount": 150.00
  }
}
```

---

### POST /finances

Crea un nuevo gasto.

**Autenticación:** Token JWT requerido

**Cuerpo de la solicitud:**

```json
{
  "cashbox_id": 1,
  "category": "flowers",
  "description": "Compra de rosas",
  "amount": 150.00
}
```

**Validaciones:**
- `cashbox_id` (requerido): ID de la caja
- `category` (requerido): Una de las categorías válidas
- `description` (requerido): Descripción del gasto
- `amount` (requerido): Debe ser mayor a 0

**Respuesta exitosa (201):**

```json
{
  "success": true,
  "message": "Expense created successfully",
  "data": {
    "id": 2,
    "cashbox_id": 1,
    "category": "flowers",
    "description": "Compra de rosas",
    "amount": 150.00,
    "created_at": "2026-03-25T10:00:00Z"
  }
}
```

---

### PUT /finances/:id

Actualiza un gasto existente.

**Autenticación:** Token JWT requerido

**Parámetros de Path:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | number | ID del gasto |

**Cuerpo de la solicitud:**

```json
{
  "category": "supplies",
  "description": "Compra de cintas",
  "amount": 75.50
}
```

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": "Expense updated successfully",
  "data": {
    "id": 1,
    "category": "supplies",
    "description": "Compra de cintas",
    "amount": 75.50
  }
}
```

---

### DELETE /finances/:id

Elimina un gasto (soft delete).

**Autenticación:** Token JWT + Rol admin

**Parámetros de Path:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | number | ID del gasto |

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": "Expense deleted successfully",
  "data": null
}
```

---

### GET /finances/summary/category

Obtiene el resumen de gastos por categoría.

**Autenticación:** Token JWT requerido

**Parámetros de Query:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `start_date` | string | Fecha inicio (ISO 8601) |
| `end_date` | string | Fecha fin (ISO 8601) |

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": "Expenses summary retrieved successfully",
  "data": {
    "by_category": [
      {
        "category": "flowers",
        "count": 5,
        "total": 750.00
      }
    ],
    "summary": {
      "total_expenses": 1200.00,
      "total_count": 10
    }
  }
}
```

---

### GET /finances/daily

Obtiene los gastos diarios de los últimos 30 días.

**Autenticación:** Token JWT requerido

**Parámetros de Query:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `start_date` | string | Fecha inicio (ISO 8601) |
| `end_date` | string | Fecha fin (ISO 8601) |

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": "Daily expenses retrieved successfully",
  "data": [
    {
      "date": "2026-03-25",
      "total_amount": 150.00,
      "count": 3
    }
  ]
}
```

---

### GET /finances/categories

Obtiene las categorías válidas para gastos.

**Autenticación:** Token JWT requerido

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": "Valid categories retrieved successfully",
  "data": ["flowers", "services", "transport", "salaries", "utilities", "supplies", "other"]
}
```

---

### GET /finances/payment-methods

Obtiene los métodos de pago válidos.

**Autenticación:** Token JWT requerido

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": "Valid payment methods retrieved successfully",
  "data": ["cash", "transfer", "card", "yape", "plin"]
}
```

---

## Capital de Trabajo (Working Capital)

### GET /finances/working-capital

Obtiene el reporte completo del Capital de Trabajo.

**Autenticación:** Token JWT requerido

**Parámetros de Query:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `start_date` | string | Fecha inicio del período (ISO 8601) |
| `end_date` | string | Fecha fin del período (ISO 8601) |

**Por defecto:** Últimos 30 días

**Fórmula de cálculo:**

```
Capital de Trabajo = (Inventario - Mermas) + Efectivo en Cajas - Gastos
```

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": "Working capital retrieved successfully",
  "data": {
    "period": {
      "start_date": "2026-02-23T00:00:00Z",
      "end_date": "2026-03-25T00:00:00Z"
    },
    "components": {
      "inventory_gross": 15000.00,
      "waste_deductions": 500.00,
      "inventory_net": 14500.00,
      "cash_in_boxes": 3200.00,
      "total_expenses": 2800.00
    },
    "working_capital": 14900.00,
    "status": "solid",
    "status_label": "Sólido",
    "status_color": "green"
  }
}
```

**Estados posibles:**

| Estado | Condición | Color |
|--------|-----------|-------|
| `solid` | Capital > 100% de gastos | verde |
| `warning` | Capital 30%-100% de gastos | amarillo |
| `low` | Capital < 30% de gastos | naranja |
| `critical` | Capital ≤ 0 | rojo |

---

### GET /finances/inventory-value

Obtiene el valor total del inventario.

**Autenticación:** Token JWT requerido

**Cálculo:** `SUM(stock_cached * cost_price)` de todos los productos activos

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": "Inventory value retrieved successfully",
  "data": {
    "inventory_value": 15000.00
  }
}
```

---

### GET /finances/waste-value

Obtiene el valor de las mermas en un período.

**Autenticación:** Token JWT requerido

**Parámetros de Query:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `start_date` | string | Fecha inicio (ISO 8601) |
| `end_date` | string | Fecha fin (ISO 8601) |

**Por defecto:** Últimos 30 días

**Cálculo:** `SUM(ABS(quantity) * cost_price)` de movimientos tipo `waste`

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": "Waste value retrieved successfully",
  "data": {
    "waste_value": 500.00
  }
}
```

---

### GET /finances/cash-in-boxes

Obtiene el efectivo en cajas cerradas.

**Autenticación:** Token JWT requerido

**Parámetros de Query:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `start_date` | string | Fecha inicio (ISO 8601) |
| `end_date` | string | Fecha fin (ISO 8601) |

**Por defecto:** Últimos 30 días

**Cálculo:** `SUM(closing_amount)` de cajas con estado `closed`

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": "Cash in boxes retrieved successfully",
  "data": {
    "cash_in_boxes": 3200.00
  }
}
```

---

## Configuración

### GET /finances/capital-config

Obtiene la configuración del capital inicial.

**Autenticación:** Token JWT + Rol admin

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": "Capital config retrieved successfully",
  "data": {
    "initial_capital": 10000.00,
    "has_initial_capital": true,
    "source": "environment"
  }
}
```

---

### PUT /finances/capital-config

Actualiza la configuración del capital inicial.

**Autenticación:** Token JWT + Rol admin

**Cuerpo de la solicitud:**

```json
{
  "initial_capital": 15000.00
}
```

**Validaciones:**
- `initial_capital` (requerido): Debe ser un número positivo

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": "Capital config updated successfully",
  "data": {
    "initial_capital": 15000.00,
    "message": "Configure INITIAL_WORKING_CAPITAL in .env file",
    "requires_restart": true
  }
}
```

**Nota:** El capital inicial se configura mediante la variable de entorno `INITIAL_WORKING_CAPITAL` en el archivo `.env`.

---

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | Solicitud incorrecta (validación fallida) |
| 401 | No autenticado (token faltante o inválido) |
| 403 | No autorizado (rol insuficiente) |
| 404 | Recurso no encontrado |
| 500 | Error interno del servidor |

---

## Notas

- Todos los endpoints de gastos requieren autenticación JWT
- Los endpoints de capital config requieren rol de admin
- Las fechas deben estar en formato ISO 8601
- El sistema calcula automáticamente las mermas del inventario
- No se requiere modificar la base de datos para usar esta funcionalidad
