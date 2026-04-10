# Módulo: CATALOG — Catálogo Público

**Ruta base:** `/api/v1/catalog`

## Descripción general

Expone el catálogo público de productos y recetas. Estos endpoints **no requieren autenticación**
y están diseñados para ser consumidos por clientes externos, apps de pedidos, o páginas web públicas.

Solo se muestran los items que tienen `show_in_catalog = true` y no están eliminados.
Para recetas, además deben tener `is_active = true`.

---

## Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/catalog/products` | Catálogo público de productos | No |
| GET | `/catalog/recipes` | Catálogo público de recetas | No |

---

## GET /catalog/products

Devuelve los productos visibles en el catálogo público.

### Response 200
```json
{
  "success": true,
  "message": "Catalog products retrieved successfully",
  "data": [
    {
      "name": "Rosa Roja",
      "description": "Rosa de calidad premium",
      "price": 3.00,
      "image_url": "https://ejemplo.com/rosa.jpg"
    },
    {
      "name": "Tulipán Amarillo",
      "description": null,
      "price": 4.50,
      "image_url": null
    }
  ]
}
```

### Campos de respuesta — cada item
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | string | Nombre del producto |
| `description` | string \| null | Descripción del producto |
| `price` | number | Precio de venta (`sell_price`) |
| `image_url` | string \| null | URL de imagen |

> **Nota:** El catálogo público NO expone `id`, `sku`, `cost_price`, `stock_cached` ni otros datos internos.

---

## GET /catalog/recipes

Devuelve las recetas visibles en el catálogo público (activas y con `show_in_catalog = true`).

### Response 200
```json
{
  "success": true,
  "message": "Catalog recipes retrieved successfully",
  "data": [
    {
      "name": "Ramo Romántico",
      "description": "Ramo con rosas y girasoles para ocasiones especiales",
      "price": 45.00,
      "image_url": "https://ejemplo.com/ramo.jpg"
    },
    {
      "name": "Ramo Primaveral",
      "description": "Ramo colorido con flores de temporada",
      "price": 35.00,
      "image_url": null
    }
  ]
}
```

### Campos de respuesta — cada item
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | string | Nombre de la receta/arreglo |
| `description` | string \| null | Descripción |
| `price` | number | Precio sugerido (`suggested_price`) |
| `image_url` | string \| null | URL de imagen |

> **Nota:** El catálogo público NO expone `id`, `ingredients`, `total_cost` ni datos internos.

---

## Gestión de visibilidad en catálogo

Para controlar qué aparece en el catálogo público, usar los endpoints de los módulos correspondientes:

### Productos
```
PUT /api/v1/products/:id/catalog
PATCH /api/v1/products/:id/catalog

Body: { "show_in_catalog": true }
Roles: admin, warehouse
```

### Recetas
```
PUT /api/v1/recipes/:id/catalog
PATCH /api/v1/recipes/:id/catalog

Body: { "show_in_catalog": true }
Roles: admin, warehouse
```

---

## Ideas de uso para el frontend

```
Página web pública / app de pedidos:
- GET /catalog/products → mostrar productos disponibles con precio
- GET /catalog/recipes → mostrar arreglos disponibles con precio
- No requiere token, accesible sin login

Widget de catálogo en redes sociales:
- Consumir GET /catalog/products y GET /catalog/recipes
- Mostrar imagen, nombre y precio

Panel de administración — gestión del catálogo:
- GET /products → ver todos los productos con show_in_catalog
- PATCH /products/:id/catalog → activar/desactivar visibilidad
- GET /catalog/products → previsualizar cómo se ve el catálogo público

Flujo recomendado para activar un producto en el catálogo:
1. Asegurarse de que el producto tiene image_url y description
2. PATCH /products/:id/catalog con { show_in_catalog: true }
3. Verificar con GET /catalog/products
```
