# Modelo de Dinero — Guía para Frontend

> Este documento describe cómo funciona todo el flujo de dinero en el sistema, qué endpoints usar en cada pantalla y cómo se relacionan los módulos entre sí.

---

## 1. Visión general del modelo

El sistema maneja el dinero en tres capas independientes pero relacionadas:

```
┌─────────────────────────────────────────────────────────────────┐
│  CAPA 1 — Operaciones diarias                                   │
│                                                                 │
│  Cashbox (Caja)          Finances (Gastos)                      │
│  ─────────────────        ──────────────────                    │
│  Abre/cierra sesión       Registra gastos                       │
│  Registra ventas          Categoriza egresos                    │
│  Controla efectivo        Vincula gasto a caja                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (al final del mes)
┌─────────────────────────────────────────────────────────────────┐
│  CAPA 2 — Cierre mensual                                        │
│                                                                 │
│  Equity (Patrimonio)                                            │
│  ──────────────────────────────────────────────────────────     │
│  Consolida: inventario + efectivo en cajas − gastos             │
│  Persiste el capital final como punto de partida del mes sig.   │
│  Genera historial con variaciones período a período             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  CAPA 3 — Visibilidad                                           │
│                                                                 │
│  Dashboard                                                      │
│  ──────────────────────────────────────────────────────────     │
│  Muestra capital actual, tendencias y alertas                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Fórmula del capital de trabajo

```
final_capital = initial_capital + inventory_net + cash_in_boxes − total_expenses

donde:
  initial_capital  = final_capital del cierre anterior
                     (o INITIAL_CAPITAL del .env si no hay historial)
  inventory_net    = valor del inventario actual − valor de mermas del período
  cash_in_boxes    = efectivo en cajas cerradas (closing_amount)
                     + saldo estimado de cajas abiertas (opening + flujo)
  total_expenses   = suma de todos los gastos del período
```

---

## 3. Flujo de datos paso a paso

### 3.1 Durante el turno (operaciones diarias)

```
Empleado abre caja
  → POST /cashbox/open
  → Se crea sesión con opening_amount

Empleado registra gasto
  → POST /finances
  → Se crea registro en expenses
  → Se crea entrada negativa en cash_flow de esa sesión

Empleado cierra caja
  → POST /cashbox/close
  → Se registra closing_amount
  → La sesión queda cerrada
```

### 3.2 Al final del mes (cierre mensual — solo admin)

```
Admin ejecuta cierre
  → POST /equity/close { period_year, period_month }
  → El sistema calcula automáticamente:
      1. initial_capital  ← final_capital del mes anterior (o .env)
      2. inventory_net    ← productos.stock_cached × cost_price − mermas
      3. cash_in_boxes    ← suma de closing_amount de cajas del período
      4. total_expenses   ← suma de expenses del período
      5. final_capital    ← fórmula arriba
  → Se persiste el registro en la tabla equity
  → Este final_capital se convierte en el initial_capital del mes siguiente
```

### 3.3 Consulta del capital actual

```
Cualquier usuario autenticado
  → GET /equity/current-capital
  → Devuelve { current_capital, source }
  → source = "equity"      → hay historial de cierres
  → source = "environment" → aún no hay cierres, usa valor del .env
```

---

## 4. Endpoints por pantalla

### Dashboard principal

| Dato a mostrar | Endpoint | Campo |
|----------------|----------|-------|
| Capital actual | `GET /equity/current-capital` | `current_capital` |
| Fuente del capital | `GET /equity/current-capital` | `source` |
| Gastos del período | `GET /finances/summary/category` | `data.summary.total_expenses` |
| Gastos por categoría | `GET /finances/summary/category` | `data.by_category` |
| Tendencia diaria | `GET /finances/daily` | array de `{ date, total_amount }` |

> Si `source === "environment"`, mostrar aviso: _"No hay cierre mensual registrado. El capital mostrado es el valor inicial configurado."_

---

### Panel de capital de trabajo (admin)

Muestra el desglose completo del capital en tiempo real antes de hacer el cierre.

| Componente | Endpoint | Campo |
|------------|----------|-------|
| Capital inicial (base) | `GET /equity/current-capital` | `current_capital` |
| Valor del inventario | `GET /finances/inventory-value` | `data.inventory_value` |
| Mermas del período | `GET /finances/waste-value?start_date=X&end_date=Y` | `data.waste_value` |
| Efectivo en cajas | `GET /finances/cash-in-boxes?start_date=X&end_date=Y` | `data.cash_in_boxes` |
| Total gastos | `GET /finances/summary/category?start_date=X&end_date=Y` | `data.summary.total_expenses` |

**Cálculo proyectado en el frontend:**
```js
const inventory_net = inventory_value - waste_value;
const projected_capital = current_capital + inventory_net + cash_in_boxes - total_expenses;
```

**Botón "Cerrar mes" → `POST /equity/close`**

---

### Historial de capital (gráfico de evolución)

```
GET /equity/history
```

Usar `final_capital` por período para el gráfico de línea.
Usar `variation_percentage` para indicadores de tendencia:
- `> 0` → verde (crecimiento)
- `< 0` → rojo (pérdida)
- `null` → primer registro, sin comparación

---

### Registro de gastos (durante el turno)

```
1. GET /cashbox/status          → obtener cashbox_id activo
2. GET /finances/categories     → cargar selector de categoría
3. GET /finances/payment-methods → cargar selector de método de pago
4. POST /finances               → registrar el gasto
```

---

### Reporte de gastos

```
GET /finances?start_date=X&end_date=Y          → tabla detallada
GET /finances/summary/category?...             → gráfico de torta
GET /finances/daily?start_date=X&end_date=Y    → gráfico de línea
```

---

## 5. Formato de respuesta por módulo

Los módulos tienen formatos de respuesta distintos. Es importante que el frontend los maneje correctamente.

### Finances — formato estándar

```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

Acceder siempre con `response.data`.

### Equity — formato propio (sin wrapper)

| Endpoint | Estructura de respuesta |
|----------|------------------------|
| `POST /equity/close` | `{ data: { ...registro } }` |
| `GET /equity/history` | `{ data: [ ...registros ] }` |
| `GET /equity/current-capital` | `{ current_capital: number, source: string }` |

> `GET /equity/current-capital` devuelve el objeto directamente, sin clave `data`.

---

## 6. Endpoints eliminados (ya no existen)

Los siguientes endpoints fueron removidos del sistema. Si el frontend los usa, debe migrar:

| Endpoint eliminado | Reemplazar con |
|--------------------|----------------|
| `GET /finances/working-capital` | `GET /equity/current-capital` |
| `GET /finances/capital-config` | `GET /equity/current-capital` |
| `PUT /finances/capital-config` | `POST /equity/close` |

---

## 7. Tipos de datos importantes

### Registro de Equity

```ts
interface EquityRecord {
  id: number;
  period_year: number;
  period_month: number;          // 1-12
  initial_capital: string;       // viene como string desde la BD
  inventory_net: string;
  cash_in_boxes: string;
  total_expenses: string;
  final_capital: string;
  notes: string | null;
  closed_by: number;
  created_at: string;            // ISO 8601
  variation_absolute: string | null;   // null en el primer registro
  variation_percentage: string | null; // null en el primer registro
}
```

> Los campos numéricos del equity vienen como `string` desde PostgreSQL. Parsear con `parseFloat()` antes de operar.

### Capital actual

```ts
interface CurrentCapital {
  current_capital: number;
  source: "equity" | "environment";
}
```

### Gasto (Expense)

```ts
interface Expense {
  id: number;
  cashbox_id: number;
  category: "flowers" | "services" | "transport" | "salaries" | "utilities" | "supplies" | "other";
  description: string;
  amount: number;
  payment_method: "cash" | "transfer" | "card" | "yape" | "plin" | null;
  receipt_number: string | null;
  notes: string | null;
  user_id: number;
  user_first_name: string;
  user_last_name: string;
  created_at: string;
  deleted_at: string | null;
}
```

---

## 8. Reglas de negocio clave

1. **Un solo cierre por período** — Si se intenta cerrar un mes ya cerrado, el servidor devuelve `409 Conflict`.
2. **El capital se encadena** — El `final_capital` de enero es el `initial_capital` de febrero. No se puede modificar un cierre pasado.
3. **Sin historial = usa .env** — Si no hay ningún cierre registrado, `source` será `"environment"` y el capital viene de la variable `INITIAL_CAPITAL`.
4. **Los gastos afectan el flujo de caja** — Al crear un gasto, se descuenta automáticamente del `cash_flow` de la sesión de caja activa. Al eliminar un gasto, se revierte.
5. **El inventario es en tiempo real** — `inventory_value` se calcula al momento de la consulta desde `products.stock_cached × cost_price`. No es un valor histórico.
6. **Las mermas reducen el inventario neto** — `inventory_net = inventory_value - waste_value`. Las mermas se toman de los movimientos de stock con `type = 'waste'` del período.
