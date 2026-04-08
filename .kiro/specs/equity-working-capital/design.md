# Diseño Técnico: Equity Working Capital

## Overview

El módulo **equity** agrega persistencia al cálculo de capital de trabajo existente. Actualmente `financeModel.getWorkingCapital()` usa `config.workingCapital.initialCapital` (variable de entorno) como capital inicial, lo que impide acumular el patrimonio mes a mes.

La solución introduce una tabla `equity` que almacena el estado patrimonial al cierre de cada mes. El `final_capital` de un período se convierte en el `initial_capital` del siguiente, creando una cadena de patrimonio acumulado. El módulo `finances` existente se modifica mínimamente para consultar el equity en lugar de leer directamente del `.env`.

### Flujo principal

```
Admin solicita cierre (year, month)
  → equityService.closeMonth()
    → Verifica que el período no esté ya cerrado
    → Obtiene initial_capital (equity anterior o .env fallback)
    → Calcula componentes del período via financeModel
    → INSERT INTO equity (transacción atómica)
    → Retorna el Equity_Record creado

Finance Module calcula Working Capital
  → equityModel.getCurrentCapital()
    → SELECT final_capital FROM equity ORDER BY period DESC LIMIT 1
    → Si null → usa config.workingCapital.initialCapital
```

---

## Architecture

El módulo sigue el patrón **Model/Service/Controller/Routes** ya establecido en el proyecto.

```
apps/api-bff/src/modules/equity/
  models/equityModel.js       ← Queries SQL directas a tabla equity
  services/equityService.js   ← Lógica de negocio y orquestación
  controllers/equityController.js ← Manejo HTTP, validación de entrada
  routes/equityRoutes.js      ← Definición de endpoints y middlewares
```

### Dependencias entre módulos

```
equityRoutes
  └── equityController
        └── equityService
              ├── equityModel        (queries equity table)
              └── financeModel       (getInventoryValue, getWasteValue, getCashInBoxes, getTotalExpenses)

financeModel (modificado)
  └── equityModel.getCurrentCapital()  (reemplaza config.workingCapital.initialCapital)
```

### Diagrama de secuencia — Cierre mensual

```mermaid
sequenceDiagram
    participant Admin
    participant equityController
    participant equityService
    participant equityModel
    participant financeModel
    participant DB

    Admin->>equityController: POST /api/v1/equity/close {year, month, notes}
    equityController->>equityService: closeMonth(year, month, userId, notes)
    equityService->>equityModel: findByPeriod(year, month)
    equityModel->>DB: SELECT FROM equity WHERE period_year=$1 AND period_month=$2
    DB-->>equityModel: null (no existe)
    equityService->>equityModel: getPreviousCapital(year, month)
    equityModel->>DB: SELECT final_capital ORDER BY period DESC LIMIT 1
    DB-->>equityModel: {final_capital: 15000.00} | null
    equityService->>financeModel: getInventoryValue(), getWasteValue(filters), getCashInBoxes(filters), getTotalExpenses(filters)
    financeModel->>DB: queries paralelas
    DB-->>financeModel: valores numéricos
    equityService->>equityModel: create(record)
    equityModel->>DB: BEGIN; INSERT INTO equity ...; COMMIT
    DB-->>equityModel: Equity_Record
    equityModel-->>equityService: Equity_Record
    equityService-->>equityController: Equity_Record
    equityController-->>Admin: 201 {data: Equity_Record}
```

---

## Components and Interfaces

### equityModel.js

```javascript
class EquityModel {
  // Obtiene el final_capital del registro más reciente
  // Retorna null si no hay registros
  async getCurrentCapital(): Promise<number | null>

  // Obtiene el final_capital del período inmediatamente anterior a (year, month)
  // Retorna null si no existe
  async getPreviousCapital(year, month): Promise<number | null>

  // Busca un registro por período exacto
  async findByPeriod(year, month): Promise<EquityRecord | null>

  // Inserta un nuevo registro (dentro de una transacción)
  async create(client, record): Promise<EquityRecord>

  // Historial con variaciones calculadas via window functions
  async getHistory(limit): Promise<EquityRecord[]>
}
```

### equityService.js

```javascript
class EquityService {
  // Orquesta el cierre mensual completo (transacción atómica)
  async closeMonth(year, month, userId, notes): Promise<EquityRecord>

  // Retorna el capital inicial vigente (para uso del Finance Module)
  async getCurrentCapital(): Promise<number>

  // Retorna el historial de patrimonio
  async getHistory(limit): Promise<EquityRecord[]>
}
```

### equityController.js

```javascript
// POST /equity/close
async closeMonth(req, res)   // body: {period_year, period_month, notes?}

// GET /equity/history
async getHistory(req, res)   // query: {limit?}

// GET /equity/current-capital
async getCurrentCapital(req, res)
```

### Modificaciones a financeModel.js

```javascript
// ANTES:
async getWorkingCapital(filters) {
  const initialCapital = config.workingCapital.initialCapital;
  // ...
}

// DESPUÉS:
async getWorkingCapital(filters) {
  const equityModel = require('../../equity/models/equityModel');
  const storedCapital = await equityModel.getCurrentCapital();
  const initialCapital = storedCapital !== null
    ? storedCapital
    : config.workingCapital.initialCapital;
  // ...
}

// ANTES:
async getCapitalConfig() {
  return { initial_capital: config.workingCapital.initialCapital, source: 'environment' };
}

// DESPUÉS:
async getCapitalConfig() {
  const equityModel = require('../../equity/models/equityModel');
  const storedCapital = await equityModel.getCurrentCapital();
  return {
    initial_capital: storedCapital !== null
      ? storedCapital
      : config.workingCapital.initialCapital,
    source: storedCapital !== null ? 'equity' : 'environment',
    has_initial_capital: (storedCapital ?? config.workingCapital.initialCapital) > 0
  };
}
```

---

## Data Models

### Tabla `equity`

```sql
CREATE TABLE equity (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    period_year smallint NOT NULL,
    period_month smallint NOT NULL,
    initial_capital numeric(14,2) NOT NULL,
    inventory_net numeric(14,2) NOT NULL DEFAULT 0,
    cash_in_boxes numeric(14,2) NOT NULL DEFAULT 0,
    total_expenses numeric(14,2) NOT NULL DEFAULT 0,
    final_capital numeric(14,2) NOT NULL,
    notes text,
    closed_by bigint REFERENCES users(id),
    closed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT equity_period_unique UNIQUE (period_year, period_month),
    CONSTRAINT equity_month_check CHECK (period_month BETWEEN 1 AND 12),
    CONSTRAINT equity_year_check CHECK (period_year >= 2020)
);

CREATE INDEX idx_equity_period ON equity(period_year DESC, period_month DESC);
CREATE INDEX idx_equity_closed_at ON equity(closed_at DESC);
```

### Fórmula de cálculo

```
final_capital = initial_capital + inventory_net + cash_in_boxes - total_expenses

donde:
  inventory_net  = getInventoryValue() - getWasteValue({start_date, end_date})
  cash_in_boxes  = getCashInBoxes({start_date, end_date})
  total_expenses = getTotalExpenses({start_date, end_date})
  start_date     = primer día del mes (YYYY-MM-01)
  end_date       = último día del mes (YYYY-MM-last)
```

> Las ventas no entran directamente en la fórmula porque ya están reflejadas en el efectivo de las cajas (`cash_in_boxes`).

### Tipo EquityRecord (respuesta API)

```json
{
  "id": 1,
  "period_year": 2025,
  "period_month": 6,
  "initial_capital": "15000.00",
  "inventory_net": "8500.00",
  "cash_in_boxes": "12300.00",
  "total_expenses": "4200.00",
  "final_capital": "31600.00",
  "notes": "Cierre junio 2025",
  "closed_by": 1,
  "closed_at": "2025-07-01T10:30:00.000Z",
  "variation_absolute": "2100.00",
  "variation_percentage": "7.12"
}
```

### API Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/v1/equity/close` | admin | Ejecutar cierre mensual |
| GET | `/api/v1/equity/history` | authenticated | Historial de patrimonio |
| GET | `/api/v1/equity/current-capital` | authenticated | Capital inicial vigente |

#### POST /api/v1/equity/close — Request body
```json
{ "period_year": 2025, "period_month": 6, "notes": "Cierre junio 2025" }
```

#### GET /api/v1/equity/history — Query params
```
?limit=12   (opcional, default: sin límite)
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Unicidad de período

*Para cualquier* par `(period_year, period_month)`, si ya existe un Equity_Record para ese período, un segundo intento de cierre debe ser rechazado y la tabla `equity` debe permanecer sin cambios.

**Validates: Requirements 2.5**

---

### Property 2: Encadenamiento de capital inicial

*Para cualquier* secuencia de dos cierres consecutivos, el `initial_capital` del segundo cierre debe ser igual al `final_capital` del primero.

**Validates: Requirements 2.2, 3.1**

---

### Property 3: Fórmula de capital final

*Para cualquier* Equity_Record almacenado, debe cumplirse que `final_capital = initial_capital + inventory_net + cash_in_boxes - total_expenses` con precisión de 2 decimales.

**Validates: Requirements 2.1, 1.4**

---

### Property 4: Fallback al .env cuando no hay registros

*Para cualquier* estado de la tabla `equity` vacía, `getCurrentCapital()` debe retornar el valor de `INITIAL_WORKING_CAPITAL` del `.env`, y ese valor debe ser el `initial_capital` usado en el primer cierre.

**Validates: Requirements 2.3, 3.2, 5.2**

---

### Property 5: Variación en historial

*Para cualquier* historial con al menos dos registros, la `variation_absolute` de cada registro debe ser igual a `final_capital[n] - final_capital[n-1]`, y `variation_percentage` debe ser `(variation_absolute / final_capital[n-1]) * 100` redondeado a 2 decimales.

**Validates: Requirements 4.3**

---

### Property 6: Autorización de endpoints

*Para cualquier* request a `POST /equity/close` con un token de usuario sin rol `admin`, el sistema debe retornar HTTP 403. *Para cualquier* request a cualquier endpoint de equity sin token válido, el sistema debe retornar HTTP 401.

**Validates: Requirements 6.4, 6.5**

---

### Property 7: Validación de body en cierre

*Para cualquier* request a `POST /equity/close` con `period_year` o `period_month` ausentes, nulos, o fuera de rango (mes < 1 o > 12, año < 2020), el sistema debe retornar HTTP 400 con un mensaje descriptivo.

**Validates: Requirements 6.6**

---

## Error Handling

### Errores esperados y respuestas HTTP

| Condición | HTTP | Mensaje |
|-----------|------|---------|
| Período ya cerrado | 409 Conflict | `"El período {year}-{month} ya fue cerrado"` |
| `period_year` / `period_month` inválidos | 400 Bad Request | `"period_year y period_month son requeridos y deben ser válidos"` |
| Sin token de autenticación | 401 Unauthorized | (manejado por `authenticateToken`) |
| Usuario sin rol admin en POST /close | 403 Forbidden | (manejado por `authorizeRoles('admin')`) |
| Error de base de datos | 500 Internal Server Error | `"Error interno del servidor"` |

### Estrategia de transacciones

`equityModel.create()` recibe un `client` de pg ya iniciado en transacción. `equityService.closeMonth()` es responsable de:
1. `BEGIN`
2. Verificar unicidad del período
3. Calcular componentes (queries de lectura, fuera de la transacción de escritura)
4. `INSERT INTO equity`
5. `COMMIT` o `ROLLBACK` en caso de error

Esto garantiza que un fallo en cualquier paso no deja registros parciales.

### Dependencia circular — Prevención

`financeModel` importa `equityModel` con `require` inline (dentro del método) para evitar dependencia circular en el momento de carga del módulo:

```javascript
// En financeModel.getWorkingCapital():
const equityModel = require('../../equity/models/equityModel');
```

---

## Testing Strategy

### Enfoque dual: Unit tests + Property-based tests

**Unit tests** (Jest) cubren:
- Casos concretos: primer cierre sin historial previo (usa .env), segundo cierre encadena capital
- Casos de error: período duplicado retorna 409, body inválido retorna 400
- Integración: `financeModel.getWorkingCapital()` usa equity cuando existe

**Property-based tests** (fast-check) cubren las propiedades universales definidas en la sección anterior. Cada test debe ejecutar mínimo **100 iteraciones**.

### Configuración de property tests

Librería: **fast-check** (ya disponible en el ecosistema Node.js/Jest)

```javascript
// Ejemplo de estructura para Property 3
// Feature: equity-working-capital, Property 3: Fórmula de capital final
it('final_capital = initial_capital + inventory_net + cash_in_boxes - total_expenses', () => {
  fc.assert(
    fc.property(
      fc.record({
        initial_capital: fc.float({ min: 0, max: 1_000_000 }),
        inventory_net:   fc.float({ min: -100_000, max: 500_000 }),
        cash_in_boxes:   fc.float({ min: 0, max: 500_000 }),
        total_expenses:  fc.float({ min: 0, max: 200_000 }),
      }),
      ({ initial_capital, inventory_net, cash_in_boxes, total_expenses }) => {
        const expected = initial_capital + inventory_net + cash_in_boxes - total_expenses;
        const record = buildEquityRecord({ initial_capital, inventory_net, cash_in_boxes, total_expenses });
        expect(record.final_capital).toBeCloseTo(expected, 2);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Tag format para cada property test

```
// Feature: equity-working-capital, Property {N}: {texto de la propiedad}
```

### Cobertura esperada

| Capa | Herramienta | Qué cubre |
|------|-------------|-----------|
| equityModel | Jest + pg mock | Queries SQL, manejo de null |
| equityService | Jest | Orquestación, transacciones, fallback .env |
| equityController | Jest + supertest | HTTP status codes, validación de body |
| Properties 1-7 | fast-check | Invariantes universales |
| financeModel (modificado) | Jest | Integración con equityModel |
