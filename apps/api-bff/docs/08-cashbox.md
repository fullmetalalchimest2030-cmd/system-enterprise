# Módulo: CASHBOX — Caja

**Ruta base:** `/api/v1/cashbox`

## Descripción general

Gestiona las sesiones de caja (turnos). Cada sesión tiene un monto de apertura y cierre.
El sistema registra automáticamente el flujo de efectivo de ventas en efectivo y gastos.
Al cerrar la caja, calcula el efectivo esperado y la diferencia con el monto real contado.

---

## Endpoints

| Método | Ruta | Descripción | Rol requerido |
|--------|------|-------------|---------------|
| GET | `/cashbox` | Listar sesiones con filtros | Autenticado |
| GET | `/cashbox/today` | Sesiones del día actual | Autenticado |
| GET | `/cashbox/summary` | Resumen de cajas por período | `admin` |
| GET | `/cashbox/status` | Estado de caja del usuario actual | Autenticado |
| GET | `/cashbox/current` | Sesión abierta actual | Autenticado |
| GET | `/cashbox/:id` | Sesión por ID | Autenticado |
| GET | `/cashbox/:cashboxId/transactions` | Transacciones de una sesión | Autenticado |
| GET | `/cashbox/:cashboxId/expected` | Efectivo esperado de una sesión | Autenticado |
| POST | `/cashbox/open` | Abrir nueva sesión | `admin`, `cashier` |
| POST | `/cashbox/:id/close` | Cerrar sesión | `admin`, `cashier` |
| POST | `/cashbox/:cashboxId/income` | Agregar ingreso manual | `admin`, `cashier` |
| POST | `/cashbox/:cashboxId/expense` | Agregar gasto manual | `admin`, `cashier` |

---

## Objeto Sesión de Caja

```json
{
  "id": 1,
  "user_id": 2,
  "user_first_name": "Maria",
  "user_last_name": "Lopez",
  "opening_amount": 100.00,
  "closing_amount": 285.00,
  "expected_amount": 280.00,
  "difference": 5.00,
  "status": "closed",
  "opened_at": "2024-01-20T08:00:00.000Z",
  "closed_at": "2024-01-20T18:00:00.000Z"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID de la sesión |
| `user_id` | number | ID del empleado que abrió la caja |
| `user_first_name` | string | Nombre del empleado |
| `user_last_name` | string | Apellido del empleado |
| `opening_amount` | number | Monto con el que se abrió la caja |
| `closing_amount` | number \| null | Monto contado al cerrar |
| `expected_amount` | number \| null | Monto esperado calculado por el sistema |
| `difference` | number \| null | `closing_amount - expected_amount` (positivo = sobrante, negativo = faltante) |
| `status` | string | `open` o `closed` |
| `opened_at` | string (ISO) | Fecha y hora de apertura |
| `closed_at` | string \| null | Fecha y hora de cierre |

---

## Objeto Transacción (Cash Flow)

```json
{
  "id": 10,
  "cashbox_id": 1,
  "flow_type_id": 1,
  "flow_type_code": "sale_income",
  "reference_table": "payments",
  "reference_id": 42,
  "amount": 27.00,
  "payment_method_code": "cash",
  "payment_method_name": "Efectivo",
  "created_at": "2024-01-20T14:30:00.000Z"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID de la transacción |
| `cashbox_id` | number | ID de la sesión de caja |
| `flow_type_id` | number | ID del tipo de flujo |
| `flow_type_code` | string | `sale_income`, `income`, `expense`, `opening` |
| `reference_table` | string \| null | Tabla de referencia (`payments`, `expenses`) |
| `reference_id` | number \| null | ID del registro de referencia |
| `amount` | number | Monto (positivo = ingreso, negativo = gasto) |
| `payment_method_code` | string \| null | Código del método de pago (solo para ventas) |
| `payment_method_name` | string \| null | Nombre del método de pago |
| `created_at` | string (ISO) | Fecha y hora |

---

## GET /cashbox

Lista sesiones de caja con filtros.

### Query Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `status` | string | No | `open` o `closed` |
| `employee_id` | number | No | Filtrar por empleado |
| `start_date` | string | No | Fecha inicio (YYYY-MM-DD) |
| `end_date` | string | No | Fecha fin (YYYY-MM-DD) |
| `limit` | number | No | Máximo de resultados |

### Response 200
```json
{
  "success": true,
  "message": "Cashbox sessions retrieved successfully",
  "data": [
    {
      "id": 1,
      "user_id": 2,
      "user_first_name": "Maria",
      "user_last_name": "Lopez",
      "opening_amount": 100.00,
      "closing_amount": 285.00,
      "expected_amount": 280.00,
      "difference": 5.00,
      "status": "closed",
      "opened_at": "2024-01-20T08:00:00.000Z",
      "closed_at": "2024-01-20T18:00:00.000Z"
    }
  ]
}
```

---

## GET /cashbox/today

Devuelve todas las sesiones del día actual.

### Response 200
Igual que GET /cashbox pero filtrado por fecha actual.

---

## GET /cashbox/summary

Resumen estadístico de sesiones de caja. Solo `admin`.

### Query Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `start_date` | string | No | Fecha inicio |
| `end_date` | string | No | Fecha fin |

### Response 200
```json
{
  "success": true,
  "message": "Cashbox summary retrieved successfully",
  "data": {
    "summary": {
      "total_sessions": "15",
      "open_sessions": "1",
      "closed_sessions": "14",
      "total_opening": "1500.00",
      "total_closing": "18500.00",
      "total_difference": "250.00"
    },
    "period": {
      "start_date": "2024-01-01",
      "end_date": "2024-01-31"
    }
  }
}
```

### Campos de respuesta — `data.summary`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `total_sessions` | string | Total de sesiones en el período |
| `open_sessions` | string | Sesiones actualmente abiertas |
| `closed_sessions` | string | Sesiones cerradas |
| `total_opening` | string | Suma de montos de apertura |
| `total_closing` | string | Suma de montos de cierre |
| `total_difference` | string | Suma de diferencias (sobrantes/faltantes) |

---

## GET /cashbox/status

Devuelve el estado de la caja del usuario autenticado (o del `employee_id` especificado).

### Query Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `employee_id` | number | No | ID del empleado (default: usuario del token) |

### Response 200 — Caja abierta
```json
{
  "success": true,
  "message": "Cashbox status retrieved successfully",
  "data": {
    "status": "open",
    "session": {
      "id": 3,
      "user_id": 2,
      "opening_amount": 100.00,
      "expected_amount": 245.00,
      "status": "open",
      "opened_at": "2024-01-20T08:00:00.000Z"
    },
    "total_income": 145.00,
    "total_expenses": 0.00,
    "current_balance": 245.00
  }
}
```

### Response 200 — Caja cerrada
```json
{
  "success": true,
  "message": "Cashbox status retrieved successfully",
  "data": {
    "status": "closed",
    "session": null
  }
}
```

### Campos de respuesta — cuando `status: "open"`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `status` | string | `"open"` |
| `session` | object | Datos de la sesión activa |
| `session.expected_amount` | number | Balance esperado en tiempo real |
| `total_income` | number | Total de ingresos en efectivo en la sesión |
| `total_expenses` | number | Total de gastos en la sesión |
| `current_balance` | number | Balance actual: apertura + ingresos - gastos |

---

## GET /cashbox/current

Devuelve la sesión abierta actual.

### Query Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `employee_id` | number | No | ID del empleado |

### Response 200
```json
{
  "success": true,
  "message": "Current open session retrieved successfully",
  "data": {
    "id": 3,
    "user_id": 2,
    "user_first_name": "Maria",
    "user_last_name": "Lopez",
    "opening_amount": 100.00,
    "closing_amount": null,
    "expected_amount": null,
    "difference": null,
    "status": "open",
    "opened_at": "2024-01-20T08:00:00.000Z",
    "closed_at": null
  }
}
```

> Devuelve `null` en `data` si no hay sesión abierta.

---

## GET /cashbox/:id

Obtiene una sesión de caja por su ID.

### Response 200
Devuelve el objeto sesión completo.

---

## GET /cashbox/:cashboxId/transactions

Lista todas las transacciones (flujo de caja) de una sesión.

### Response 200
```json
{
  "success": true,
  "message": "Transactions retrieved successfully",
  "data": [
    {
      "id": 10,
      "cashbox_id": 3,
      "flow_type_id": 1,
      "flow_type_code": "sale_income",
      "reference_table": "payments",
      "reference_id": 42,
      "amount": 27.00,
      "payment_method_code": "cash",
      "payment_method_name": "Efectivo",
      "created_at": "2024-01-20T14:30:00.000Z"
    },
    {
      "id": 11,
      "cashbox_id": 3,
      "flow_type_id": 3,
      "flow_type_code": "expense",
      "reference_table": "expenses",
      "reference_id": 5,
      "amount": -15.00,
      "payment_method_code": null,
      "payment_method_name": null,
      "created_at": "2024-01-20T11:00:00.000Z"
    }
  ]
}
```

---

## GET /cashbox/:cashboxId/expected

Calcula el efectivo esperado en una sesión basado en el flujo de caja.

> Solo considera efectivo físico: ventas en cash + ingresos manuales - gastos.
> Las ventas con Yape, Plin, transferencia o tarjeta NO se incluyen en el efectivo esperado.

### Response 200
```json
{
  "success": true,
  "message": "Expected cash calculated successfully",
  "data": {
    "opening_amount": 100.00,
    "total_income": 145.00,
    "total_expenses": 15.00,
    "expected_cash": 230.00,
    "actual_cash": 235.00,
    "difference": 5.00
  }
}
```

### Campos de respuesta — `data`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `opening_amount` | number | Monto de apertura |
| `total_income` | number | Total de ingresos en efectivo |
| `total_expenses` | number | Total de gastos |
| `expected_cash` | number | Efectivo esperado: apertura + ingresos - gastos |
| `actual_cash` | number \| null | Monto contado al cierre (null si aún abierta) |
| `difference` | number \| null | Diferencia real vs esperado |

---

## POST /cashbox/open

Abre una nueva sesión de caja. Roles: `admin`, `cashier`.

> Solo puede haber una sesión abierta por usuario a la vez.

### Request Body
```json
{
  "opening_amount": "number (requerido) — monto inicial en caja",
  "employee_id": "number (opcional) — se toma del token si no se envía"
}
```

### Ejemplo de request
```json
{
  "opening_amount": 100.00
}
```

### Response 201
```json
{
  "success": true,
  "message": "Cashbox session opened successfully",
  "data": {
    "id": 4,
    "user_id": 2,
    "user_first_name": "Maria",
    "user_last_name": "Lopez",
    "opening_amount": 100.00,
    "closing_amount": null,
    "expected_amount": null,
    "difference": null,
    "status": "open",
    "opened_at": "2024-01-21T08:00:00.000Z",
    "closed_at": null
  }
}
```

### Errores posibles
| Código | Mensaje |
|--------|---------|
| 400 | `There is already an open cashbox session for this user` |
| 400 | `Opening amount cannot be negative` |

---

## POST /cashbox/:id/close

Cierra una sesión de caja. Roles: `admin`, `cashier`.

### Path Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | number | ID de la sesión a cerrar |

### Request Body
```json
{
  "closing_amount": "number (requerido) — monto contado físicamente al cerrar"
}
```

### Ejemplo de request
```json
{
  "closing_amount": 235.00
}
```

### Response 200
```json
{
  "success": true,
  "message": "Cashbox session closed successfully",
  "data": {
    "id": 4,
    "user_id": 2,
    "opening_amount": 100.00,
    "closing_amount": 235.00,
    "expected_amount": 230.00,
    "difference": 5.00,
    "status": "closed",
    "opened_at": "2024-01-21T08:00:00.000Z",
    "closed_at": "2024-01-21T18:00:00.000Z"
  }
}
```

### Errores posibles
| Código | Mensaje |
|--------|---------|
| 400 | `Cashbox session is already closed` |
| 400 | `Closing amount cannot be negative` |

---

## POST /cashbox/:cashboxId/income

Agrega un ingreso manual a la caja (no relacionado a una venta). Roles: `admin`, `cashier`.

### Request Body
```json
{
  "amount": "number (requerido) — monto positivo",
  "description": "string (opcional) — descripción del ingreso"
}
```

### Ejemplo de request
```json
{
  "amount": 50.00,
  "description": "Cobro de deuda pendiente"
}
```

### Response 200
```json
{
  "success": true,
  "message": "Income added successfully",
  "data": {
    "id": 15,
    "cashbox_id": 4,
    "flow_type_code": "income",
    "amount": 50.00,
    "created_at": "2024-01-21T10:00:00.000Z"
  }
}
```

---

## POST /cashbox/:cashboxId/expense

Agrega un gasto manual a la caja. Roles: `admin`, `cashier`.

> Para gastos con categoría y trazabilidad completa, usar `POST /finances` en su lugar.

### Request Body
```json
{
  "amount": "number (requerido) — monto positivo (el sistema lo convierte a negativo)",
  "description": "string (opcional) — descripción del gasto"
}
```

### Ejemplo de request
```json
{
  "amount": 20.00,
  "description": "Compra de cinta decorativa"
}
```

### Response 200
```json
{
  "success": true,
  "message": "Expense added successfully",
  "data": {
    "id": 16,
    "cashbox_id": 4,
    "flow_type_code": "expense",
    "amount": -20.00,
    "created_at": "2024-01-21T11:00:00.000Z"
  }
}
```

---

## Ideas de uso para el frontend

```
Inicio de turno (cajero):
1. GET /cashbox/status → verificar si ya hay caja abierta
2. Si no hay: POST /cashbox/open con opening_amount
3. Guardar cashbox_id para usarlo en las ventas

Durante el turno:
- GET /cashbox/status → mostrar balance en tiempo real
- GET /cashbox/:id/transactions → historial de movimientos
- POST /cashbox/:id/income → registrar ingreso extra
- POST /cashbox/:id/expense → registrar gasto menor

Cierre de turno:
1. GET /cashbox/:id/expected → mostrar efectivo esperado
2. Cajero cuenta el efectivo físico
3. POST /cashbox/:id/close con closing_amount
4. Mostrar diferencia (sobrante/faltante)

Panel admin:
- GET /cashbox/summary → resumen del período
- GET /cashbox/today → sesiones del día
- GET /cashbox?status=open → cajas actualmente abiertas
```
