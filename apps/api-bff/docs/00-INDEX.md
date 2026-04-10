# API Documentation - Sistema Flower

## Base URL
```
/api/v1
```

## Formato de respuesta estándar

Todas las respuestas exitosas siguen esta estructura:
```json
{
  "success": true,
  "message": "Descripción del resultado",
  "data": { ... }
}
```

Error:
```json
{
  "success": false,
  "error": {
    "message": "Descripción del error",
    "statusCode": 400
  }
}
```

## Autenticación

JWT en el header `Authorization`:
```
Authorization: Bearer <token>
```

## Roles disponibles
| Rol | Descripción |
|-----|-------------|
| `admin` | Acceso completo |
| `cashier` | Ventas y caja |
| `warehouse` | Inventario y productos |

## Módulos

| # | Módulo | Ruta base | Archivo |
|---|--------|-----------|---------|
| 1 | Auth | `/api/v1/auth` | [01-auth.md](./01-auth.md) |
| 2 | Employees | `/api/v1/employees` | [02-employees.md](./02-employees.md) |
| 3 | Categories | `/api/v1/categories` | [03-categories.md](./03-categories.md) |
| 4 | Products | `/api/v1/products` | [04-products.md](./04-products.md) |
| 5 | Inventory | `/api/v1/inventory` | [05-inventory.md](./05-inventory.md) |
| 6 | Recipes | `/api/v1/recipes` | [06-recipes.md](./06-recipes.md) |
| 7 | Sales | `/api/v1/sales` | [07-sales.md](./07-sales.md) |
| 8 | Cashbox | `/api/v1/cashbox` | [08-cashbox.md](./08-cashbox.md) |
| 9 | Finances | `/api/v1/finances` | [09-finances.md](./09-finances.md) |
| 10 | Equity | `/api/v1/equity` | [10-equity.md](./10-equity.md) |
| 11 | Dashboard | `/api/v1/dashboard` | [11-dashboard.md](./11-dashboard.md) |
| 12 | Alerts | `/api/v1/alerts` | [12-alerts.md](./12-alerts.md) |
| 13 | Reports | `/api/v1/reports` | [13-reports.md](./13-reports.md) |
| 14 | Audit | `/api/v1/audit` | [14-audit.md](./14-audit.md) |
| 15 | Catalog | `/api/v1/catalog` | [15-catalog.md](./15-catalog.md) |

## Códigos HTTP

| Código | Significado |
|--------|-------------|
| 200 | OK |
| 201 | Creado |
| 400 | Bad Request — datos inválidos o faltantes |
| 401 | Unauthorized — token ausente o inválido |
| 403 | Forbidden — rol insuficiente |
| 404 | Not Found |
| 409 | Conflict — recurso duplicado o estado inválido |
| 410 | Gone — endpoint obsoleto |
| 500 | Internal Server Error |

## Notas globales

- **Fechas**: formato `YYYY-MM-DD` o `YYYY-MM-DDTHH:MM:SSZ`
- **Soft delete**: la mayoría de entidades no se eliminan físicamente; se marca `deleted_at`
- **Paginación**: usar `limit` y `offset` donde estén disponibles
- **total_amount en ventas**: el backend lo calcula internamente; no es necesario enviarlo
