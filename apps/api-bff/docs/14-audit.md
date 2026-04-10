# Módulo: AUDIT — Auditoría

**Ruta base:** `/api/v1/audit`

## Descripción general

Registra y consulta el historial de acciones del sistema. Los logs se generan automáticamente
en operaciones críticas y también pueden crearse manualmente. Todos los endpoints requieren rol `admin`.

La tabla `audit_logs` almacena: `user_id`, `action`, `module`, `reference_table`, `reference_id`,
`old_values` (JSON), `new_values` (JSON), `created_at`.

---

## Endpoints

| Método | Ruta | Descripción | Rol requerido |
|--------|------|-------------|---------------|
| GET | `/audit` | Listar logs con filtros | `admin` |
| GET | `/audit/statistics` | Estadísticas de acciones | `admin` |
| GET | `/audit/user/:userId` | Logs de un usuario | `admin` |
| GET | `/audit/record/:tableName/:recordId` | Logs de un registro específico | `admin` |
| GET | `/audit/:id` | Log por ID | `admin` |
| POST | `/audit` | Crear log manualmente | `admin` |

---

## Acciones válidas

| Acción | Descripción |
|--------|-------------|
| `create` | Creación genérica |
| `read` | Lectura |
| `update` | Actualización genérica |
| `delete` | Eliminación genérica |
| `login` | Inicio de sesión |
| `logout` | Cierre de sesión |
| `sale_created` | Venta creada |
| `sale_completed` | Venta completada |
| `sale_cancelled` | Venta cancelada |
| `inventory_in` | Entrada de inventario |
| `inventory_out` | Salida de inventario |
| `inventory_adjustment` | Ajuste de inventario |
| `cashbox_open` | Apertura de caja |
| `cashbox_close` | Cierre de caja |
| `cashbox_adjustment` | Ajuste de caja |
| `expense_created` | Gasto creado |
| `expense_updated` | Gasto actualizado |
| `expense_deleted` | Gasto eliminado |
| `alert_created` | Alerta creada |
| `alert_resolved` | Alerta resuelta |
| `user_created` | Usuario creado |
| `user_updated` | Usuario actualizado |

---

## Objeto Log de Auditoría

```json
{
  "id": 25,
  "user_id": 2,
  "user_first_name": "Maria",
  "user_last_name": "Lopez",
  "action": "sale_created",
  "module": "sales",
  "reference_table": "sales",
  "reference_id": 42,
  "old_values": null,
  "new_values": {
    "total_amount": 27.00,
    "items_count": 2,
    "status": "completed"
  },
  "created_at": "2024-01-20T14:30:00.000Z"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID único del log |
| `user_id` | number | ID del usuario que realizó la acción |
| `user_first_name` | string \| null | Nombre del usuario (join) |
| `user_last_name` | string \| null | Apellido del usuario (join) |
| `action` | string | Tipo de acción realizada |
| `module` | string \| null | Módulo del sistema (ej: `sales`, `inventory`, `cashbox`) |
| `reference_table` | string \| null | Tabla afectada (ej: `sales`, `products`) |
| `reference_id` | number \| null | ID del registro afectado |
| `old_values` | object \| null | Estado anterior del registro (JSON) |
| `new_values` | object \| null | Estado nuevo del registro (JSON) |
| `created_at` | string ISO | Fecha y hora de la acción |

---

## GET /audit

### Query Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `user_id` | number | Filtrar por usuario |
| `action` | string | Filtrar por tipo de acción |
| `table_name` | string | Filtrar por tabla afectada (`reference_table`) |
| `start_date` | string | Fecha inicio (YYYY-MM-DD) |
| `end_date` | string | Fecha fin (YYYY-MM-DD) |
| `limit` | number | Máximo de resultados |

### Response 200
```json
{
  "success": true,
  "message": "Audit logs retrieved successfully",
  "data": [
    {
      "id": 25,
      "user_id": 2,
      "user_first_name": "Maria",
      "user_last_name": "Lopez",
      "action": "sale_created",
      "module": "sales",
      "reference_table": "sales",
      "reference_id": 42,
      "old_values": null,
      "new_values": {
        "total_amount": 27.00,
        "status": "completed"
      },
      "created_at": "2024-01-20T14:30:00.000Z"
    }
  ]
}
```

---

## GET /audit/statistics

Estadísticas de acciones en un período.

### Query Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `start_date` | string | Fecha inicio |
| `end_date` | string | Fecha fin |

### Response 200
```json
{
  "success": true,
  "message": "Action statistics retrieved successfully",
  "data": {
    "by_action": [
      {
        "action": "sale_created",
        "count": "145",
        "unique_users": "3"
      },
      {
        "action": "inventory_in",
        "count": "38",
        "unique_users": "2"
      }
    ],
    "by_module": [
      {
        "module": "sales",
        "count": "145"
      },
      {
        "module": "inventory",
        "count": "50"
      }
    ],
    "top_users": [
      {
        "first_name": "Maria",
        "last_name": "Lopez",
        "action_count": "180"
      },
      {
        "first_name": "Juan",
        "last_name": "Perez",
        "action_count": "95"
      }
    ]
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `by_action[].action` | string | Tipo de acción |
| `by_action[].count` | string | Número de ocurrencias |
| `by_action[].unique_users` | string | Número de usuarios distintos que realizaron esta acción |
| `by_module[].module` | string | Módulo del sistema |
| `by_module[].count` | string | Número de acciones en ese módulo |
| `top_users[].first_name` | string | Nombre del usuario |
| `top_users[].last_name` | string | Apellido del usuario |
| `top_users[].action_count` | string | Total de acciones realizadas (top 10) |

---

## GET /audit/user/:userId

Logs de un usuario específico.

### Query Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `action` | string | Filtrar por tipo de acción |
| `start_date` | string | Fecha inicio |
| `end_date` | string | Fecha fin |
| `limit` | number | Máximo de resultados |

### Response 200
```json
{
  "success": true,
  "message": "User audit logs retrieved successfully",
  "data": [
    {
      "id": 25,
      "user_id": 2,
      "user_first_name": "Maria",
      "user_last_name": "Lopez",
      "action": "sale_created",
      "module": "sales",
      "reference_table": "sales",
      "reference_id": 42,
      "old_values": null,
      "new_values": { "total_amount": 27.00 },
      "created_at": "2024-01-20T14:30:00.000Z"
    }
  ]
}
```

---

## GET /audit/record/:tableName/:recordId

Historial de cambios de un registro específico.

### Ejemplos de uso
```
GET /api/v1/audit/record/products/1     → historial del producto ID 1
GET /api/v1/audit/record/sales/42       → historial de la venta ID 42
GET /api/v1/audit/record/cashboxes/3    → historial de la caja ID 3
```

### Response 200
```json
{
  "success": true,
  "message": "Record audit logs retrieved successfully",
  "data": [
    {
      "id": 30,
      "user_id": 1,
      "user_first_name": "Juan",
      "user_last_name": "Perez",
      "action": "update",
      "module": "products",
      "reference_table": "products",
      "reference_id": 1,
      "old_values": {
        "sell_price": 2.50
      },
      "new_values": {
        "sell_price": 3.00
      },
      "created_at": "2024-01-15T09:00:00.000Z"
    }
  ]
}
```

---

## GET /audit/:id

### Response 200
```json
{
  "success": true,
  "message": "Audit log retrieved successfully",
  "data": {
    "id": 25,
    "user_id": 2,
    "user_first_name": "Maria",
    "user_last_name": "Lopez",
    "action": "sale_created",
    "module": "sales",
    "reference_table": "sales",
    "reference_id": 42,
    "old_values": null,
    "new_values": { "total_amount": 27.00, "status": "completed" },
    "created_at": "2024-01-20T14:30:00.000Z"
  }
}
```

---

## POST /audit

Crea un log manualmente. Solo `admin`.
El `user_id` e `ip_address` se toman del token y la request automáticamente.

### Request Body
```json
{
  "action": "string — requerido, debe ser una acción válida de la lista",
  "table_name": "string — opcional, tabla afectada",
  "record_id": "number — opcional, ID del registro",
  "old_values": "object — opcional, estado anterior",
  "new_values": "object — opcional, estado nuevo"
}
```

### Ejemplo
```json
{
  "action": "inventory_adjustment",
  "table_name": "products",
  "record_id": 5,
  "old_values": { "stock_cached": 50 },
  "new_values": { "stock_cached": 48, "reason": "Conteo físico" }
}
```

### Response 201
```json
{
  "success": true,
  "message": "Audit log created successfully",
  "data": {
    "id": 50,
    "user_id": 1,
    "user_first_name": null,
    "user_last_name": null,
    "action": "inventory_adjustment",
    "module": null,
    "reference_table": "products",
    "reference_id": 5,
    "old_values": { "stock_cached": 50 },
    "new_values": { "stock_cached": 48, "reason": "Conteo físico" },
    "created_at": "2024-01-20T16:00:00.000Z"
  }
}
```

### Errores
| Código | Mensaje |
|--------|---------|
| 400 | `Invalid action. Valid actions are: create, read, update, ...` |

---

## Ideas de uso para el frontend

```
Historial de cambios de un producto:
- GET /audit/record/products/:id → tabla de cambios
- Mostrar old_values vs new_values para ver qué cambió

Actividad de un empleado:
- GET /audit/user/:id → historial de acciones
- Filtrar por action=sale_created para ver solo ventas

Panel de auditoría (admin):
- GET /audit?start_date=X&end_date=Y → tabla completa
- GET /audit/statistics → gráfico de actividad
  - by_action: gráfico de barras por tipo de acción
  - by_module: gráfico de torta por módulo
  - top_users: ranking de usuarios más activos

Investigación de incidentes:
- GET /audit?action=sale_cancelled → ventas canceladas
- GET /audit/record/cashboxes/:id → historial de una caja
- Cruzar con GET /sales/:id para ver el detalle completo
```
