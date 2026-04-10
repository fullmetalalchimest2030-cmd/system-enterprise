# Módulo: CATEGORIES — Categorías

**Ruta base:** `/api/v1/categories`

## Descripción general

Gestiona las categorías de productos y recetas. Las categorías se eliminan de forma lógica.
Incluye un contador de productos activos asociados a cada categoría.

---

## Endpoints

| Método | Ruta | Descripción | Rol requerido |
|--------|------|-------------|---------------|
| GET | `/categories` | Listar todas las categorías | Autenticado |
| GET | `/categories/:id` | Obtener categoría por ID | Autenticado |
| POST | `/categories` | Crear nueva categoría | `admin` |
| PUT | `/categories/:id` | Actualizar categoría | `admin` |
| DELETE | `/categories/:id` | Eliminar categoría (soft delete) | `admin` |

---

## Objeto Categoría

```json
{
  "id": 1,
  "name": "Ramos",
  "description": "Ramos para eventos y decoración",
  "product_count": 12,
  "created_at": "2024-01-01T00:00:00.000Z",
  "deleted_at": null
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID único de la categoría |
| `name` | string | Nombre de la categoría |
| `description` | string \| null | Descripción opcional |
| `product_count` | number | Cantidad de productos activos en esta categoría |
| `created_at` | string (ISO) | Fecha de creación |
| `deleted_at` | string \| null | Fecha de eliminación lógica |

---

## GET /categories

Lista todas las categorías activas (no eliminadas), ordenadas alfabéticamente.

### Response 200
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Flores",
      "description": "Flores individuales y por docena",
      "product_count": 8,
      "created_at": "2024-01-01T00:00:00.000Z",
      "deleted_at": null
    },
    {
      "id": 2,
      "name": "Ramos",
      "description": "Ramos armados para eventos",
      "product_count": 5,
      "created_at": "2024-01-02T00:00:00.000Z",
      "deleted_at": null
    }
  ]
}
```

---

## GET /categories/:id

Obtiene una categoría específica por su ID.

### Path Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | number | ID de la categoría |

### Response 200
```json
{
  "success": true,
  "message": "Category retrieved successfully",
  "data": {
    "id": 1,
    "name": "Flores",
    "description": "Flores individuales y por docena",
    "product_count": 8,
    "created_at": "2024-01-01T00:00:00.000Z",
    "deleted_at": null
  }
}
```

### Errores posibles
| Código | Mensaje |
|--------|---------|
| 404 | `Category not found` |

---

## POST /categories

Crea una nueva categoría. Solo `admin`.

### Request Body
```json
{
  "name": "string (requerido) — nombre único de la categoría",
  "description": "string (opcional)"
}
```

### Ejemplo de request
```json
{
  "name": "Plantas",
  "description": "Plantas de interior y exterior"
}
```

### Response 201
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "id": 4,
    "name": "Plantas",
    "description": "Plantas de interior y exterior",
    "product_count": 0,
    "created_at": "2024-01-20T10:00:00.000Z",
    "deleted_at": null
  }
}
```

### Errores posibles
| Código | Mensaje |
|--------|---------|
| 400 | `name` requerido |
| 409 | Nombre de categoría ya existe |

---

## PUT /categories/:id

Actualiza una categoría existente. Solo `admin`. Todos los campos son opcionales.

### Path Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | number | ID de la categoría |

### Request Body (todos opcionales)
```json
{
  "name": "string",
  "description": "string"
}
```

### Response 200
```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": {
    "id": 1,
    "name": "Flores Premium",
    "description": "Flores de alta calidad",
    "product_count": 8,
    "created_at": "2024-01-01T00:00:00.000Z",
    "deleted_at": null
  }
}
```

---

## DELETE /categories/:id

Elimina lógicamente una categoría. Solo `admin`.

> **Nota:** Los productos asociados a la categoría no se eliminan automáticamente.

### Response 200
```json
{
  "success": true,
  "message": "Category deleted successfully",
  "data": null
}
```

---

## Ideas de uso para el frontend

```
Selector de categoría en formularios:
- Cargar opciones: GET /categories
- Usar id como valor y name como etiqueta

Gestión de categorías (admin):
- Listar: GET /categories
- Crear: POST /categories
- Editar: PUT /categories/:id
- Eliminar: DELETE /categories/:id

Filtro de productos por categoría:
- Obtener categorías: GET /categories
- Filtrar productos: GET /products/category/:categoryId
```
