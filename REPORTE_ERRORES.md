# Reporte de Errores y Código No Utilizado — api-bff

---

## 🔴 ERRORES CRÍTICOS (bugs reales)

### 1. `financeModel.js` — Mismatch de campos en `create()`
**Archivo:** `src/modules/finances/models/financeModel.js` ~línea 103

El modelo desestructura `created_by` del objeto expense, pero el service pasa `user_id`. El campo `user_id` en el INSERT siempre será `undefined`.

```js
// Model espera:
const { cashbox_id, category, description, amount, created_by } = expense;

// Service envía:
{ cashbox_id, description, amount, category, date, payment_method, receipt_number, notes, user_id }
```
**Impacto:** Todos los gastos se crean sin `user_id` en la base de datos.

**Fix:**
```js
const { cashbox_id, category, description, amount, user_id } = expense;
// y en el INSERT usar user_id en lugar de created_by
```

---

### 2. `financeModel.js` — Parámetros SQL mal formados en `findAll()`
**Archivo:** `src/modules/finances/models/financeModel.js` ~líneas 55-65

Los placeholders de PostgreSQL están escritos como `${paramCount}` (template literal JS) en lugar de `$${paramCount}` (placeholder SQL). Esto genera queries inválidas.

```js
// MAL — genera: AND e.created_at > 1  (literal, no placeholder)
query += ` AND e.created_at > ${paramCount}`;

// BIEN
query += ` AND e.created_at > $${paramCount}`;
```
**Impacto:** Los filtros de fecha en gastos no funcionan correctamente.

---

### 3. `cashboxService.js` — `getSummary()` usa placeholders SQL incorrectos
**Archivo:** `src/modules/cashbox/services/cashboxService.js` ~líneas 290-295

Mismo problema: `${paramCount}` en lugar de `$${paramCount}` en la query de resumen de caja.

---

### 4. `financeController.js` — Error 400 devuelve `successResponse`
**Archivo:** `src/modules/finances/controllers/financeController.js` ~línea 209

```js
// MAL — usa successResponse para un error de validación
if (initial_capital === undefined) {
  return res.status(400).json(successResponse(null, 'initial_capital is required'));
}
```
Debería lanzar un `AppError` o usar una respuesta de error consistente. El cliente recibe status 400 pero con estructura de éxito.

---

### 5. `inventoryService.js` — Lógica de tipo `OUT` mapea a `waste`
**Archivo:** `src/modules/inventory/services/inventoryService.js` ~línea 90

```js
} else if (movementTypeUpper === 'OUT') {
  typeCode = 'waste';  // ← OUT y WASTE son tratados igual
}
```
Un movimiento `OUT` por venta se registra como `waste` en la base de datos. Debería mapearse a `sale` o `consumption`.

---

## 🟡 CÓDIGO NO UTILIZADO / DEAD CODE

### 6. `cashboxService.js` — Import `salesModel` nunca usado
```js
const salesModel = require('../../sales/models/salesModel'); // nunca se usa
```

### 7. `cashboxService.js` — `description` desestructurado pero nunca usado
En `addIncome()` y `addExpense()`:
```js
const { amount, description, reference_table, reference_id } = incomeData; // description ignorado
```

### 8. `employeeModel.js` — `hire_date` desestructurado pero nunca usado
```js
const { first_name, last_name, email, phone, role, password, hire_date } = employee; // hire_date ignorado
```

### 9. `employeeModel.js` — `result` de `db.query` en `update()` nunca usado
```js
const result = await db.query(`UPDATE users SET ...`); // result nunca se lee
```

### 10. `schemas.js` — `dateSchema` declarado pero nunca exportado ni usado
```js
const dateSchema = Joi.date().iso(); // declarado, no se usa en ningún schema
```

### 11. `salesService.js` — `getDetailedSale()` duplica `getSaleById()`
`getDetailedSale()` hace exactamente lo mismo que `getSaleById()` pero llama a `getSaleItems()` en lugar de `salesModel.findItemsBySaleId()`. Son métodos redundantes.

---

## 🟠 CONSOLE.LOG DE DEBUG EN PRODUCCIÓN

Estos logs deben eliminarse antes de producción:

| Archivo | Descripción |
|---|---|
| `auditService.js` líneas 48-49 | `[AUDIT SERVICE DEBUG]` en `createLog()` |
| `auditMiddleware.js` múltiples líneas | `[AUDIT DEBUG]` en todo el middleware |
| `employeeModel.js` líneas 22, 44, 57, 68, 73, 76 | `[DEBUG employeeModel.findAll]` incluyendo query raw de todos los usuarios |
| `employeeModel.js` línea 22 | Hace un `SELECT * FROM users` extra en cada llamada a `findAll()` — innecesario y costoso |

---

## 🔵 INCONSISTENCIAS DE PATRÓN

### 12. `require()` condicional dentro de métodos
En `salesService.js` y `inventoryService.js` se hace `require()` dentro de funciones para evitar dependencias circulares, pero sin comentario que lo explique:

```js
// salesService.js — dentro de validateStock()
const recipeService = require('../../recipes/services/recipeService');

// inventoryService.js — dentro de createMovement()
const alertModel = require('../../alerts/models/alertModel');
```
Está bien como solución a dependencias circulares, pero debería documentarse.

### 13. `cashboxService.js` — `db` requerido dentro de métodos
`addIncome()`, `addExpense()`, `getSummary()`, `getTodaySessions()` hacen `require('../../../config/database')` internamente. Debería estar al top del archivo como el resto de dependencias.

### 14. `reportService.js` — `raw_sales` y `raw_expenses` asumidos pero no garantizados
```js
const analytics = await this._callAnalytics('profitability', {
  sales: dbData.raw_sales || [],    // raw_sales existe en el modelo, OK
  expenses: dbData.raw_expenses || [] // raw_expenses también existe, OK
});
```
Esto funciona, pero el campo `ai_insights` en la respuesta puede ser `null` sin que el cliente lo sepa. No está documentado en la respuesta.

---

## 📊 EVALUACIÓN: ¿Puedes prescindir de analytics-engine?

**Respuesta corta: Sí, sin impacto funcional real.**

### Lo que analytics-engine hace actualmente:
| Endpoint | Usado en api-bff | Valor real |
|---|---|---|
| `/api/profitability` | Sí, en `reportService.getProfitabilityByPeriod()` | Duplica cálculos que ya hace `reportModel` |
| `/api/forecast` | Sí, en `reportService.getDemandForecast()` | Usa moving average simple + `random.uniform` (datos aleatorios) |
| `/api/inventory-valuation` | **No** — nunca llamado | — |
| `/api/recommendations` | **No** — nunca llamado | — |
| `/api/dashboard-insights` | **No** — nunca llamado | — |

### Problemas del analytics-engine:
1. El forecast usa `random.uniform(-5, 5)` — los datos son parcialmente aleatorios, no confiables.
2. La rentabilidad que calcula es redundante: `reportModel.getProfitabilityByPeriod()` ya calcula revenue, expenses, profit y profit_margin directamente desde la DB.
3. Si el servicio no está disponible, `_callAnalytics()` retorna `null` y la app sigue funcionando igual — lo que confirma que no es esencial.
4. Agrega una dependencia de despliegue (Python + Flask + pandas + numpy) para funcionalidad que ya existe en Node.

### Recomendación:
Elimina analytics-engine del despliegue. En `reportService.js` simplifica así:

```js
// Eliminar _callAnalytics() y su llamada
async getProfitabilityByPeriod(filters) {
  // ... validación de fechas ...
  return await reportModel.getProfitabilityByPeriod(filters); // sin ai_insights
}

async getDemandForecast(filters) {
  // Retornar directamente el historial de ventas como "forecast básico"
  const salesHistory = await reportModel.getSalesHistory(filters);
  return { sales_history: salesHistory, message: 'Historical data' };
}
```

Y elimina de `config/index.js` el bloque `analytics: { ... }`.

---

## Resumen de prioridades

| Prioridad | Item | Archivo |
|---|---|---|
| 🔴 Fix inmediato | `created_by` vs `user_id` en financeModel | `financeModel.js` |
| 🔴 Fix inmediato | Placeholders SQL `${n}` vs `$${n}` | `financeModel.js`, `cashboxService.js` |
| 🔴 Fix inmediato | OUT mapea a `waste` en inventario | `inventoryService.js` |
| 🟡 Limpiar | `salesModel` import no usado | `cashboxService.js` |
| 🟡 Limpiar | `hire_date`, `result` no usados | `employeeModel.js` |
| 🟡 Limpiar | `dateSchema` no usado | `schemas.js` |
| 🟠 Limpiar | Todos los `console.log` de debug | `auditService`, `auditMiddleware`, `employeeModel` |
| 🟠 Limpiar | Query extra de todos los usuarios en `findAll` | `employeeModel.js` |
| 🔵 Decisión | Eliminar analytics-engine | `analytics-engine/`, `reportService.js`, `config/index.js` |
