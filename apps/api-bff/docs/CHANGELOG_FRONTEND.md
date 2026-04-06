# Cambios de API para Frontend

## Nuevos campos en Productos y Recetas

### Productos (`/api/v1/products`)

Los endpoints existentes de crear y actualizar ahora aceptan dos campos opcionales nuevos:

**`image_url`** — URL de la imagen del producto  
**`description`** — Descripción del producto  
**`show_in_catalog`** — (solo lectura en respuesta) indica si el producto aparece en el catálogo público

```json
// POST /api/v1/products  o  PUT /api/v1/products/:id
{
  "name": "Rosa Roja",
  "category_id": 1,
  "unit_of_measure": "unidad",
  "cost_price": 9.5,
  "sell_price": 15.99,
  "description": "Rosa roja de tallo largo",         // opcional
  "image_url": "https://ejemplo.com/rosa.jpg"        // opcional, debe ser URL válida
}
```

### Recetas (`/api/v1/recipes`)

Igual que productos, ahora aceptan:

**`image_url`** — URL de la imagen de la receta  
**`show_in_catalog`** — (solo lectura en respuesta) indica si la receta aparece en el catálogo público

```json
// POST /api/v1/recipes  o  PUT /api/v1/recipes/:id
{
  "name": "Arreglo Primaveral",
  "description": "Arreglo con flores de temporada",
  "image_url": "https://ejemplo.com/arreglo.jpg",    // opcional, debe ser URL válida
  "ingredients": [...]
}
```

---

## Catálogo Público (sin autenticación)

Dos endpoints nuevos que no requieren token. Pensados para el frontend público / landing page.

### `GET /api/v1/catalog/products`

Devuelve los productos marcados como visibles en el catálogo.

**Headers:** ninguno requerido

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Rosa Roja",
      "description": "Rosa roja de tallo largo",
      "price": "15.99",
      "image_url": "https://ejemplo.com/rosa.jpg"
    }
  ]
}
```

> Solo aparecen productos con `show_in_catalog = true` y sin `deleted_at`.

---

### `GET /api/v1/catalog/recipes`

Devuelve las recetas marcadas como visibles en el catálogo.

**Headers:** ninguno requerido

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Arreglo Primaveral",
      "description": "Arreglo con flores de temporada",
      "price": "89.90",
      "image_url": "https://ejemplo.com/arreglo.jpg"
    }
  ]
}
```

> Solo aparecen recetas con `show_in_catalog = true`, `is_active = true` y sin `deleted_at`.

---

## Gestión de Visibilidad en Catálogo (panel admin)

Endpoints para que admin o empleado controlen qué aparece en el catálogo público.

### `PATCH /api/v1/products/:id/catalog`

**Auth:** Bearer token requerido — roles: `admin`, `warehouse`

**Body:**
```json
{ "show_in_catalog": true }
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "5",
    "name": "Rosa Roja",
    "show_in_catalog": true
  }
}
```

---

### `PATCH /api/v1/recipes/:id/catalog`

**Auth:** Bearer token requerido — roles: `admin`, `warehouse`

**Body:**
```json
{ "show_in_catalog": false }
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "3",
    "name": "Arreglo Primaveral",
    "show_in_catalog": false
  }
}
```

---

## Resumen de endpoints nuevos

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/v1/catalog/products` | No | Catálogo público de productos |
| GET | `/api/v1/catalog/recipes` | No | Catálogo público de recetas |
| PATCH | `/api/v1/products/:id/catalog` | Sí (admin/warehouse) | Activar/desactivar producto en catálogo |
| PATCH | `/api/v1/recipes/:id/catalog` | Sí (admin/warehouse) | Activar/desactivar receta en catálogo |

## Campos nuevos en formularios existentes

| Campo | Recurso | Tipo | Requerido | Validación |
|-------|---------|------|-----------|------------|
| `image_url` | Producto | string | No | URL válida, máx 500 chars |
| `description` | Producto | string | No | máx 500 chars |
| `image_url` | Receta | string | No | URL válida, máx 500 chars |
