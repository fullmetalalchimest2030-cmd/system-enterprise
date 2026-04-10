# Módulo: ALERTS — Alertas / Notificaciones

**Ruta base:** `/api/v1/alerts`

## Descripción general

Gestiona las notificaciones del sistema. Las alertas se generan automáticamente cuando el stock
de un producto cae por debajo del mínimo, o manualmente por un admin.

> **Importante:** Los tipos y severidades válidos difieren entre el servicio y el modelo.
> El servicio valida: `type` ∈ `{low_stock, high_waste, low_profit, cash_difference}` y `severity` ∈ `{low, medium, high, critical}`.
> El modelo almacena en la tabla `notifications` con los campos `type`, `severity`, `message`, `is_read`.

---

## Endpoints

| Método | Ruta | Descripción | Rol requerido |
|--------|------|-------------|---------------|
| GET | `/alerts` | Listar alertas con filtros | Autenticado |
| GET | `/alerts/unread/count` | Contador de no leídas | Autenticado |
| GET | `/alerts/critical` | Alertas críticas | Autenticado |
| GET | `/alerts/:id` | Alerta por ID | Autenticado |
| POST | `/alerts` | Crear alerta manualmente | `admin` |
| POST | `/alerts/check/low-stock` | Verificar stock bajo y crear alertas | `admin` |
| PUT | `/alerts/:id/read` | Marcar como leída | Autenticado |
| PUT | `/alerts/:id/resolve` | Resolver alerta (marca como leída) | Autenticado |
| PUT | `/alerts/read-all` | Marcar todas como leídas | Autenticado |
| DELETE | `/alerts/:id` | Eliminar alerta | `admin` |

---

## Tipos de alerta (`type`)

| Valor | Descripción |
|-------|-------------|
| `low_stock` | Stock de producto por debajo del mínimo |
| `high_waste` | Nivel de merma elevado |
| `low_profit` | Rentabilidad baja |
| `cash_difference` | Diferencia en el cierre de caja |

## Niveles de severidad (`severity`)

| Valor | Descripción |
|-------|-------------|
| `low` | Informativa, no urgente |
| `medium` | Requiere atención (default) |
| `high` | Requiere acción pronto |
| `critical` | Requiere acción inmediata |

---

## Objeto Alerta

```json
{
  "id": 1,
  "type": "low_stock",
  "severity": "high",
  "message": "[Stock bajo] Girasol tiene solo 3 unidades (mínimo: 10)",
  "reference_table": null,
  "reference_id": null,
  "is_read": false,
  "created_at": "2024-01-20T10:00:00.000Z"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID único de la alerta |
| `type` | string | Tipo: `low_stock` \| `high_waste` \| `low_profit` \| `cash_difference` |
| `severity` | string | Severidad: `low` \| `medium` \| `high` \| `critical` |
| `message` | string | Mensaje de la alerta (puede incluir `[título]` al inicio si se envió `title`) |
| `reference_table` | string \| null | Tabla relacionada (ej: `products`) |
| `reference_id` | number \| null | ID del registro relacionado |
| `is_read` | boolean | Si la alerta fue leída |
| `created_at` | string ISO | Fecha de creación |

---

## GET /alerts

### Query Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `type` | string | Filtrar por tipo |
| `severity` | string | Filtrar por severidad |
| `is_read` | boolean | `true` = solo leídas, `false` = solo no leídas |
| `start_date` | string | Fecha inicio (YYYY-MM-DD) |
| `end_date` | string | Fecha fin (YYYY-MM-DD) |
| `limit` | number | Máximo de resultados |

### Response 200
```json
{
  "success": true,
  "message": "Alerts retrieved successfully",
  "data": [
    {
      "id": 5,
      "type": "low_stock",
      "severity": "critical",
      "message": "[Stock bajo] Girasol tiene solo 2 unidades",
      "reference_table": "products",
      "reference_id": 3,
      "is_read": false,
      "created_at": "2024-01-20T10:00:00.000Z"
    },
    {
      "id": 4,
      "type": "cash_difference",
      "severity": "medium",
      "message": "Diferencia de S/5.00 en cierre de caja",
      "reference_table": null,
      "reference_id": null,
      "is_read": true,
      "created_at": "2024-01-19T18:00:00.000Z"
    }
  ]
}
```

---

## GET /alerts/unread/count

### Response 200
```json
{
  "success": true,
  "message": "Unread count retrieved successfully",
  "data": {
    "unread_count": 5
  }
}
```

---

## GET /alerts/critical

Alertas con `severity: "critical"`, ordenadas de más reciente a más antigua.

### Query Parameters
| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `limit` | number | 10 | Máximo de resultados |

### Response 200
```json
{
  "success": true,
  "message": "Critical alerts retrieved successfully",
  "data": [
    {
      "id": 5,
      "type": "low_stock",
      "severity": "critical",
      "message": "[Stock bajo] Girasol tiene solo 2 unidades",
      "reference_table": "products",
      "reference_id": 3,
      "is_read": false,
      "created_at": "2024-01-20T10:00:00.000Z"
    }
  ]
}
```

---

## GET /alerts/:id

### Response 200
```json
{
  "success": true,
  "message": "Alert retrieved successfully",
  "data": {
    "id": 5,
    "type": "low_stock",
    "severity": "critical",
    "message": "[Stock bajo] Girasol tiene solo 2 unidades",
    "reference_table": "products",
    "reference_id": 3,
    "is_read": false,
    "created_at": "2024-01-20T10:00:00.000Z"
  }
}
```

---

## POST /alerts

Crea una alerta manualmente. Solo `admin`.

### Request Body
```json
{
  "type": "string — requerido: low_stock | high_waste | low_profit | cash_difference",
  "title": "string — requerido, se antepone al mensaje como [título]",
  "message": "string — requerido",
  "severity": "string — opcional, default: 'medium': low | medium | high | critical",
  "related_id": "number — opcional, ID del registro relacionado"
}
```

### Ejemplo
```json
{
  "type": "cash_difference",
  "title": "Diferencia en caja",
  "message": "Se detectó una diferencia de S/10.00 en el cierre de caja del turno de la tarde",
  "severity": "high",
  "related_id": 4
}
```

### Response 201
```json
{
  "success": true,
  "message": "Alert created successfully",
  "data": {
    "id": 10,
    "type": "cash_difference",
    "severity": "high",
    "message": "[Diferencia en caja] Se detectó una diferencia de S/10.00 en el cierre de caja del turno de la tarde",
    "reference_table": "user_created",
    "reference_id": 4,
    "is_read": false,
    "created_at": "2024-01-20T12:00:00.000Z"
  }
}
```

> El mensaje guardado es `[title] message`. El campo `reference_table` se establece como `"user_created"` cuando se crea manualmente.

### Errores
| Código | Mensaje |
|--------|---------|
| 400 | `Type, title, and message are required` |
| 400 | `Invalid type. Valid types are: low_stock, high_waste, low_profit, cash_difference` |
| 400 | `Invalid severity. Valid severities are: low, medium, high, critical` |

---

## POST /alerts/check/low-stock

Verifica todos los productos activos y crea alertas para los que tengan stock bajo.
Solo `admin`.

### Response 200
```json
{
  "success": true,
  "message": "Low stock check completed",
  "data": [
    {
      "id": 11,
      "type": "low_stock",
      "severity": "critical",
      "message": "[Low Stock Alert] Product \"Girasol\" is running low. Current stock: 2, Minimum stock: 10",
      "reference_table": null,
      "reference_id": 3,
      "is_read": false,
      "created_at": "2024-01-20T12:00:00.000Z"
    }
  ]
}
```

> Devuelve array vacío `[]` si no hay productos con stock bajo o si ya tienen alertas activas.

---

## PUT /alerts/:id/read

### Response 200
```json
{
  "success": true,
  "message": "Alert marked as read",
  "data": {
    "id": 5,
    "type": "low_stock",
    "severity": "critical",
    "message": "[Stock bajo] Girasol tiene solo 2 unidades",
    "reference_table": "products",
    "reference_id": 3,
    "is_read": true,
    "created_at": "2024-01-20T10:00:00.000Z"
  }
}
```

---

## PUT /alerts/:id/resolve

Resuelve una alerta (en la implementación actual, la marca como leída).

### Response 200
```json
{
  "success": true,
  "message": "Alert resolved successfully",
  "data": {
    "id": 5,
    "type": "low_stock",
    "severity": "critical",
    "message": "[Stock bajo] Girasol tiene solo 2 unidades",
    "reference_table": "products",
    "reference_id": 3,
    "is_read": true,
    "created_at": "2024-01-20T10:00:00.000Z"
  }
}
```

---

## PUT /alerts/read-all

### Response 200
```json
{
  "success": true,
  "message": "All alerts marked as read",
  "data": {
    "marked_count": 8
  }
}
```

---

## DELETE /alerts/:id

Elimina una alerta permanentemente. Solo `admin`.

### Response 200
```json
{
  "success": true,
  "message": "Alert deleted successfully",
  "data": null
}
```

---

## Ideas de uso para el frontend

```
Badge de notificaciones:
- GET /alerts/unread/count → número en el ícono de campana
- Actualizar cada 30 segundos o al hacer focus en la ventana

Panel de notificaciones (dropdown):
- GET /alerts?is_read=false&limit=10 → últimas no leídas
- PUT /alerts/:id/read → al hacer click en una alerta
- PUT /alerts/read-all → botón "Marcar todas como leídas"

Alertas críticas en el dashboard:
- GET /alerts/critical?limit=5 → widget de alertas urgentes
- Colorear según severity: critical=rojo, high=naranja, medium=amarillo, low=azul

Gestión de alertas (admin):
- GET /alerts → tabla completa con filtros
- POST /alerts/check/low-stock → botón "Verificar stock ahora"
- DELETE /alerts/:id → limpiar alertas resueltas

Flujo automático recomendado:
1. Al cargar la app: GET /alerts/unread/count
2. Al abrir el panel: GET /alerts?is_read=false
3. Al ver una alerta: PUT /alerts/:id/read
4. Periódicamente (admin): POST /alerts/check/low-stock
```
