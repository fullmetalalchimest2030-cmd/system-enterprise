# Documento de Requisitos

## Introducción

Este documento describe los requisitos para el sistema de **patrimonio acumulado (equity)** del negocio de florería. Actualmente el capital de trabajo se calcula dinámicamente usando una variable de entorno (`INITIAL_WORKING_CAPITAL`) y no se persiste en base de datos. La nueva funcionalidad permite registrar el patrimonio al cierre de cada mes, usar ese valor como capital inicial del mes siguiente, y visualizar el historial de crecimiento o decrecimiento del negocio a lo largo del tiempo.

---

## Glosario

- **Equity_System**: El módulo de patrimonio acumulado que gestiona cierres mensuales y el historial de capital.
- **Equity_Record**: Un registro en la tabla `equity` que representa el estado patrimonial de un período mensual cerrado.
- **Period**: Un mes calendario identificado por año y número de mes (ej. 2025-06).
- **Initial_Capital**: El capital con el que inicia un período. Para el primer período, se toma de `INITIAL_WORKING_CAPITAL` en `.env`. Para períodos posteriores, es el `final_capital` del período anterior.
- **Final_Capital**: El capital calculado al cierre de un período: `initial_capital + inventory_net + cash_in_boxes - total_expenses`.
- **Inventory_Net**: Valor del inventario actual menos el valor de mermas del período.
- **Cash_In_Boxes**: Suma del efectivo en cajas (sesiones cerradas y abiertas) del período.
- **Total_Expenses**: Suma de todos los gastos registrados en el período.
- **Monthly_Close**: La acción de calcular y persistir el `Final_Capital` de un período, cerrando ese mes.
- **Finance_Module**: El módulo existente en `apps/api-bff/src/modules/finances/`.
- **Working_Capital**: El capital de trabajo dinámico ya existente en el sistema.

---

## Requisitos

### Requisito 1: Tabla de patrimonio en base de datos

**User Story:** Como administrador del negocio, quiero que el patrimonio mensual se guarde en base de datos, para tener un registro persistente del estado financiero del negocio.

#### Criterios de Aceptación

1. THE Equity_System SHALL almacenar cada Equity_Record con los campos: `id`, `period_year`, `period_month`, `initial_capital`, `inventory_net`, `cash_in_boxes`, `total_expenses`, `final_capital`, `notes`, `closed_by` (user_id), `closed_at`.
2. THE Equity_System SHALL garantizar que la combinación `(period_year, period_month)` sea única en la tabla `equity`.
3. THE Equity_System SHALL registrar `closed_at` con la marca de tiempo exacta en que se ejecutó el cierre mensual.
4. THE Equity_System SHALL almacenar `final_capital` con precisión de 2 decimales.

---

### Requisito 2: Cierre mensual

**User Story:** Como administrador, quiero ejecutar el cierre de un mes, para calcular y guardar el capital final del período y dejarlo disponible como base del mes siguiente.

#### Criterios de Aceptación

1. WHEN un administrador solicita el cierre de un período `(year, month)`, THE Equity_System SHALL calcular `final_capital = initial_capital + inventory_net + cash_in_boxes - total_expenses` usando los datos del período indicado.
2. WHEN el cierre es solicitado, THE Equity_System SHALL obtener `initial_capital` desde el `final_capital` del Equity_Record del período inmediatamente anterior, si existe.
3. IF no existe un Equity_Record previo, THEN THE Equity_System SHALL usar el valor de `INITIAL_WORKING_CAPITAL` del archivo de configuración como `initial_capital`.
4. WHEN el cierre es ejecutado exitosamente, THE Equity_System SHALL persistir el Equity_Record en la tabla `equity`.
5. IF ya existe un Equity_Record para el período `(year, month)` solicitado, THEN THE Equity_System SHALL retornar un error indicando que el período ya fue cerrado.
6. WHEN el cierre es ejecutado, THE Equity_System SHALL registrar el `user_id` del administrador que lo ejecutó en el campo `closed_by`.

---

### Requisito 3: Capital inicial dinámico desde el período anterior

**User Story:** Como administrador, quiero que el capital inicial de cada mes se tome automáticamente del cierre del mes anterior, para que el cálculo del Working Capital refleje la realidad acumulada del negocio.

#### Criterios de Aceptación

1. WHEN el Finance_Module calcula el Working_Capital del período actual, THE Equity_System SHALL proveer el `final_capital` del último Equity_Record cerrado como `initial_capital`.
2. IF no existe ningún Equity_Record cerrado, THEN THE Equity_System SHALL retornar el valor de `INITIAL_WORKING_CAPITAL` de la configuración como `initial_capital` de respaldo.
3. THE Finance_Module SHALL usar el `initial_capital` provisto por el Equity_System en lugar de leer directamente de `config.workingCapital.initialCapital`.

---

### Requisito 4: Historial de patrimonio

**User Story:** Como administrador, quiero consultar el historial de patrimonio mes a mes, para analizar el crecimiento o decrecimiento del negocio a lo largo del tiempo.

#### Criterios de Aceptación

1. WHEN un usuario autenticado solicita el historial de patrimonio, THE Equity_System SHALL retornar todos los Equity_Records ordenados cronológicamente de más antiguo a más reciente.
2. THE Equity_System SHALL incluir en cada Equity_Record del historial los campos: `period_year`, `period_month`, `initial_capital`, `inventory_net`, `cash_in_boxes`, `total_expenses`, `final_capital`, `closed_at`.
3. WHEN el historial contiene al menos dos Equity_Records, THE Equity_System SHALL calcular e incluir la variación absoluta (`final_capital` actual - `final_capital` anterior) y la variación porcentual para cada registro.
4. WHERE el parámetro `limit` es proporcionado en la solicitud, THE Equity_System SHALL retornar únicamente los últimos N Equity_Records según el valor indicado.

---

### Requisito 5: Consulta del capital inicial vigente

**User Story:** Como sistema, quiero poder consultar cuál es el capital inicial que debe usarse para el período actual, para que el cálculo del Working Capital sea siempre correcto.

#### Criterios de Aceptación

1. WHEN el Finance_Module solicita el capital inicial vigente, THE Equity_System SHALL retornar el `final_capital` del Equity_Record más reciente si existe al menos uno.
2. IF no existe ningún Equity_Record, THEN THE Equity_System SHALL retornar el valor de `INITIAL_WORKING_CAPITAL` de la configuración.
3. THE Equity_System SHALL exponer este valor a través de una función interna reutilizable por el Finance_Module.

---

### Requisito 6: API REST para el módulo de equity

**User Story:** Como desarrollador frontend, quiero endpoints REST para gestionar el equity, para poder integrar el cierre mensual y el historial en la interfaz de usuario.

#### Criterios de Aceptación

1. THE Equity_System SHALL exponer `POST /equity/close` para ejecutar el cierre mensual, accesible solo por usuarios con rol `admin`.
2. THE Equity_System SHALL exponer `GET /equity/history` para consultar el historial de patrimonio, accesible por usuarios autenticados.
3. THE Equity_System SHALL exponer `GET /equity/current-capital` para consultar el capital inicial vigente, accesible por usuarios autenticados.
4. WHEN una solicitud a cualquier endpoint de equity es recibida sin token de autenticación válido, THE Equity_System SHALL retornar HTTP 401.
5. WHEN `POST /equity/close` es invocado por un usuario sin rol `admin`, THE Equity_System SHALL retornar HTTP 403.
6. IF el body de `POST /equity/close` no contiene `period_year` y `period_month` válidos, THEN THE Equity_System SHALL retornar HTTP 400 con un mensaje descriptivo del error.

---

### Requisito 7: Migración SQL

**User Story:** Como desarrollador, quiero el script SQL de migración para crear la tabla `equity`, para poder aplicarlo manualmente en la base de datos de producción.

#### Criterios de Aceptación

1. THE Equity_System SHALL proveer un script SQL que cree la tabla `equity` con todos los campos definidos en el Requisito 1.
2. THE Equity_System SHALL incluir en el script SQL los índices necesarios para consultas por `(period_year, period_month)` y por `closed_at`.
3. THE Equity_System SHALL incluir en el script SQL la restricción `UNIQUE` sobre `(period_year, period_month)`.
4. THE Equity_System SHALL agregar el script SQL al archivo `guaza2.sql` existente como una sección adicional al final del archivo.
