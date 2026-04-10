# Módulo: REPORTS — Reportes

**Ruta base:** `/api/v1/reports`

## Descripción general

Genera reportes de inteligencia de negocio. Todos los endpoints requieren rol `admin`.
Incluye análisis de rentabilidad, ventas por método de pago, rendimiento de empleados,
valorización de mermas, rotación de inventario y un pronóstico de demanda con IA.

---

## Endpoints

| Método | Ruta | Descripción | Rol requerido |
|--------|------|-------------|---------------|
| GET | `/reports/profitability` | Rentabilidad por período | `admin` |
| GET | `/reports/payment-method` | Ventas por método de pago | `admin` |
| GET | `/reports/employee` | Ventas por empleado | `admin` |
| GET | `/reports/waste` | Valorización de mermas | `admin` |
| GET | `/reports/inventory-turnover` | Rotación de inventario | `admin` |
| GET | `/reports/product-performance` | Rendimiento de productos | `admin` |
| GET | `/reports/forecast` | Pronóstico de demanda (IA) | `admin` |
| GET | `/reports/comprehensive` | Reporte comprehensivo completo | `admin` |

---

## GET /reports/profitability

Reporte de rentabilidad: ingresos, gastos y ganancia por período con desglose mensual.

### Query Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `start_date` | string | No | Fecha inicio (YYYY-MM-DD) |
| `end_date` | string | No | Fecha fin (YYYY-MM-DD) |

### Response 200
```json
{
  "success": true,
  "message": "Profitability report retrieved successfully",
  "data": {
    "summary": {
      "total_revenue": 15000.00,
      "total_expenses": 8500.00,
      "profit": 6500.00,
      "profit_margin": 43.30
    },
    "by_month": [
      {
        "month": "2024-01-01T00:00:00.000Z",
        "revenue": 5000.00,
        "expenses": 2800.00,
        "profit": 2200.00
      },
      {
        "month": "2024-02-01T00:00:00.000Z",
        "revenue": 5500.00,
        "expenses": 3000.00,
        "profit": 2500.00
      }
    ],
    "ai_insights": null
  }
}
```

### Campos de respuesta — `data.summary`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `total_revenue` | number | Ingresos totales por ventas completadas |
| `total_expenses` | number | Total de gastos registrados |
| `profit` | number | Ganancia neta: revenue - expenses |
| `profit_margin` | number | Margen de ganancia en porcentaje |

### Campos de respuesta — `data.by_month[]`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `month` | string (ISO) | Primer día del mes |
| `revenue` | number | Ingresos del mes |
| `expenses` | number | Gastos del mes |
| `profit` | number | Ganancia del mes |

### Campos de respuesta — `data.ai_insights`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ai_insights` | object \| null | Análisis de IA (null si el servicio no está disponible) |

---

## GET /reports/payment-method

Reporte de ventas agrupadas por método de pago.

### Query Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `start_date` | string | No | Fecha inicio |
| `end_date` | string | No | Fecha fin |

### Response 200
```json
{
  "success": true,
  "message": "Sales by payment method retrieved successfully",
  "data": {
    "by_payment_method": [
      {
        "payment_method": "cash",
        "transaction_count": "80",
        "total_amount": "2400.00",
        "average_amount": "30.00"
      },
      {
        "payment_method": "yape",
        "transaction_count": "45",
        "total_amount": "1350.00",
        "average_amount": "30.00"
      },
      {
        "payment_method": "plin",
        "transaction_count": "20",
        "total_amount": "600.00",
        "average_amount": "30.00"
      }
    ],
    "summary": {
      "total_transactions": 145,
      "total_amount": 4350.00
    }
  }
}
```

### Campos de respuesta — `data.by_payment_method[]`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `payment_method` | string | Código del método: `cash`, `yape`, `plin`, `transfer`, `card` |
| `transaction_count` | string | Número de transacciones |
| `total_amount` | string | Monto total |
| `average_amount` | string | Monto promedio por transacción |

### Campos de respuesta — `data.summary`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `total_transactions` | number | Total de transacciones en el período |
| `total_amount` | number | Monto total vendido |

---

## GET /reports/employee

Reporte de ventas agrupadas por empleado.

### Query Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `start_date` | string | No | Fecha inicio |
| `end_date` | string | No | Fecha fin |
| `employee_id` | number | No | Filtrar por empleado específico |

### Response 200
```json
{
  "success": true,
  "message": "Sales by employee retrieved successfully",
  "data": {
    "by_employee": [
      {
        "user_id": 2,
        "first_name": "Maria",
        "last_name": "Lopez",
        "transaction_count": "85",
        "total_amount": "2550.00",
        "average_amount": "30.00"
      },
      {
        "user_id": 3,
        "first_name": "Carlos",
        "last_name": "Gomez",
        "transaction_count": "60",
        "total_amount": "1800.00",
        "average_amount": "30.00"
      }
    ],
    "summary": {
      "total_transactions": 145,
      "total_amount": 4350.00
    }
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `by_employee[].user_id` | number | ID del empleado |
| `by_employee[].first_name` | string | Nombre |
| `by_employee[].last_name` | string | Apellido |
| `by_employee[].transaction_count` | string | Número de ventas realizadas |
| `by_employee[].total_amount` | string | Monto total vendido |
| `by_employee[].average_amount` | string | Promedio por venta |
| `summary.total_transactions` | number | Total de transacciones en el período |
| `summary.total_amount` | number | Monto total vendido |

> **Nota:** El query param se llama `employee_id` pero internamente se mapea a `user_id` en la BD.

---

## GET /reports/waste

Reporte de valorización de mermas (movimientos tipo `waste`).

### Query Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `start_date` | string | No | Fecha inicio |
| `end_date` | string | No | Fecha fin |

### Response 200
```json
{
  "success": true,
  "message": "Waste valuation report retrieved successfully",
  "data": {
    "by_product": [
      {
        "product_id": 3,
        "product_name": "Girasol",
        "sell_price": 4.00,
        "cost_price": 2.00,
        "wasted_quantity": "15",
        "cost_value": "30.00",
        "retail_value": "60.00"
      }
    ],
    "summary": {
      "waste_count": 5,
      "total_wasted_items": 38,
      "total_cost_value": 76.00,
      "total_retail_value": 152.00
    }
  }
}
```

### Campos de respuesta — `data.by_product[]`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `product_id` | number | ID del producto |
| `product_name` | string | Nombre del producto |
| `sell_price` | number | Precio de venta actual |
| `cost_price` | number | Precio de costo actual |
| `wasted_quantity` | string | Unidades desperdiciadas |
| `cost_value` | string | Valor al costo de las mermas |
| `retail_value` | string | Valor al precio de venta de las mermas |

### Campos de respuesta — `data.summary`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `waste_count` | number | Número de movimientos de merma |
| `total_wasted_items` | number | Total de unidades desperdiciadas |
| `total_cost_value` | number | Valor total al costo |
| `total_retail_value` | number | Valor total al precio de venta |

---

## GET /reports/inventory-turnover

Reporte de rotación de inventario: unidades vendidas y recibidas por producto.

### Query Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `start_date` | string | No | Fecha inicio |
| `end_date` | string | No | Fecha fin |

### Response 200
```json
{
  "success": true,
  "message": "Inventory turnover report retrieved successfully",
  "data": [
    {
      "product_id": 1,
      "product_name": "Rosa Roja",
      "current_stock": 150,
      "cost_price": 1.50,
      "sell_price": 3.00,
      "units_sold": "85",
      "units_received": "200"
    }
  ]
}
```

### Campos de respuesta — cada item
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `product_id` | number | ID del producto |
| `product_name` | string | Nombre del producto |
| `current_stock` | number | Stock actual |
| `cost_price` | number | Precio de costo |
| `sell_price` | number | Precio de venta |
| `units_sold` | string | Unidades vendidas en el período |
| `units_received` | string | Unidades recibidas (entradas) en el período |

---

## GET /reports/product-performance

Reporte completo de rendimiento de productos: top sellers, bottom sellers, rendimiento por categoría y alertas.

### Query Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `start_date` | string | No | Fecha inicio |
| `end_date` | string | No | Fecha fin |
| `limit` | number | No | Máximo de productos en top/bottom (default: 10) |

### Response 200
```json
{
  "success": true,
  "message": "Product performance report retrieved successfully",
  "data": {
    "summary": {
      "period": {
        "start_date": "2024-01-01",
        "end_date": "2024-01-31"
      },
      "totals": {
        "total_units_sold": 450,
        "total_revenue": 13500.00,
        "total_products_sold": 18,
        "total_products": 24,
        "total_transactions": 145,
        "average_price_per_unit": 30.00
      }
    },
    "top_sellers": [
      {
        "product_id": 1,
        "product_name": "Rosa Roja",
        "category_id": 1,
        "category_name": "Flores",
        "units_sold": 85,
        "total_revenue": 255.00,
        "average_price": 3.00,
        "percentage_of_total_revenue": 1.89,
        "percentage_of_total_units": 18.89,
        "profit_margin": 50.00,
        "transactions_count": 42,
        "current_stock": 150
      }
    ],
    "bottom_sellers": [
      {
        "product_id": 8,
        "product_name": "Orquídea Blanca",
        "category_id": 1,
        "category_name": "Flores",
        "units_sold": 0,
        "total_revenue": 0,
        "average_price": 0,
        "percentage_of_total_revenue": 0,
        "percentage_of_total_units": 0,
        "profit_margin": 50.00,
        "transactions_count": 0,
        "current_stock": 25,
        "alert": "Sin ventas en el período"
      }
    ],
    "category_performance": [
      {
        "category_id": 1,
        "category_name": "Flores",
        "products_count": 8,
        "total_units_sold": 320,
        "total_revenue": 9600.00,
        "average_revenue_per_product": 1200.00
      }
    ],
    "alerts": [
      {
        "type": "no_sales",
        "count": 3,
        "products": [
          { "product_id": 8, "product_name": "Orquídea Blanca" }
        ],
        "message": "3 producto(s) sin ventas en el período"
      }
    ]
  }
}
```

### Campos de respuesta — `data.top_sellers[]` y `data.bottom_sellers[]`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `product_id` | number | ID del producto |
| `product_name` | string | Nombre del producto |
| `category_id` | number \| null | ID de la categoría |
| `category_name` | string \| null | Nombre de la categoría |
| `units_sold` | number | Unidades vendidas en el período |
| `total_revenue` | number | Ingresos generados |
| `average_price` | number | Precio promedio de venta |
| `percentage_of_total_revenue` | number | % del ingreso total |
| `percentage_of_total_units` | number | % de las unidades totales vendidas |
| `profit_margin` | number | Margen de ganancia en % |
| `transactions_count` | number | Número de transacciones |
| `current_stock` | number | Stock actual |
| `alert` | string \| null | Solo en bottom_sellers: `"Sin ventas en el período"` o `"Ventas muy bajas"` |

### Campos de respuesta — `data.category_performance[]`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `category_id` | number | ID de la categoría |
| `category_name` | string | Nombre de la categoría |
| `products_count` | number | Número de productos en la categoría |
| `total_units_sold` | number | Unidades vendidas de la categoría |
| `total_revenue` | number | Ingresos de la categoría |
| `average_revenue_per_product` | number | Ingreso promedio por producto |

### Campos de respuesta — `data.alerts[]`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `type` | string | `"low_stock"`, `"no_sales"`, `"low_sales"` |
| `count` | number | Número de productos afectados |
| `products` | array | Lista de productos afectados (máx 3) |
| `message` | string | Descripción del problema |

---

## GET /reports/forecast

Pronóstico de demanda generado por IA. Requiere que el servicio de analytics esté disponible.

### Query Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `periods` | number | No | Días a pronosticar (default: 30) |

### Response 200 — Servicio disponible
```json
{
  "success": true,
  "message": "Demand forecast retrieved successfully",
  "data": {
    "forecast": [ ... ],
    "confidence": 0.85
  }
}
```

### Response 200 — Servicio no disponible
```json
{
  "success": true,
  "message": "Demand forecast retrieved successfully",
  "data": {
    "message": "Forecast unavailable"
  }
}
```

---

## GET /reports/comprehensive

Genera un reporte completo que combina todos los reportes anteriores en una sola llamada.

### Query Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `start_date` | string | No | Fecha inicio |
| `end_date` | string | No | Fecha fin |

### Response 200
```json
{
  "success": true,
  "message": "Comprehensive report generated successfully",
  "data": {
    "period": {
      "start_date": "2024-01-01",
      "end_date": "2024-01-31"
    },
    "profitability": { ... },
    "sales_by_payment_method": { ... },
    "sales_by_employee": { ... },
    "waste_valuation": { ... },
    "product_performance": { ... },
    "generated_at": "2024-01-31T23:59:59.000Z"
  }
}
```

Ver cada sección individual para el detalle de cada campo.

---

## Ideas de uso para el frontend

```
Reporte mensual (admin):
- GET /reports/profitability?start_date=2024-01-01&end_date=2024-01-31
  → gráfico de barras: ingresos vs gastos por mes
  → tarjetas: total revenue, total expenses, profit, profit_margin

Análisis de métodos de pago:
- GET /reports/payment-method → gráfico de torta
- Mostrar qué método genera más ingresos

Ranking de empleados:
- GET /reports/employee → tabla ordenada por total_amount
- Comparar rendimiento entre cajeros

Control de mermas:
- GET /reports/waste → tabla de productos con más merma
- Calcular impacto: total_retail_value = pérdida potencial

Análisis de productos:
- GET /reports/product-performance → dashboard completo
  → top_sellers: tabla de mejores productos
  → bottom_sellers: productos a revisar (con alert)
  → category_performance: gráfico por categoría
  → alerts: notificaciones de acción requerida

Exportar reporte completo:
- GET /reports/comprehensive → generar PDF o Excel con todos los datos
```
