# Pending Issues — API BFF

Bugs y decisiones técnicas pendientes identificados durante la revisión lógica del módulo Equity.
Los issues críticos ya fueron corregidos. Los siguientes requieren decisión o trabajo adicional.

---

## ISSUE-001 — `getCashInBoxes` fallback silencioso de 30 días

**Severidad:** Media  
**Archivo:** `apps/api-bff/src/modules/finances/models/financeModel.js`  
**Función:** `getCashInBoxes(filters)`  
**Estado:** Pendiente decisión

### Descripción
Cuando se llama sin `start_date`, la función aplica un filtro silencioso de los últimos 30 días:

```js
} else {
  dateFilter += ` AND opened_at >= NOW() - INTERVAL '30 days'`;
}
```

Para el cierre de equity esto no es un problema porque `equityService` siempre pasa fechas del período. El problema afecta al endpoint público `GET /finances/cash-in-boxes` cuando se llama sin parámetros — devuelve solo las cajas de los últimos 30 días en lugar de todo el historial.

### Decisión requerida
**Opción A:** Eliminar el fallback. Sin fechas → devuelve todo el historial.  
**Opción B:** Mantener el fallback de 30 días como comportamiento por defecto del endpoint público (más performante, evita queries pesadas).  
**Opción C:** Documentar el comportamiento actual como intencional y agregar un query param `all=true` para obtener el historial completo.

### Fix si se elige Opción A
```js
// Eliminar el bloque else:
if (filters.start_date) {
  dateFilter += ` AND opened_at >= $${paramCount}`;
  params.push(filters.start_date);
  paramCount++;
}
// (sin else)
```

---

## ISSUE-002 — `getWasteValue` usa operadores exclusivos (`>` y `<`) en lugar de inclusivos

**Severidad:** Media  
**Archivo:** `apps/api-bff/src/modules/finances/models/financeModel.js`  
**Función:** `getWasteValue(filters)`  
**Estado:** Pendiente corrección

### Descripción
La función suma un día a ambas fechas y usa `>` y `<` en lugar de `>=` y `<=`:

```js
if (filters.start_date && filters.end_date) {
  dateFilter += ` AND sm.created_at > ${paramCount}`;
  const startDateObj = this.parseDate(filters.start_date);
  startDateObj.setDate(startDateObj.getDate() + 1);  // suma 1 día al inicio
  params.push(startDateObj.toISOString().split('T')[0]);
  paramCount++;
  dateFilter += ` AND sm.created_at < ${paramCount}`;
  const endDateObj = this.parseDate(filters.end_date);
  endDateObj.setDate(endDateObj.getDate() + 1);       // suma 1 día al fin
  params.push(endDateObj.toISOString().split('T')[0]);
}
```

Para el período `2024-01-01` a `2024-01-31`, la query real filtra:
```sql
sm.created_at > '2024-01-02' AND sm.created_at < '2024-02-01'
```
El día 1 de enero queda **excluido**. Inconsistente con `getTotalExpenses` que usa `>=` y `<=` directamente.

### Impacto en equity
El `inventory_net` puede estar ligeramente subestimado si hay mermas registradas el primer día del período de cierre.

### Fix recomendado
```js
if (filters.start_date && filters.end_date) {
  dateFilter += ` AND sm.created_at >= $${paramCount}`;
  params.push(filters.start_date);
  paramCount++;
  dateFilter += ` AND sm.created_at < $${paramCount}`;
  // Sumar 1 día al end_date para incluir todo el día final (hasta las 23:59:59)
  const endDateObj = this.parseDate(filters.end_date);
  endDateObj.setDate(endDateObj.getDate() + 1);
  params.push(endDateObj.toISOString().split('T')[0]);
  paramCount++;
} else if (filters.start_date) {
  dateFilter += ` AND sm.created_at >= $${paramCount}`;
  params.push(filters.start_date);
  paramCount++;
} else if (filters.end_date) {
  dateFilter += ` AND sm.created_at < $${paramCount}`;
  const endDateObj = this.parseDate(filters.end_date);
  endDateObj.setDate(endDateObj.getDate() + 1);
  params.push(endDateObj.toISOString().split('T')[0]);
  paramCount++;
}
```

> **Nota:** El patrón de sumar 1 día al `end_date` y usar `<` es correcto para incluir todo el día final cuando `created_at` tiene componente de hora. El problema es solo con el `start_date` que también suma 1 día innecesariamente.

---

## ISSUE-003 — `getHistory` con `LIMIT` puede devolver variaciones incorrectas

**Severidad:** Media  
**Archivo:** `apps/api-bff/src/modules/equity/models/equityModel.js`  
**Función:** `getHistory(limit)`  
**Estado:** Pendiente corrección

### Descripción
La query usa window functions (`LAG`) para calcular `variation_absolute` y `variation_percentage`. Cuando se aplica `LIMIT`, PostgreSQL puede ejecutar el `LIMIT` antes de que la window function tenga acceso a todos los registros anteriores, haciendo que el primer registro del resultado siempre tenga `variation_absolute = null`.

```js
const baseQuery = `
  SELECT *,
    final_capital - LAG(final_capital) OVER (ORDER BY period_year ASC, period_month ASC) AS variation_absolute,
    ...
  FROM equity
  ORDER BY period_year ASC, period_month ASC
`;

// El LIMIT se agrega al final de la query con window functions
const result = await db.query(`${baseQuery} LIMIT $1`, [limit]);
```

**Ejemplo del problema:** Con 12 meses de historial y `limit=3`, se devuelven los 3 primeros meses. El mes 1 siempre tendrá `variation_absolute = null` (correcto), pero si se quisieran los 3 últimos meses, el primero de esos 3 también tendría `null` aunque debería tener la variación respecto al mes anterior.

Actualmente el historial se ordena ASC (más antiguo primero), por lo que `limit=3` devuelve los 3 más antiguos. Esto es consistente pero puede no ser lo que el frontend espera (normalmente se quieren los más recientes).

### Decisión requerida
**Opción A:** Cambiar el orden a DESC (más reciente primero) y usar una subquery para que las variaciones se calculen correctamente:
```sql
SELECT * FROM (
  SELECT *,
    final_capital - LAG(final_capital) OVER (ORDER BY period_year ASC, period_month ASC) AS variation_absolute,
    ROUND(
      ((final_capital - LAG(final_capital) OVER (ORDER BY period_year ASC, period_month ASC))
      / NULLIF(LAG(final_capital) OVER (ORDER BY period_year ASC, period_month ASC), 0)) * 100, 2
    ) AS variation_percentage
  FROM equity
) sub
ORDER BY period_year DESC, period_month DESC
LIMIT $1
```

**Opción B:** Mantener el comportamiento actual (ASC, primeros N registros) y documentarlo.

### Fix si se elige Opción A
Reemplazar el método `getHistory` en `equityModel.js`:
```js
async getHistory(limit) {
  const baseQuery = `
    SELECT * FROM (
      SELECT
        *,
        final_capital - LAG(final_capital) OVER (ORDER BY period_year ASC, period_month ASC) AS variation_absolute,
        ROUND(
          (
            (final_capital - LAG(final_capital) OVER (ORDER BY period_year ASC, period_month ASC))
            / NULLIF(LAG(final_capital) OVER (ORDER BY period_year ASC, period_month ASC), 0)
          ) * 100,
          2
        ) AS variation_percentage
      FROM equity
    ) sub
    ORDER BY period_year DESC, period_month DESC
  `;

  if (limit !== undefined && limit !== null) {
    const result = await db.query(`${baseQuery} LIMIT $1`, [limit]);
    return result.rows;
  }

  const result = await db.query(baseQuery);
  return result.rows;
}
```

---

## ISSUE-004 — `closeMonth` no valida que el período no sea futuro

**Severidad:** Baja  
**Archivo:** `apps/api-bff/src/modules/equity/controllers/equityController.js`  
**Función:** `closeMonth`  
**Estado:** Pendiente decisión

### Descripción
No hay validación de que el año/mes enviado sea ≤ al mes actual. Se puede cerrar un período futuro (ej: diciembre 2030).

```js
// Validación actual — solo verifica rango básico
if (month < 1 || month > 12) { ... }
if (year < 2020) { ... }
// No verifica que year/month <= fecha actual
```

### Impacto
Bajo. Solo un admin puede hacerlo. Si se cierra un período futuro, los datos financieros estarán vacíos (gastos=0, mermas=0, cajas=0), resultando en `final_capital = initial_capital`. No corrompe datos existentes pero crea un registro inútil que bloquea el cierre real cuando llegue ese mes.

### Fix recomendado
Agregar en el controller, después de parsear `year` y `month`:
```js
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1; // getMonth() es 0-indexed

if (year > currentYear || (year === currentYear && month > currentMonth)) {
  return res.status(400).json({ 
    error: 'No se puede cerrar un período futuro' 
  });
}
```

---

## ISSUE-005 — Errores internos devuelven 500 genérico sin detalle

**Severidad:** Baja  
**Archivo:** `apps/api-bff/src/modules/equity/controllers/equityController.js`  
**Función:** `closeMonth`, `getHistory`, `getCurrentCapital`  
**Estado:** Pendiente mejora

### Descripción
Cualquier error que no sea 409 devuelve un mensaje genérico que oculta la causa real:

```js
} catch (err) {
  if (err.statusCode === 409) {
    return res.status(409).json({ error: err.message });
  }
  return res.status(500).json({ error: 'Error interno del servidor' }); // oculta todo
}
```

Errores de BD, errores de validación del service, o errores de red al obtener datos financieros son todos indistinguibles desde el cliente.

### Fix recomendado
En desarrollo, loggear el error completo. En producción, al menos incluir un código de error para correlación:

```js
} catch (err) {
  console.error('[equity/closeMonth] Error:', err);
  
  if (err.statusCode === 409) {
    return res.status(409).json({ error: err.message });
  }
  
  // En desarrollo, exponer el mensaje
  if (process.env.NODE_ENV === 'development') {
    return res.status(500).json({ error: err.message });
  }
  
  return res.status(500).json({ error: 'Error interno del servidor' });
}
```

---

## Resumen

| ID | Severidad | Archivo | Descripción | Acción |
|----|-----------|---------|-------------|--------|
| ISSUE-001 | 🟡 Media | `financeModel.js` | `getCashInBoxes` fallback 30 días | Decisión A/B/C |
| ISSUE-002 | 🟡 Media | `financeModel.js` | `getWasteValue` excluye primer día del período | Corregir |
| ISSUE-003 | 🟡 Media | `equityModel.js` | `getHistory` con LIMIT puede dar variaciones null | Decisión A/B |
| ISSUE-004 | 🟢 Baja | `equityController.js` | No valida períodos futuros | Corregir |
| ISSUE-005 | 🟢 Baja | `equityController.js` | Error 500 genérico oculta causa real | Mejorar |

### Issues ya corregidos (referencia)
| ID | Descripción |
|----|-------------|
| ~~BUG-1~~ | `getWasteValue` usaba `movement_type_id = 3` hardcodeado → corregido con JOIN por `code = 'waste'` |
| ~~BUG-2~~ | `getTotalExpenses` fallback silencioso de 30 días → eliminado el `else` |
