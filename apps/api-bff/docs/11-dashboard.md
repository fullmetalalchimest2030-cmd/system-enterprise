# Módulo: DASHBOARD — Dashboard

**Ruta base:** `/api/v1/dashboard`

## Descripción general

Provee datos agregados para el panel principal. Todos los endpoints requieren autenticación.
El endpoint raíz `/dashboard` consolida todos los datos en una sola llamada para la carga inicial.

---

## Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/dashboard` | Todos los datos del dashboard | Sí |
| GET | `/dashboard/daily-sales` | Ventas del día vs ayer | Sí |
| GET | `/dashboard/monthly-sales` | Ventas del mes vs mes anterior | Sí |
| GET | `/dashboard/monthly-profit` | Ganancia del mes con desglose | Sí |
| GET | `/dashboard/low-stock` | Productos con stock bajo | Sí |
| GET | `/dashboard/top-sellers` | Productos más vendidos (últimos 30 días) | Sí |
| GET | `/dashboard/bottom-sellers` | Productos con menor movimiento | Sí |
| GET | `/dashboard/quick-stats` | Estadísticas rápidas del sistema | Sí |

---

## GET /dashboard

Consolida todos los datos en una sola llamada. Recomendado para la carga inicial.

### Response 200
```json
{
  "success": true,
  "message": "Dashboard data retrieved successfully",
  "data": {
    "daily_sales": {
      "today": { "transactions": 12, "total": 360.00, "average": 30.00 },
      "yesterday": { "transactions": 8, "total": 240.00 }
    },
    "monthly_sales": {
      "current_month": { "transactions": 145, "total": 4350.00, "average": 30.00 },
      "last_month": { "transactions": 120, "total": 3600.00 },
      "growth_percentage": 20.80
    },
    "monthly_profit": {
      "revenue": 4350.00,
      "expenses": 2100.00,
      "profit": 2250.00,
      "profit_margin": 51.70,
      "expenses_by_category": [
        { "category": "flowers", "total": "1200.00" }
      ]
    },
    "low_stock_products": [ ... ],
    "top_sellers": [ ... ],
    "bottom_sellers": [ ... ],
    "quick_stats": {
      "active_products": 24,
      "low_stock_products": 3,
      "active_users": 5,
      "today_transactions": 12
    },
    "generated_at": "2024-01-20T15:00:00.000Z"
  }
}
```

Ver cada sección a continuación para el detalle completo de cada campo.

---

## GET /dashboard/daily-sales

Resumen de ventas del día actual vs ayer.

### Response 200
```json
{
  "success": true,
  "message": "Daily sales summary retrieved successfully",
  "data": {
    "today": {
      "transactions": 12,
      "total": 360.00,
      "average": 30.00
    },
    "yesterday": {
      "transactions": 8,
      "total": 240.00
    }
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `today.transactions` | number | Ventas completadas hoy |
| `today.total` | number | Monto total vendido hoy |
| `today.average` | number | Promedio por venta hoy |
| `yesterday.transactions` | number | Ventas completadas ayer |
| `yesterday.total` | number | Monto total vendido ayer |

---

## GET /dashboard/monthly-sales

Resumen de ventas del mes actual vs mes anterior.

### Response 200
```json
{
  "success": true,
  "message": "Monthly sales summary retrieved successfully",
  "data": {
    "current_month": {
      "transactions": 145,
      "total": 4350.00,
      "average": 30.00
    },
    "last_month": {
      "transactions": 120,
      "total": 3600.00
    },
    "growth_percentage": 20.80
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `current_month.transactions` | number | Ventas del mes actual |
| `current_month.total` | number | Monto total del mes actual |
| `current_month.average` | number | Promedio por venta del mes actual |
| `last_month.transactions` | number | Ventas del mes anterior |
| `last_month.total` | number | Monto total del mes anterior |
| `growth_percentage` | number | Crecimiento % vs mes anterior (puede ser negativo) |

---

## GET /dashboard/monthly-profit

Ganancia del mes actual con desglose de gastos por categoría.

### Query Parameters
| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `month_offset` | number | 0 | Desplazamiento de meses (0 = actual, -1 = anterior) |

### Response 200
```json
{
  "success": true,
  "message": "Monthly profit retrieved successfully",
  "data": {
    "revenue": 4350.00,
    "expenses": 2100.00,
    "profit": 2250.00,
    "profit_margin": 51.70,
    "expenses_by_category": [
      {
        "category": "flowers",
        "total": "1200.00"
      },
      {
        "category": "salaries",
        "total": "600.00"
      },
      {
        "category": "transport",
        "total": "300.00"
      }
    ]
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `revenue` | number | Ingresos totales por ventas completadas del mes |
| `expenses` | number | Total de gastos registrados del mes |
| `profit` | number | Ganancia neta: revenue − expenses |
| `profit_margin` | number | Margen de ganancia en porcentaje |
| `expenses_by_category` | array | Desglose de gastos por categoría, ordenado por total DESC |
| `expenses_by_category[].category` | string | Nombre de la categoría de gasto |
| `expenses_by_category[].total` | string | Monto total de esa categoría |

---

## GET /dashboard/low-stock

Productos con `stock_cached <= min_stock`, ordenados por menor stock primero.

### Query Parameters
| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `threshold` | number | 10 | Umbral de stock (devuelve productos con stock ≤ threshold) |

> **Nota:** El parámetro `threshold` no está implementado en el modelo actual. El endpoint devuelve
> todos los productos con `stock_cached <= min_stock` independientemente del threshold.

### Response 200
```json
{
  "success": true,
  "message": "Low stock products retrieved successfully",
  "data": [
    {
      "id": 3,
      "category_id": 1,
      "category_name": "Flores",
      "name": "Girasol",
      "sku": "GIR-001",
      "unit_of_measure": "und",
      "cost_price": "2.00",
      "sell_price": "4.00",
      "stock_cached": 3,
      "min_stock": 10,
      "description": null,
      "image_url": null,
      "show_in_catalog": false,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "deleted_at": null
    }
  ]
}
```

Devuelve el objeto producto completo. Ver módulo Products para descripción de todos los campos.

---

## GET /dashboard/top-sellers

Productos más vendidos en los últimos 30 días, ordenados por `units_sold` DESC.

### Query Parameters
| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `limit` | number | 5 | Máximo de resultados |

### Response 200
```json
{
  "success": true,
  "message": "Top sellers retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Rosa Roja",
      "sku": "ROS-001",
      "stock_cached": 150,
      "sell_price": "3.00",
      "category_name": "Flores",
      "units_sold": "85",
      "total_revenue": "255.00"
    }
  ]
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID del producto |
| `name` | string | Nombre del producto |
| `sku` | string \| null | SKU |
| `stock_cached` | number | Stock actual |
| `sell_price` | string | Precio de venta |
| `category_name` | string \| null | Nombre de la categoría |
| `units_sold` | string | Unidades vendidas en los últimos 30 días |
| `total_revenue` | string | Ingresos generados en los últimos 30 días |

---

## GET /dashboard/bottom-sellers

Productos con menor movimiento. Actualmente devuelve los productos con mayor stock
(no necesariamente los menos vendidos — usar `/reports/product-performance` para análisis más preciso).

### Query Parameters
| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `limit` | number | 5 | Máximo de resultados |

### Response 200
```json
{
  "success": true,
  "message": "Bottom sellers retrieved successfully",
  "data": [
    {
      "id": 8,
      "name": "Orquídea Blanca",
      "sku": "ORQ-001",
      "stock_cached": 25,
      "sell_price": "12.00",
      "category_name": "Flores"
    }
  ]
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID del producto |
| `name` | string | Nombre del producto |
| `sku` | string \| null | SKU |
| `stock_cached` | number | Stock actual |
| `sell_price` | string | Precio de venta |
| `category_name` | string \| null | Nombre de la categoría |

> **Nota:** A diferencia de `top-sellers`, este endpoint no incluye `units_sold` ni `total_revenue`.
> Para análisis completo de rendimiento, usar `GET /reports/product-performance`.

---

## GET /dashboard/quick-stats

Estadísticas rápidas del estado actual del sistema.

### Response 200
```json
{
  "success": true,
  "message": "Quick stats retrieved successfully",
  "data": {
    "active_products": 24,
    "low_stock_products": 3,
    "active_users": 5,
    "today_transactions": 12
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `active_products` | number | Total de productos activos (no eliminados) |
| `low_stock_products` | number | Productos con `stock_cached <= min_stock` |
| `active_users` | number | Total de usuarios activos (no eliminados) |
| `today_transactions` | number | Ventas completadas hoy |

---

## Ideas de uso para el frontend

```
Carga inicial del dashboard:
- GET /dashboard → una sola llamada para todos los widgets
- Distribuir los datos a cada componente

Widgets individuales (actualización parcial):
- Ventas del día: GET /dashboard/daily-sales → actualizar cada 5 min
- Ganancia del mes: GET /dashboard/monthly-profit
- Alertas de stock: GET /dashboard/low-stock → badge en el menú
- Stats rápidas: GET /dashboard/quick-stats → header del dashboard

Comparativa de meses:
- GET /dashboard/monthly-profit?month_offset=0 → mes actual
- GET /dashboard/monthly-profit?month_offset=-1 → mes anterior
- Calcular variación en el frontend

Ranking de productos:
- GET /dashboard/top-sellers?limit=10 → tabla de mejores
- Para análisis completo: GET /reports/product-performance
  (incluye units_sold, profit_margin, percentage_of_total_revenue)

Gráfico de gastos del mes:
- expenses_by_category de GET /dashboard/monthly-profit
- Gráfico de torta con las categorías
```
