# Módulo: EMPLOYEES — Empleados

**Ruta base:** `/api/v1/employees`

## Descripción general

Gestiona los usuarios del sistema. Cada empleado tiene un rol que determina sus permisos.
Soft delete con restauración. Un empleado no puede eliminarse a sí mismo.

---

## Endpoints

| Método | Ruta | Descripción | Rol requerido |
|--------|------|-------------|---------------|
| GET | `/employees` | Listar empleados | `admin` |
| GET | `/employees/:id` | Obtener empleado por ID | Autenticado |
| POST | `/employees` | Crear empleado | `admin` |
| PUT | `/employees/:id` | Actualizar empleado | Autenticado (solo propio o admin) |
| DELETE | `/employees/:id` | Eliminar (soft delete) | `admin` |
| POST | `/employees/:id/restore` | Restaurar eliminado | `admin` |
| GET | `/employees/:id/performance` | Métricas de rendimiento del mes | Autenticado |
| PUT | `/employees/:id/password` | Cambiar contraseña | Autenticado (solo propio o admin) |

---

## Objeto Empleado

```json
{
  "id": 1,
  "first_name": "Juan",
  "last_name": "Perez",
  "email": "juan@floreria.com",
  "phone": "999999999",
  "role": "admin",
  "is_active": true,
  "created_at": "2024-01-15T10:00:00.000Z",
  "deleted_at": null
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID único |
| `first_name` | string | Nombre |
| `last_name` | string | Apellido |
| `email` | string | Correo (único en el sistema) |
| `phone` | string \| null | Teléfono |
| `role` | string | `admin` \| `cashier` \| `warehouse` |
| `is_active` | boolean | Si el empleado está activo |
| `created_at` | string ISO | Fecha de creación |
| `deleted_at` | string \| null | Fecha de eliminación lógica; `null` = activo |

---

## GET /employees

Lista empleados. Solo `admin`.

### Query Parameters
| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `is_active` | boolean | — | `true` = solo activos, `false` = solo inactivos |
| `show_deleted` | boolean | `false` | `true` = incluir eliminados |
| `limit` | number | — | Máximo de resultados |
| `offset` | number | — | Desplazamiento para paginación |

### Response 200
```json
{
  "success": true,
  "message": "Employees retrieved successfully",
  "data": [
    {
      "id": 1,
      "first_name": "Juan",
      "last_name": "Perez",
      "email": "juan@floreria.com",
      "phone": "999999999",
      "role": "admin",
      "is_active": true,
      "created_at": "2024-01-15T10:00:00.000Z",
      "deleted_at": null
    },
    {
      "id": 2,
      "first_name": "Maria",
      "last_name": "Lopez",
      "email": "maria@floreria.com",
      "phone": "987654321",
      "role": "cashier",
      "is_active": true,
      "created_at": "2024-01-16T09:00:00.000Z",
      "deleted_at": null
    }
  ]
}
```

---

## GET /employees/:id

### Response 200
```json
{
  "success": true,
  "message": "Employee retrieved successfully",
  "data": {
    "id": 2,
    "first_name": "Maria",
    "last_name": "Lopez",
    "email": "maria@floreria.com",
    "phone": "987654321",
    "role": "cashier",
    "is_active": true,
    "created_at": "2024-01-16T09:00:00.000Z",
    "deleted_at": null
  }
}
```

### Errores
| Código | Mensaje |
|--------|---------|
| 404 | `Employee not found` |

---

## POST /employees

Crea un nuevo empleado. Solo `admin`.

### Request Body
```json
{
  "first_name": "string — requerido",
  "last_name": "string — requerido",
  "email": "string — requerido, debe ser único",
  "password": "string — requerido, mínimo 6 caracteres",
  "role": "string — requerido: admin | cashier | warehouse",
  "phone": "string — opcional"
}
```

### Ejemplo
```json
{
  "first_name": "Carlos",
  "last_name": "Gomez",
  "email": "carlos@floreria.com",
  "password": "segura123",
  "role": "warehouse",
  "phone": "976543210"
}
```

### Response 201
```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "id": 5,
    "first_name": "Carlos",
    "last_name": "Gomez",
    "email": "carlos@floreria.com",
    "phone": "976543210",
    "role": "warehouse",
    "is_active": true,
    "created_at": "2024-01-20T09:00:00.000Z",
    "deleted_at": null
  }
}
```

### Errores
| Código | Mensaje |
|--------|---------|
| 400 | `First name, last name, email, and password are required` |
| 400 | `Invalid role. Valid roles are: admin, cashier, warehouse` |
| 400 | `Email already exists` |

---

## PUT /employees/:id

Actualiza datos del empleado. Todos los campos son opcionales.
- Un empleado puede editar sus propios datos.
- Solo `admin` puede cambiar el campo `role`.
- Un admin no puede quitarse a sí mismo el rol `admin`.

### Request Body (todos opcionales)
```json
{
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone": "string",
  "role": "string — solo admin puede cambiar esto",
  "is_active": "boolean"
}
```

### Response 200
```json
{
  "success": true,
  "message": "Employee updated successfully",
  "data": {
    "id": 2,
    "first_name": "Maria Actualizada",
    "last_name": "Lopez",
    "email": "maria@floreria.com",
    "phone": "987654321",
    "role": "cashier",
    "is_active": true,
    "created_at": "2024-01-16T09:00:00.000Z",
    "deleted_at": null
  }
}
```

### Errores
| Código | Mensaje |
|--------|---------|
| 403 | `Not authorized to update this employee` |
| 403 | `Not authorized to change role` |
| 403 | `Cannot change own admin role` |
| 404 | `Employee not found` |

---

## DELETE /employees/:id

Soft delete. Solo `admin`. No se puede eliminar la propia cuenta.

### Response 200
```json
{
  "success": true,
  "message": "Employee deleted successfully",
  "data": null
}
```

### Errores
| Código | Mensaje |
|--------|---------|
| 400 | `Cannot delete your own account` |
| 404 | `Employee not found` |

---

## POST /employees/:id/restore

Restaura un empleado eliminado. Solo `admin`.

### Response 200
```json
{
  "success": true,
  "message": "Employee restored successfully",
  "data": {
    "id": 3,
    "first_name": "Carlos",
    "last_name": "Gomez",
    "email": "carlos@floreria.com",
    "phone": null,
    "role": "warehouse",
    "is_active": true,
    "created_at": "2024-01-10T08:00:00.000Z",
    "deleted_at": null
  }
}
```

### Errores
| Código | Mensaje |
|--------|---------|
| 404 | `Employee not found` |

---

## GET /employees/:id/performance

Métricas de rendimiento del mes actual. Aplica principalmente a cajeros.

### Response 200
```json
{
  "success": true,
  "message": "Performance retrieved successfully",
  "data": {
    "employee_id": 2,
    "role": "cashier",
    "total_sales": 45,
    "total_revenue": 1350.00,
    "period": "current_month"
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `employee_id` | number | ID del empleado |
| `role` | string | Rol del empleado |
| `total_sales` | number | Número de ventas completadas en el mes actual |
| `total_revenue` | number | Monto total vendido en el mes actual |
| `period` | string | Siempre `"current_month"` |

---

## PUT /employees/:id/password

Cambia la contraseña. El empleado puede cambiar la suya propia (requiere `currentPassword`).
Un `admin` puede cambiar la de cualquier empleado sin necesitar la contraseña actual.

### Request Body
```json
{
  "currentPassword": "string — requerido si el usuario cambia su propia contraseña",
  "newPassword": "string — requerido, mínimo 6 caracteres"
}
```

### Response 200
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": null
}
```

### Errores
| Código | Mensaje |
|--------|---------|
| 400 | `Current password is incorrect` |
| 400 | `New password must be at least 6 characters` |
| 403 | `Not authorized to change this password` |
| 404 | `Employee not found` |

---

## Ideas de uso para el frontend

```
Gestión de empleados (admin):
- GET /employees?is_active=true → tabla principal
- GET /employees?show_deleted=true → ver eliminados con opción de restaurar
- POST /employees → formulario de creación
- PUT /employees/:id → edición inline o modal
- DELETE /employees/:id → con confirmación
- POST /employees/:id/restore → botón en tabla de eliminados

Perfil propio:
- GET /employees/:id (id del token) → mostrar datos
- PUT /employees/:id → editar nombre, teléfono
- PUT /employees/:id/password → cambiar contraseña

Dashboard de rendimiento:
- GET /employees/:id/performance → tarjeta con ventas del mes
- Mostrar total_sales y total_revenue
```
