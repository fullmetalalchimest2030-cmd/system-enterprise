# Revisión de Lógica de Negocio — Dinero y Capital

Revisión completa del flujo de dinero a través de todos los módulos:
Ventas → Caja → Gastos → Capital de Trabajo → Equity.

---

## 1. Mapa del flujo de dinero

```
VENTA (sale)
  ├── Descuenta stock de productos/ingredientes
  ├── Crea registro en payments (sale_id, cashbox_id, payment_method_id, amount)
  └── Si cashbox_id existe → crea cash_flow (type: sale_income, amount: +total)

GASTO (expense)
  ├── Crea registro en expenses (cashbox_id, amount, category)
  └── Si cashbox_id existe → crea cash_flow (type: expense, amount: -amount)

INGRESO MANUAL (cashbox income)
  └── Crea cash_flow (type: income, amount: +amount)

GASTO MANUAL (cashbox expense)
  └── Crea cash_flow (type: expense, amount: -amount)

CIERRE DE CAJA
  ├── Lee cash_flow filtrando solo efectivo físico:
  │     sale_income WHERE payment_method = 'cash'
  │     + income
  │     + opening
  │     - expense
  ├── expected_amount = opening_amount + totalFlow
  └── difference = closing_amount - expected_amount

CIERRE DE EQUITY (mensual)
  ├── initial_capital = final_capital del período anterior
  ├── inventory_net = getInventoryValue() - getWasteValue(período)
  ├── cash_in_boxes = suma de closing_amount (cerradas) + balance real (abiertas)
  ├── total_expenses = suma de expenses del período
  └── final_capital = initial_capital + inventory_net + cash_in_boxes - total_expenses
```

---

## 2. Problemas encontrados

---

### BUG-M01 — CRÍTICO: Ventas sin `cashbox_id` no registran cash_flow

**Archivo:** `salesModel.js` → `createWithItems()`

**Código problemático:**
```js
// Create payment record
if (payment_method_id) {
  const paymentResult = await client.query(`INSERT INTO payments ...`);

  // Register cash flow entry so the cashbox tracks this income
  if (cashbox_id && paymentResult.rows[0]) {   // ← cashbox_id puede ser null
    // ... inserta cash_flow
  }
}
```

**Problema:** Si se crea una venta sin `cashbox_id` (campo opcional en el request), el pago se registra en `payments` pero **nunca se registra en `cash_flow`**. Esa venta queda invisible para la caja.

**Impacto en capital:**
- `getCashInBoxes()` suma `cash_flow` de cajas abiertas. Si la venta no tiene `cash_flow`, el dinero no aparece en el balance de la caja.
- El cierre de equity subestima `cash_in_boxes`.
- El `expected_amount` al cerrar la caja no incluye esa venta.

**Impacto en operación:** Una venta en efectivo sin `cashbox_id` hace que el cajero cuente más dinero del que el sistema espera → diferencia positiva inexplicable al cierre.

**Fix recomendado:** Hacer `cashbox_id` obligatorio en el service, o al menos loggear una advertencia clara cuando se crea una venta sin caja:
```js
// En salesService.createSale():
if (!cashbox_id) {
  console.warn(`[WARN] Sale created without cashbox_id by user ${user_id}. Cash flow will not be tracked.`);
}
```
O mejor, validar que exista una caja abierta para el usuario antes de crear la venta.

---

### BUG-M02 — CRÍTICO: Cancelación de venta no revierte el gasto si fue registrado como `expense`

**Archivo:** `salesModel.js` → `cancelWithStockRestoration()`

**Código:**
```js
// 4. Reverse cash_flow entries for this sale's payments
const paymentsResult = await client.query(
  `SELECT id FROM payments WHERE sale_id = $1`, [saleId]
);
for (const payment of paymentsResult.rows) {
  await client.query(
    `DELETE FROM cash_flow WHERE reference_table = 'payments' AND reference_id = $1`,
    [payment.id]
  );
}
```

**Problema:** La cancelación solo revierte los `cash_flow` con `reference_table = 'payments'`. Si la venta generó algún flujo adicional (ej: un gasto asociado manualmente a esa venta), ese flujo **no se revierte**.

Más importante: si el `payment_method_id` era `null` al crear la venta (venta sin método de pago), no se creó ningún registro en `payments`, por lo que no hay nada que revertir en `cash_flow` — pero el stock sí se restaura. Esto crea una asimetría: el stock vuelve pero el dinero nunca se había registrado.

**Impacto:** Bajo en el caso normal (ventas con pago registrado). Alto si hay ventas sin `payment_method_id`.

---

### BUG-M03 — CRÍTICO: `expense` actualiza `cash_flow` pero `update` de expense NO

**Archivo:** `financeModel.js` → `update()`

**Código:**
```js
async update(id, expense) {
  const { category, description, amount } = expense;
  
  const result = await db.query(`
    UPDATE expenses 
    SET category = COALESCE($1, category),
        description = COALESCE($2, description),
        amount = COALESCE($3, amount)   // ← actualiza el monto
    WHERE id = $4 AND deleted_at IS NULL
    RETURNING *
  `, [category, description, amount, id]);
  
  return result.rows[0];
}
```

**Problema:** Cuando se actualiza el `amount` de un gasto, la tabla `expenses` se actualiza correctamente, pero el registro correspondiente en `cash_flow` **no se actualiza**. El `cash_flow` sigue teniendo el monto original.

**Impacto:**
- El balance de la caja (`getStatus`, `calculateExpectedCash`) usa `cash_flow` → muestra el monto viejo.
- El cierre de caja calcula `expected_amount` con el monto viejo.
- `getCashInBoxes()` para cajas abiertas también usa `cash_flow` → equity incorrecto.
- Solo `getTotalExpenses()` usa la tabla `expenses` directamente → ese sí refleja el monto nuevo.

**Resultado:** Inconsistencia entre el balance de caja (usa `cash_flow`) y el reporte de gastos (usa `expenses`).

**Fix recomendado:**
```js
async update(id, expense) {
  const { category, description, amount } = expense;
  
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const result = await client.query(`
      UPDATE expenses 
      SET category = COALESCE($1, category),
          description = COALESCE($2, description),
          amount = COALESCE($3, amount)
      WHERE id = $4 AND deleted_at IS NULL
      RETURNING *
    `, [category, description, amount, id]);
    
    // Si se actualizó el monto, sincronizar cash_flow
    if (amount !== undefined && result.rows[0]) {
      await client.query(`
        UPDATE cash_flow 
        SET amount = $1
        WHERE reference_table = 'expenses' AND reference_id = $2
      `, [-Math.abs(amount), id]);
    }
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

---

### BUG-M04 — ALTO: `getCashInBoxes` suma `opening_amount` de cajas abiertas pero `cash_flow` ya incluye el opening

**Archivo:** `financeModel.js` → `getCashInBoxes()`

**Código:**
```js
// Open sessions: calculate real-time balance from cash_flow
const openResult = await db.query(`
  SELECT cb.id, cb.opening_amount, COALESCE(SUM(cf.amount), 0) as flow_total
  FROM cashboxes cb
  LEFT JOIN cash_flow cf ON cf.cashbox_id = cb.id
  WHERE cb.status = 'open'${dateFilter}
  GROUP BY cb.id, cb.opening_amount
`, params);

const openTotal = openResult.rows.reduce((sum, row) => {
  return sum + parseFloat(row.opening_amount) + parseFloat(row.flow_total);
  //           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //           suma opening_amount + todo el cash_flow
}, 0);
```

**Problema potencial:** Si existe un `cash_flow` de tipo `opening` que registra el monto de apertura, entonces `opening_amount` se estaría contando dos veces: una desde `cashboxes.opening_amount` y otra desde `cash_flow`.

**Verificación necesaria:** Revisar si al abrir una caja se inserta un registro en `cash_flow` con `flow_type = 'opening'`. Si sí existe ese registro, el balance de cajas abiertas está inflado.

**Dónde verificar:** En `cashboxService.addCashFlow()` y en el flujo de apertura de caja — actualmente `cashboxModel.create()` solo hace `INSERT INTO cashboxes` sin insertar en `cash_flow`. Pero el filtro en `getStatus()` incluye `flow_type_code === 'opening'` en el cálculo, lo que sugiere que ese tipo existe en la BD.

**Impacto en equity:** Si `opening` se registra en `cash_flow`, `getCashInBoxes()` infla el capital calculado.

---

### BUG-M05 — ALTO: `getStatus` y `calculateExpectedCash` tienen lógica de filtrado diferente

**Archivo:** `cashboxService.js`

**`getStatus()`:**
```js
const totalIncome = cashFlow
  .filter(flow => 
    (flow.flow_type_code === 'sale_income' && flow.payment_method_code === 'cash') || 
    (flow.flow_type_code === 'income' || flow.flow_type_code === 'opening')
  )
  .reduce((sum, flow) => sum + parseFloat(flow.amount), 0);
```

**`calculateExpectedCash()`:**
```js
const totalIncome = cashFlow
  .filter(flow => 
    (flow.flow_type_code === 'sale_income' && flow.payment_method_code === 'cash') || 
    (flow.flow_type_code === 'income' || flow.flow_type_code === 'opening')
  )
  .reduce((sum, flow) => sum + parseFloat(flow.amount), 0);
```

Estos dos son idénticos — bien. Pero el problema es que **`cashboxModel.close()`** usa una query SQL diferente:

```sql
-- En cashboxModel.close():
WHERE cf.cashbox_id = $1 
AND (
  (cft.code = 'sale_income' AND pm.code = 'cash') OR 
  (cft.code IN ('income', 'expense', 'opening'))
)
```

**Diferencia:** El cierre de caja incluye `expense` en el filtro SQL (para restarlos), mientras que `getStatus` y `calculateExpectedCash` los filtran por separado. Esto es correcto en concepto pero la implementación es inconsistente — si se agrega un nuevo tipo de flujo, hay que actualizarlo en 3 lugares distintos.

**Riesgo:** Si alguien agrega un nuevo `flow_type` (ej: `refund`), el cierre de caja lo ignorará pero `getStatus` tampoco lo incluirá, creando una diferencia permanente entre el balance en tiempo real y el `expected_amount` al cierre.

---

### BUG-M06 — ALTO: `profit_margin` en reportes usa precio de venta actual, no el precio al momento de la venta

**Archivo:** `reportModel.js` → `getProductPerformance()`

**Código:**
```js
const costPrice = parseFloat(row.cost_price) || 0;   // precio ACTUAL del producto
const sellPrice = parseFloat(row.sell_price) || 0;   // precio ACTUAL del producto

let profitMargin = 0;
if (costPrice > 0 && sellPrice > 0) {
  profitMargin = ((sellPrice - costPrice) / sellPrice) * 100;
}
```

**Problema:** El margen de ganancia se calcula con los precios **actuales** del producto, no con los precios al momento de cada venta (`unit_price_at_sale`, `unit_cost_at_sale` que sí están en `sale_items`).

Si el precio de un producto cambió durante el período analizado, el margen reportado es incorrecto.

**Fix recomendado:** Calcular el margen real usando los datos de `sale_items`:
```sql
-- En lugar de usar p.cost_price y p.sell_price:
COALESCE(AVG(si.unit_price_at_sale - si.unit_cost_at_sale) / NULLIF(AVG(si.unit_price_at_sale), 0) * 100, 0) as profit_margin
```

---

### BUG-M07 — MEDIO: `getProfitabilityByPeriod` mezcla ventas y gastos con filtros de fecha inconsistentes

**Archivo:** `reportModel.js` → `getProfitabilityByPeriod()`

**Código:**
```js
// Total expenses — reemplaza s.created_at por e.created_at con string replace
const expensesResult = await db.query(
  `SELECT COALESCE(SUM(e.amount), 0) as total_expenses
   FROM expenses e
   WHERE e.deleted_at IS NULL${dateFilter.replace(/s\.created_at/g, 'e.created_at')}`,
  params
);
```

**Problema:** El filtro de fecha para gastos se construye haciendo un `.replace()` sobre el string del filtro de ventas. Esto es frágil — si el alias de la tabla cambia o el filtro tiene otro formato, el replace falla silenciosamente y los gastos se calculan sin filtro de fecha (devuelve todos los gastos históricos).

**Impacto:** El `profit` del reporte puede estar subestimado si hay gastos fuera del período que se incluyen por error.

**Fix recomendado:** Construir el filtro de gastos de forma independiente, no derivarlo del filtro de ventas.

---

### BUG-M08 — MEDIO: `getWorkingCapital` mezcla datos con y sin filtro de fecha

**Archivo:** `financeModel.js` → `getWorkingCapital()`

**Código:**
```js
const [inventoryValue, wasteValue, cashInBoxes, totalExpenses] = await Promise.all([
  this.getInventoryValue(),              // ← SIN filtro de fecha (siempre el inventario actual)
  this.getWasteValue(filters),           // ← CON filtro de fecha
  this.getCashInBoxes(filters),          // ← CON filtro de fecha
  this.getTotalExpenses(filters),        // ← CON filtro de fecha
]);
```

**Problema:** `getInventoryValue()` siempre devuelve el valor del inventario **actual** (en tiempo real), independientemente del período solicitado. Los otros tres componentes sí respetan el filtro de fecha.

**Impacto:** Si se consulta el capital de trabajo de un período pasado (ej: enero), el inventario que se usa es el de hoy, no el de enero. El resultado es una mezcla de datos históricos y actuales que no representa ningún momento real.

**Nota:** Este mismo problema existe en `equityService.closeMonth()` — el `inventoryValue` siempre es el actual al momento del cierre, no el del período. Esto es **intencional por diseño** (el cierre captura el estado actual del inventario), pero debería estar documentado explícitamente.

---

### BUG-M09 — MEDIO: `cancelWithStockRestoration` no revierte recetas (solo productos directos)

**Archivo:** `salesModel.js` → `cancelWithStockRestoration()`

**Código:**
```js
for (const item of items) {
  if (item.product_id) {
    // Restaura stock del producto
    await client.query(`INSERT INTO stock_movements ...`);
    await client.query(`UPDATE products SET stock_cached = stock_cached + $1 ...`);
  }
  // ← No hay else if (item.recipe_id) { ... }
}
```

**Problema:** Al cancelar una venta que contenía recetas (`recipe_id`), el stock de los ingredientes de la receta **no se restaura**. Solo se restaura el stock de productos directos (`product_id`).

Al crear la venta, `createWithItems()` sí descuenta los ingredientes de la receta:
```js
} else if (item.recipe_id) {
  // Deduct stock for each ingredient in the recipe
  const ingredientsResult = await client.query(
    `SELECT product_id, quantity FROM recipe_items WHERE recipe_id = $1 AND deleted_at IS NULL`,
    [item.recipe_id]
  );
  for (const ing of ingredientsResult.rows) { ... }
}
```

Pero la cancelación no tiene el equivalente inverso.

**Impacto:** Cada vez que se cancela una venta con recetas, el stock de los ingredientes queda permanentemente reducido. Con el tiempo, el inventario se desincroniza de la realidad.

**Fix recomendado:** Agregar en `cancelWithStockRestoration()`:
```js
for (const item of items) {
  if (item.product_id) {
    // ... código existente de restauración de producto
  } else if (item.recipe_id) {
    // Restaurar stock de ingredientes de la receta
    const ingredientsResult = await client.query(
      `SELECT product_id, quantity FROM recipe_items WHERE recipe_id = $1 AND deleted_at IS NULL`,
      [item.recipe_id]
    );
    for (const ing of ingredientsResult.rows) {
      const totalQuantity = ing.quantity * item.quantity;
      await client.query(`
        INSERT INTO stock_movements (product_id, movement_type_id, quantity, unit_cost, reference_table, reference_id, user_id, notes, created_at)
        VALUES ($1, $2, $3, $4, 'sales', $5, $6, $7, NOW())
      `, [ing.product_id, returnMovementTypeId, totalQuantity, 0, saleId, userId, 'Stock restored from cancelled sale (recipe ingredient)']);
      
      await client.query(
        'UPDATE products SET stock_cached = stock_cached + $1 WHERE id = $2',
        [totalQuantity, ing.product_id]
      );
    }
  }
}
```

---

### BUG-M10 — BAJO: `getBottomSellers` en dashboard no mide ventas reales

**Archivo:** `dashboardModel.js` → `getBottomSellers()`

**Código:**
```js
async getBottomSellers(limit = 5) {
  const result = await db.query(`
    SELECT p.id, p.name, p.sku, p.stock_cached, p.sell_price, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.deleted_at IS NULL
    ORDER BY p.stock_cached DESC   // ← ordena por stock, no por ventas
    LIMIT $1
  `, [limit]);
  return result.rows;
}
```

**Problema:** `getBottomSellers` devuelve los productos con **más stock**, no los que menos se venden. El nombre del método implica "peores vendedores" pero la implementación es "productos con más inventario acumulado".

**Impacto:** El widget de "peores vendedores" en el dashboard muestra información engañosa. Un producto nuevo con mucho stock inicial aparecerá como "mal vendedor" aunque se esté vendiendo bien.

**Fix recomendado:** Usar la misma lógica que `getTopSellers` pero ordenando ASC:
```sql
SELECT 
  p.id, p.name, p.sku, p.stock_cached, p.sell_price, c.name as category_name,
  COALESCE(SUM(si.quantity), 0) as units_sold,
  COALESCE(SUM(si.quantity * si.unit_price_at_sale), 0) as total_revenue
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN sale_items si ON p.id = si.product_id
LEFT JOIN sales s ON si.sale_id = s.id AND s.status = 'completed' 
  AND s.created_at >= CURRENT_DATE - INTERVAL '30 days'
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.sku, p.stock_cached, p.sell_price, c.name
ORDER BY units_sold ASC
LIMIT $1
```

---

### BUG-M11 — BAJO: `findAll` en múltiples modelos usa interpolación directa en lugar de `$N`

**Archivos:** `cashboxModel.js`, `salesModel.js`, `financeModel.js`, `reportModel.js`

**Código problemático (ejemplo en cashboxModel):**
```js
if (filters.status) {
  query += ` AND cb.status = ${paramCount}`;  // ← falta el $ antes de paramCount
  params.push(filters.status);
  paramCount++;
}
```

**Problema:** Los placeholders de PostgreSQL deben ser `$1`, `$2`, etc. El código escribe `${paramCount}` (que en un template literal produce `1`, `2`, etc.) en lugar de `$${paramCount}` (que produce `$1`, `$2`).

**Impacto:** Dependiendo de cómo Node.js/pg interprete esto, puede causar errores de SQL o, peor, inyección SQL si el valor del parámetro contiene caracteres especiales. En la práctica, si el código está funcionando actualmente, es posible que pg esté siendo tolerante con el formato, pero es un riesgo latente.

**Verificación:** Revisar si las queries con filtros están funcionando correctamente en producción. Si sí funcionan, puede ser que el template literal esté produciendo el string correcto de otra forma.

---

## 3. Resumen de issues

| ID | Severidad | Módulo | Descripción | Estado |
|----|-----------|--------|-------------|--------|
| BUG-M01 | 🔴 Crítico | Sales | Ventas sin cashbox_id no registran cash_flow | Pendiente |
| BUG-M02 | 🔴 Crítico | Sales | Cancelación no revierte cash_flow si no hay payment | Pendiente |
| BUG-M03 | 🔴 Crítico | Finances | `update` de expense no sincroniza cash_flow | ✅ Corregido |
| BUG-M04 | 🟠 Alto | Finances | Posible doble conteo de opening_amount en cajas abiertas | Verificar |
| BUG-M05 | 🟠 Alto | Cashbox | Lógica de filtrado de cash_flow duplicada en 3 lugares | Refactorizar |
| BUG-M06 | 🟠 Alto | Reports | profit_margin usa precios actuales, no los del momento de venta | Pendiente fix |
| BUG-M07 | 🟡 Medio | Reports | Filtro de fecha para gastos construido con string replace frágil | Pendiente fix |
| BUG-M08 | 🟡 Medio | Finances | getWorkingCapital mezcla inventario actual con datos históricos | Documentar/decidir |
| BUG-M09 | 🟡 Medio | Sales | Cancelación de venta con recetas no restaura stock de ingredientes | ✅ Corregido |
| BUG-M10 | 🟢 Bajo | Dashboard | getBottomSellers ordena por stock, no por ventas | ✅ Corregido |
| BUG-M11 | 🟢 Bajo | Múltiples | Placeholders SQL sin `$` en varios modelos | Verificar |

---

## 4. Prioridad de corrección

### Corregir primero (afectan datos financieros reales)
1. **BUG-M09** — Cancelación de recetas no restaura stock → pérdida silenciosa de inventario
2. **BUG-M03** — Update de expense no sincroniza cash_flow → balance de caja incorrecto
3. **BUG-M01** — Ventas sin caja no rastreadas → dinero invisible al sistema

### Verificar antes de producción
4. **BUG-M04** — Posible doble conteo de opening en cajas abiertas → equity inflado
5. **BUG-M11** — Placeholders SQL sin `$` → posible fallo silencioso en filtros

### Corregir en siguiente iteración
6. **BUG-M06** — Margen de ganancia con precios actuales → reportes históricos inexactos
7. **BUG-M07** — String replace frágil en filtros de fecha → riesgo de regresión
8. **BUG-M10** — Bottom sellers muestra stock alto, no ventas bajas → dashboard engañoso

### Decisión de diseño requerida
9. **BUG-M08** — Inventario siempre actual en working capital → documentar como intencional o corregir
10. **BUG-M05** — Lógica de cash_flow duplicada → refactorizar a función compartida
