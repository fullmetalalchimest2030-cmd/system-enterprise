# Módulo: RECIPES — Recetas

**Ruta base:** `/api/v1/recipes`

## Descripción general

Gestiona las recetas de arreglos florales. Una receta define los ingredientes (productos) y sus cantidades.
Al crear una receta, el costo total se calcula automáticamente. Al producir, se descuenta el stock de cada ingrediente.

---

## Endpoints

| Método | Ruta | Descripción | Rol requerido |
|--------|------|-------------|---------------|
| GET | `/recipes` | Listar recetas | Autenticado |
| GET | `/recipes/available` | Recetas producibles con stock actual | Autenticado |
| GET | `/recipes/popular` | Recetas más vendidas | Autenticado |
| GET | `/recipes/category/:categoryId` | Recetas por categoría | Autenticado |
| GET | `/recipes/:id` | Receta por ID con ingredientes | Autenticado |
| POST | `/recipes` | Crear receta | `admin`, `warehouse` |
| PUT | `/recipes/:id` | Actualizar receta | `admin`, `warehouse` |
| DELETE | `/recipes/:id` | Eliminar (soft delete) | `admin` |
| PUT | `/recipes/:id/catalog` | Cambiar visibilidad en catálogo | `admin`, `warehouse` |
| PATCH | `/recipes/:id/catalog` | Cambiar visibilidad en catálogo | `admin`, `warehouse` |
| POST | `/recipes/:recipeId/validate` | Validar si se puede producir | Autenticado |
| POST | `/recipes/:recipeId/produce` | Producir (descuenta stock) | `admin`, `warehouse` |
| POST | `/recipes/calculate-cost` | Calcular costo de ingredientes | Autenticado |

---

## Objeto Receta (listado)

```json
{
  "id": 1,
  "name": "Ramo Romántico",
  "description": "Ramo con rosas y girasoles para ocasiones especiales",
  "category_id": 2,
  "category_name": "Ramos",
  "total_cost": 15.00,
  "suggested_price": 45.00,
  "preparation_time": 20,
  "is_active": true,
  "show_in_catalog": true,
  "image_url": "https://ejemplo.com/ramo.jpg",
  "created_at": "2024-01-01T00:00:00.000Z",
  "deleted_at": null
}
```

## Objeto Receta (detalle — GET /:id)

Incluye el array `ingredients` adicional:

```json
{
  "id": 1,
  "name": "Ramo Romántico",
  "description": "Ramo con rosas y girasoles para ocasiones especiales",
  "category_id": 2,
  "category_name": null,
  "total_cost": 15.00,
  "suggested_price": 45.00,
  "preparation_time": 20,
  "is_active": true,
  "show_in_catalog": true,
  "image_url": null,
  "created_at": "2024-01-01T00:00:00.000Z",
  "deleted_at": null,
  "ingredients": [
    {
      "id": 1,
      "recipe_id": 1,
      "product_id": 3,
      "product_name": "Rosa Roja",
      "quantity": 10,
      "cost_price": 1.50,
      "deleted_at": null
    },
    {
      "id": 2,
      "recipe_id": 1,
      "product_id": 5,
      "product_name": "Girasol",
      "quantity": 3,
      "cost_price": 2.00,
      "deleted_at": null
    }
  ]
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID único de la receta |
| `name` | string | Nombre del arreglo |
| `description` | string \| null | Descripción |
| `category_id` | number \| null | ID de la categoría |
| `category_name` | string \| null | Nombre de la categoría (solo en listado, null en detalle) |
| `total_cost` | number \| null | Costo total calculado de ingredientes |
| `suggested_price` | number \| null | Precio de venta sugerido |
| `preparation_time` | number \| null | Tiempo de preparación en minutos |
| `is_active` | boolean | Si la receta está activa |
| `show_in_catalog` | boolean | Si aparece en el catálogo público |
| `image_url` | string \| null | URL de imagen |
| `created_at` | string ISO | Fecha de creación |
| `deleted_at` | string \| null | Fecha de eliminación lógica |
| `ingredients` | array | Solo en GET /:id — lista de ingredientes |

### Objeto Ingrediente
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID del item de receta |
| `recipe_id` | number | ID de la receta |
| `product_id` | number | ID del producto ingrediente |
| `product_name` | string | Nombre del producto |
| `quantity` | number | Cantidad requerida por unidad de receta |
| `cost_price` | number | Precio de costo actual del producto |
| `deleted_at` | string \| null | Fecha de eliminación del ingrediente |

---

## GET /recipes

### Query Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `is_active` | boolean | `true` = solo activas, `false` = solo inactivas |
| `category_id` | number | Filtrar por categoría |
| `limit` | number | Máximo de resultados |

### Response 200
```json
{
  "success": true,
  "message": "Recipes retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Ramo Romántico",
      "description": "Ramo con rosas y girasoles",
      "category_id": 2,
      "category_name": "Ramos",
      "total_cost": 15.00,
      "suggested_price": 45.00,
      "preparation_time": 20,
      "is_active": true,
      "show_in_catalog": true,
      "image_url": null,
      "created_at": "2024-01-01T00:00:00.000Z",
      "deleted_at": null
    }
  ]
}
```

> El listado **NO incluye** el array `ingredients`. Usar GET /recipes/:id para obtenerlos.

---

## GET /recipes/available

Recetas activas que pueden producirse con el stock actual (todos los ingredientes tienen stock suficiente).

### Response 200
```json
{
  "success": true,
  "message": "Available recipes retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Ramo Romántico",
      "category_id": 2,
      "category_name": "Ramos",
      "total_cost": 15.00,
      "suggested_price": 45.00,
      "is_active": true,
      "show_in_catalog": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "deleted_at": null
    }
  ]
}
```

---

## GET /recipes/popular

Recetas más vendidas basado en historial de ventas.

### Query Parameters
| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `limit` | number | 10 | Máximo de resultados |

### Response 200
```json
{
  "success": true,
  "message": "Popular recipes retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Ramo Romántico",
      "suggested_price": 45.00,
      "sales_count": "28",
      "total_revenue": "1260.00",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID de la receta |
| `name` | string | Nombre |
| `suggested_price` | number | Precio sugerido |
| `sales_count` | string | Unidades vendidas en total |
| `total_revenue` | string | Ingresos totales generados |
| `created_at` | string ISO | Fecha de creación |

---

## GET /recipes/category/:categoryId

Lista recetas de una categoría específica.

### Response 200
Misma estructura que GET /recipes pero filtrado por categoría.

---

## GET /recipes/:id

Receta con todos sus ingredientes.

### Response 200
```json
{
  "success": true,
  "message": "Recipe retrieved successfully",
  "data": {
    "id": 1,
    "name": "Ramo Romántico",
    "description": "Ramo con rosas y girasoles",
    "category_id": 2,
    "category_name": null,
    "total_cost": 15.00,
    "suggested_price": 45.00,
    "preparation_time": 20,
    "is_active": true,
    "show_in_catalog": true,
    "image_url": null,
    "created_at": "2024-01-01T00:00:00.000Z",
    "deleted_at": null,
    "ingredients": [
      {
        "id": 1,
        "recipe_id": 1,
        "product_id": 3,
        "product_name": "Rosa Roja",
        "quantity": 10,
        "cost_price": 1.50,
        "deleted_at": null
      }
    ]
  }
}
```

---

## POST /recipes

Crea una nueva receta. El `total_cost` se calcula automáticamente de los ingredientes.
Si no se envía `suggested_price`, se calcula con un margen del 40% sobre el costo.

### Request Body
```json
{
  "name": "string — requerido",
  "description": "string — opcional",
  "category_id": "number — opcional",
  "suggested_price": "number — opcional (si no se envía, se calcula automáticamente con 40% de margen)",
  "preparation_time": "number — opcional, en minutos",
  "is_active": "boolean — opcional, default: true",
  "image_url": "string — opcional",
  "ingredients": [
    {
      "product_id": "number — requerido",
      "quantity": "number — requerido, cantidad por unidad de receta"
    }
  ]
}
```

### Ejemplo
```json
{
  "name": "Ramo Primaveral",
  "description": "Ramo colorido con flores de temporada",
  "category_id": 2,
  "preparation_time": 15,
  "is_active": true,
  "ingredients": [
    { "product_id": 1, "quantity": 8 },
    { "product_id": 4, "quantity": 5 },
    { "product_id": 6, "quantity": 3 }
  ]
}
```

### Response 201
```json
{
  "success": true,
  "message": "Recipe created successfully",
  "data": {
    "id": 5,
    "name": "Ramo Primaveral",
    "description": "Ramo colorido con flores de temporada",
    "category_id": 2,
    "category_name": null,
    "total_cost": 22.00,
    "suggested_price": 30.80,
    "preparation_time": 15,
    "is_active": true,
    "show_in_catalog": false,
    "image_url": null,
    "created_at": "2024-01-20T10:00:00.000Z",
    "deleted_at": null,
    "ingredients": [
      { "id": 10, "recipe_id": 5, "product_id": 1, "product_name": "Rosa Roja", "quantity": 8, "cost_price": 1.50, "deleted_at": null }
    ]
  }
}
```

### Errores
| Código | Mensaje |
|--------|---------|
| 400 | `Recipe name is required` |

---

## PUT /recipes/:id

Actualiza una receta. Si se envía `ingredients`, **reemplaza completamente** la lista anterior.

### Request Body (todos opcionales)
```json
{
  "name": "string",
  "description": "string",
  "category_id": "number",
  "suggested_price": "number",
  "preparation_time": "number",
  "is_active": "boolean",
  "image_url": "string",
  "ingredients": [
    { "product_id": "number", "quantity": "number" }
  ]
}
```

> Si se envía `ingredients`, el costo total se recalcula automáticamente.
> Si no se envía `ingredients`, los ingredientes existentes no se modifican.

### Response 200
Devuelve la receta actualizada con ingredientes (misma estructura que GET /:id).

---

## DELETE /recipes/:id

Soft delete. Solo `admin`.

### Response 200
```json
{
  "success": true,
  "message": "Recipe deleted successfully",
  "data": null
}
```

---

## PUT/PATCH /recipes/:id/catalog

### Request Body
```json
{
  "show_in_catalog": "boolean — requerido"
}
```

### Response 200
```json
{
  "success": true,
  "message": "Recipe catalog visibility updated",
  "data": {
    "id": 1,
    "name": "Ramo Romántico",
    "show_in_catalog": true
  }
}
```

---

## POST /recipes/:recipeId/validate

Verifica si hay stock suficiente para producir N unidades.

### Request Body
```json
{
  "quantity": "number — opcional, default: 1"
}
```

### Response 200 — puede producir
```json
{
  "success": true,
  "message": "Production validation completed",
  "data": {
    "canProduce": true,
    "recipe": { "id": 1, "name": "Ramo Romántico", "total_cost": 15.00, "suggested_price": 45.00 },
    "total_cost": 30.00,
    "suggested_price": 90.00
  }
}
```

### Response 200 — no puede producir
```json
{
  "success": true,
  "message": "Production validation completed",
  "data": {
    "canProduce": false,
    "recipe": { "id": 1, "name": "Ramo Romántico" },
    "missing": [
      {
        "product_id": 5,
        "product_name": "Girasol",
        "available": 2,
        "requested": 6,
        "reason": "Insufficient stock"
      }
    ]
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `canProduce` | boolean | Si hay stock suficiente para producir |
| `recipe` | object | Datos básicos de la receta |
| `total_cost` | number | Costo total para la cantidad solicitada (solo si canProduce: true) |
| `suggested_price` | number | Precio sugerido para la cantidad (solo si canProduce: true) |
| `missing` | array | Items con stock insuficiente (solo si canProduce: false) |
| `missing[].product_id` | number | ID del ingrediente faltante |
| `missing[].product_name` | string | Nombre del ingrediente |
| `missing[].available` | number | Stock disponible |
| `missing[].requested` | number | Cantidad requerida |
| `missing[].reason` | string | Motivo del fallo |

---

## POST /recipes/:recipeId/produce

Produce N unidades descontando el stock de cada ingrediente. Irreversible.

### Request Body
```json
{
  "quantity": "number — opcional, default: 1"
}
```

### Response 201
```json
{
  "success": true,
  "message": "Recipe produced successfully",
  "data": {
    "recipe": {
      "id": 1,
      "name": "Ramo Romántico",
      "total_cost": 15.00,
      "suggested_price": 45.00,
      "ingredients": [ ... ]
    },
    "quantity_produced": 2,
    "total_cost": 30.00,
    "production_date": "2024-01-20T15:00:00.000Z"
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `recipe` | object | Receta completa con ingredientes |
| `quantity_produced` | number | Unidades producidas |
| `total_cost` | number | Costo total de la producción |
| `production_date` | string ISO | Fecha y hora de la producción |

### Errores
| Código | Mensaje |
|--------|---------|
| 400 | `Insufficient stock for production` |
| 400 | `Recipe is not active` |
| 404 | `Recipe not found` |

---

## POST /recipes/calculate-cost

Calcula el costo de una lista de ingredientes sin crear ningún registro.

### Request Body
```json
{
  "ingredients": [
    {
      "product_id": "number — requerido",
      "quantity": "number — requerido"
    }
  ]
}
```

### Response 200
```json
{
  "success": true,
  "message": "Cost calculation completed",
  "data": {
    "ingredients": [
      {
        "product_id": 1,
        "product_name": "Rosa Roja",
        "quantity": 10,
        "unit_cost": 1.50,
        "subtotal": 15.00
      },
      {
        "product_id": 5,
        "product_name": "Girasol",
        "quantity": 3,
        "unit_cost": 2.00,
        "subtotal": 6.00
      }
    ],
    "totalCost": 21.00,
    "suggestedPrice": 29.40,
    "profitMargin": 8.40,
    "profitPercentage": "40.00"
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ingredients` | array | Desglose por ingrediente |
| `ingredients[].product_id` | number | ID del producto |
| `ingredients[].product_name` | string | Nombre del producto |
| `ingredients[].quantity` | number | Cantidad |
| `ingredients[].unit_cost` | number | Costo unitario del producto |
| `ingredients[].subtotal` | number | quantity × unit_cost |
| `totalCost` | number | Suma de todos los subtotales |
| `suggestedPrice` | number | Precio sugerido (totalCost × 1.4, margen 40%) |
| `profitMargin` | number | suggestedPrice − totalCost |
| `profitPercentage` | string | Porcentaje de ganancia sobre el costo |

---

## Ideas de uso para el frontend

```
Formulario de creación de receta:
1. GET /categories → selector de categoría
2. GET /products → selector de ingredientes
3. POST /recipes/calculate-cost → mostrar costo y precio sugerido en tiempo real
4. POST /recipes → guardar

Pantalla de producción:
1. GET /recipes/available → solo las producibles
2. POST /recipes/:id/validate con quantity → confirmar antes de producir
3. POST /recipes/:id/produce → ejecutar

POS — venta de recetas:
- Usar recipe_id en los items de la venta
- El stock se descuenta automáticamente al crear la venta
- No es necesario llamar a /produce si se vende directamente
```
