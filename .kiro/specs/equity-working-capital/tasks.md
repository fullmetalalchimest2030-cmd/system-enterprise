# Plan de Implementación: Equity Working Capital

## Overview

Implementar el módulo `equity` siguiendo el patrón Model/Service/Controller/Routes del proyecto. El módulo persiste el patrimonio mensual en la tabla `equity`, encadena el capital inicial entre períodos y expone tres endpoints REST. Se modifica `financeModel` para leer el capital inicial desde equity en lugar del `.env`.

## Tasks

- [x] 1. Agregar migración SQL a guaza2.sql
  - Añadir al final de `guaza2.sql` la sección con `CREATE TABLE equity`, sus constraints (`UNIQUE`, `CHECK`) y los índices `idx_equity_period` e `idx_equity_closed_at`
  - NO ejecutar el script — el usuario lo aplica manualmente
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 2. Implementar equityModel.js
  - [x] 2.1 Crear `apps/api-bff/src/modules/equity/models/equityModel.js`
    - Implementar `getCurrentCapital()`: `SELECT final_capital FROM equity ORDER BY period_year DESC, period_month DESC LIMIT 1`, retorna `null` si no hay registros
    - Implementar `getPreviousCapital(year, month)`: busca el registro más reciente con período anterior al indicado
    - Implementar `findByPeriod(year, month)`: búsqueda exacta por `(period_year, period_month)`
    - Implementar `create(client, record)`: INSERT dentro de una transacción pg ya iniciada, retorna el `EquityRecord` creado
    - Implementar `getHistory(limit)`: SELECT con window function para calcular `variation_absolute` y `variation_percentage`, ordenado cronológicamente ASC
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3, 5.1, 5.3_

  - [x] 2.2 Escribir property test — Property 3: Fórmula de capital final
    - **Property 3: `final_capital = initial_capital + inventory_net + cash_in_boxes - total_expenses`**
    - Usar `fc.record` con floats en rangos realistas, verificar con `toBeCloseTo(expected, 2)`
    - **Validates: Requirements 2.1, 1.4**

  - [x] 2.3 Escribir property test — Property 5: Variación en historial
    - **Property 5: `variation_absolute[n] = final_capital[n] - final_capital[n-1]` y `variation_percentage` redondeado a 2 decimales**
    - Generar arrays de al menos 2 registros con `fc.array`, verificar cálculo de variaciones
    - **Validates: Requirements 4.3**

- [x] 3. Implementar equityService.js
  - [x] 3.1 Crear `apps/api-bff/src/modules/equity/services/equityService.js`
    - Implementar `closeMonth(year, month, userId, notes)`:
      1. Verificar con `equityModel.findByPeriod()` que el período no esté cerrado (lanza error 409 si existe)
      2. Obtener `initial_capital` via `equityModel.getPreviousCapital()`, fallback a `config.workingCapital.initialCapital`
      3. Calcular `start_date` (YYYY-MM-01) y `end_date` (último día del mes)
      4. Llamar en paralelo `financeModel.getInventoryValue()`, `getWasteValue(filters)`, `getCashInBoxes(filters)`, `getTotalExpenses(filters)`
      5. Calcular `inventory_net = inventoryValue - wasteValue` y `final_capital`
      6. Abrir transacción pg, llamar `equityModel.create(client, record)`, commit/rollback
    - Implementar `getCurrentCapital()`: delega a `equityModel.getCurrentCapital()`, fallback a `config.workingCapital.initialCapital`
    - Implementar `getHistory(limit)`: delega a `equityModel.getHistory(limit)`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 4.1, 5.1, 5.2_

  - [x] 3.2 Escribir property test — Property 1: Unicidad de período
    - **Property 1: Un segundo cierre del mismo `(year, month)` debe ser rechazado y la tabla no debe cambiar**
    - Mockear `equityModel.findByPeriod()` para retornar un registro existente, verificar que `closeMonth` lanza error con código 409
    - **Validates: Requirements 2.5**

  - [x] 3.3 Escribir property test — Property 2: Encadenamiento de capital inicial
    - **Property 2: El `initial_capital` del segundo cierre debe ser igual al `final_capital` del primero**
    - Generar pares de cierres consecutivos con `fc.record`, verificar encadenamiento
    - **Validates: Requirements 2.2, 3.1**

  - [x] 3.4 Escribir property test — Property 4: Fallback al .env cuando no hay registros
    - **Property 4: Con tabla vacía, `getCurrentCapital()` retorna `config.workingCapital.initialCapital`**
    - Mockear `equityModel.getCurrentCapital()` retornando `null`, verificar que el servicio retorna el valor del config
    - **Validates: Requirements 2.3, 3.2, 5.2**

- [x] 4. Checkpoint — Verificar lógica de negocio
  - Asegurarse de que todos los tests de equityModel y equityService pasen. Consultar al usuario si hay dudas.

- [x] 5. Implementar equityController.js y equityRoutes.js
  - [x] 5.1 Crear `apps/api-bff/src/modules/equity/controllers/equityController.js`
    - `closeMonth(req, res)`: validar que `period_year` y `period_month` estén presentes, sean enteros, mes entre 1-12 y año >= 2020; retornar 400 si inválidos; llamar `equityService.closeMonth()`; retornar 201 con el registro creado; capturar error de período duplicado y retornar 409
    - `getHistory(req, res)`: parsear query param `limit` (opcional); llamar `equityService.getHistory(limit)`; retornar 200
    - `getCurrentCapital(req, res)`: llamar `equityService.getCurrentCapital()`; retornar 200 con `{ current_capital, source }`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 5.2 Crear `apps/api-bff/src/modules/equity/routes/equityRoutes.js`
    - `POST /close` → `authenticateToken` + `authorizeRoles('admin')` + `equityController.closeMonth`
    - `GET /history` → `authenticateToken` + `equityController.getHistory`
    - `GET /current-capital` → `authenticateToken` + `equityController.getCurrentCapital`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 5.3 Escribir property test — Property 6: Autorización de endpoints
    - **Property 6: `POST /equity/close` sin rol admin retorna 403; cualquier endpoint sin token retorna 401**
    - Usar supertest con tokens mockeados, verificar status codes para distintos roles y ausencia de token
    - **Validates: Requirements 6.4, 6.5**

  - [x] 5.4 Escribir property test — Property 7: Validación de body en cierre
    - **Property 7: Body con `period_year`/`period_month` ausentes, nulos o fuera de rango retorna 400 con mensaje descriptivo**
    - Usar `fc.record` con valores inválidos (mes < 1, mes > 12, año < 2020, campos nulos), verificar HTTP 400
    - **Validates: Requirements 6.6**

- [x] 6. Registrar ruta en main.js
  - Agregar `const equityRoutes = require('./modules/equity/routes/equityRoutes')` en `apps/api-bff/src/main.js`
  - Agregar `app.use('/api/v1/equity', equityRoutes)` junto a las demás rutas v1
  - _Requirements: 6.1, 6.2, 6.3_

- [-] 7. Modificar financeModel.js para usar equityModel
  - En `getWorkingCapital(filters)`: reemplazar `const initialCapital = config.workingCapital.initialCapital` por require inline de `equityModel` y lógica de fallback
  - En `getCapitalConfig()`: reemplazar retorno estático por consulta a `equityModel.getCurrentCapital()` con fallback, incluyendo campo `source: 'equity' | 'environment'`
  - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2, 5.3_

  - [ ] 7.1 Escribir unit tests para financeModel modificado
    - Verificar que cuando `equityModel.getCurrentCapital()` retorna un valor, `getWorkingCapital` lo usa como `initial_capital`
    - Verificar que cuando retorna `null`, se usa `config.workingCapital.initialCapital`
    - Verificar que `getCapitalConfig()` retorna `source: 'equity'` o `source: 'environment'` según corresponda
    - _Requirements: 3.3_

- [ ] 8. Checkpoint final — Asegurarse de que todos los tests pasen
  - Ejecutar la suite completa. Consultar al usuario si hay dudas antes de cerrar.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- La migración SQL (tarea 1) debe agregarse a `guaza2.sql` pero NO ejecutarse — el usuario la aplica manualmente
- El require inline de `equityModel` dentro de `financeModel` es intencional para evitar dependencia circular en tiempo de carga
- Cada property test debe ejecutar mínimo 100 iteraciones (`{ numRuns: 100 }`)
- Cada property test debe incluir el tag: `// Feature: equity-working-capital, Property {N}: {texto}`
