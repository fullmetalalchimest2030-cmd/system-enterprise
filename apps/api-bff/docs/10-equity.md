# Módulo: EQUITY — Patrimonio / Capital de Trabajo

**Ruta base:** `/api/v1/equity`

## Descripción general

Gestiona el cierre mensual del capital de trabajo. Al cerrar un período, el sistema calcula
y persiste el capital neto del negocio usando: capital inicial del período anterior + inventario neto
+ efectivo en cajas − gastos del período.

Este módulo reemplaza los endpoints deprecados de `/finances/capital-config` y `/finances/working-capital`.

> **Importante:** Este módulo tiene un formato de respuesta diferente al resto de la API.
> No usa el wrapper `{ success, message, data }` estándar.

---

## Endpoints

| Método | Ruta | Descripción | Rol requerido |
|--------|------|-------------|---------------|
| POST | `/equity/close` | Cerrar período mensual | `admin` |
| GET | `/equity/history` | Historial de cierres | Autenticado |
| GET | `/equity/current-capital` | Capital actual del negocio | Autenticado |

---

## Objeto Registro de Equity

```json
{
  "id": 1,
  "period_year": 2024,
  "period_month": 1,
  "initial_capital": 10000.00,
  "inventory_net": 4124.50,
  "cash_in_boxes": 1850.00,
  "total_expenses": 3200.00,
  "final_capital": 12774.50,
  "notes": "Cierre del mes de enero 2024",
  "closed_by": 1,
  "created_at": "2024-01-31T23:59:59.000Z",
  "variation_absolute": null,
  "variation_percentage": null
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID del registro |
| `period_year` | number | Año del período (ej: 2024) |
| `period_month` | number | Mes del período (1-12) |
| `initial_capital` | string/number | Capital inicial del período (del cierre anterior o variable de entorno) |
| `inventory_net` | string/number | Valor del inventario − mermas del período |
| `cash_in_boxes` | string/number | Efectivo en cajas durante el período |
| `total_expenses` | string/number | Total de gastos del período |
| `final_capital` | string/number | Capital final: initial + inventory_net + cash_in_boxes − expenses |
| `notes` | string \| null | Notas del cierre |
| `closed_by` | number | ID del admin que realizó el cierre |
| `created_at` | string ISO | Fecha y hora del cierre |
| `variation_absolute` | number \| null | Variación vs período anterior (solo en historial) |
| `variation_percentage` | number \| null | Variación porcentual vs período anterior (solo en historial) |

---

## POST /equity/close

Cierra el período mensual y persiste el capital calculado. Solo `admin`.
Solo puede haber un cierre por período (año + mes). Si ya existe, devuelve 409.

### Cálculo del capital final
```
final_capital = initial_capital + inventory_net + cash_in_boxes - total_expenses

donde:
  initial_capital = final_capital del período anterior (o INITIAL_CAPITAL del .env si no hay historial)
  inventory_net   = valor_inventario_actual - valor_mermas_del_período
  cash_in_boxes   = efectivo en cajas abiertas y cerradas del período
  total_expenses  = suma de gastos registrados en el período
```

### Request Body
```json
{
  "period_year": "number — requerido, mínimo 2020",
  "period_month": "number — requerido, 1-12",
  "notes": "string — opcional"
}
```

### Ejemplo
```json
{
  "period_year": 2024,
  "period_month": 1,
  "notes": "Cierre del mes de enero 2024"
}
```

### Response 201
```json
{
  "data": {
    "id": 1,
    "period_year": 2024,
    "period_month": 1,
    "initial_capital": "10000.00",
    "inventory_net": "4124.50",
    "cash_in_boxes": "1850.00",
    "total_expenses": "3200.00",
    "final_capital": "12774.50",
    "notes": "Cierre del mes de enero 2024",
    "closed_by": 1,
    "created_at": "2024-01-31T23:59:59.000Z"
  }
}
```

> **Nota:** Devuelve `{ data: { ...registro } }` directamente, sin el wrapper `success/message`.

### Errores
| Código | Mensaje |
|--------|---------|
| 400 | `period_year y period_month son requeridos y deben ser válidos` |
| 409 | `El período 2024-1 ya fue cerrado` |
| 500 | `Error interno del servidor` |

---

## GET /equity/history

Historial de cierres ordenado cronológicamente (más antiguo primero).
Incluye variación absoluta y porcentual respecto al período anterior.

### Query Parameters
| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `limit` | number | sin límite | Máximo de registros |

### Response 200
```json
{
  "data": [
    {
      "id": 1,
      "period_year": 2024,
      "period_month": 1,
      "initial_capital": "10000.00",
      "inventory_net": "4124.50",
      "cash_in_boxes": "1850.00",
      "total_expenses": "3200.00",
      "final_capital": "12774.50",
      "notes": "Cierre enero",
      "closed_by": 1,
      "created_at": "2024-01-31T23:59:59.000Z",
      "variation_absolute": null,
      "variation_percentage": null
    },
    {
      "id": 2,
      "period_year": 2024,
      "period_month": 2,
      "initial_capital": "12774.50",
      "inventory_net": "4500.00",
      "cash_in_boxes": "2100.00",
      "total_expenses": "3500.00",
      "final_capital": "15874.50",
      "notes": null,
      "closed_by": 1,
      "created_at": "2024-02-29T23:59:59.000Z",
      "variation_absolute": "3100.00",
      "variation_percentage": "24.27"
    }
  ]
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `variation_absolute` | string \| null | Diferencia de `final_capital` vs período anterior (`null` para el primero) |
| `variation_percentage` | string \| null | Variación porcentual vs período anterior (`null` para el primero) |

> **Nota:** Devuelve `{ data: [...] }` directamente, sin el wrapper `success/message`.

---

## GET /equity/current-capital

Capital actual del negocio. Usa el `final_capital` del último cierre registrado.
Si no hay cierres, usa el valor de la variable de entorno `INITIAL_CAPITAL`.

### Response 200
```json
{
  "current_capital": 15874.50,
  "source": "equity"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `current_capital` | number | Capital actual del negocio |
| `source` | string | `"equity"` = desde BD \| `"environment"` = desde variable de entorno |

> **Nota:** Devuelve el objeto directamente, sin el wrapper `success/message/data`.

---

## Diferencias de formato de respuesta

| Endpoint | Formato de respuesta |
|----------|---------------------|
| `POST /equity/close` | `{ data: { ...registro } }` |
| `GET /equity/history` | `{ data: [ ...registros ] }` |
| `GET /equity/current-capital` | `{ current_capital: number, source: string }` |

---

## Ideas de uso para el frontend

```
Cierre mensual (admin):
1. Al final de cada mes, mostrar modal de cierre
2. POST /equity/close con period_year y period_month
3. Mostrar el final_capital calculado con desglose:
   - initial_capital: capital de inicio
   - inventory_net: valor del inventario
   - cash_in_boxes: efectivo disponible
   - total_expenses: gastos del período
   - final_capital: resultado final

Historial de capital (gráfico de evolución):
- GET /equity/history → gráfico de línea con final_capital por mes
- Mostrar variation_percentage para indicar tendencia
- variation_absolute positivo = crecimiento, negativo = pérdida

Widget de capital actual en dashboard:
- GET /equity/current-capital → mostrar en tarjeta
- Si source === "environment", mostrar advertencia: "No hay cierre registrado"

Flujo recomendado para el dashboard financiero:
1. GET /equity/current-capital → capital base actual
2. GET /finances/inventory-value → valor inventario actual
3. GET /finances/waste-value → mermas del período
4. GET /finances/cash-in-boxes → efectivo disponible
5. Calcular capital de trabajo proyectado en el frontend
```
