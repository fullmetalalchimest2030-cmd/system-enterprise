# Módulo: AUTH — Autenticación

**Ruta base:** `/api/v1/auth`

## Descripción general

Gestiona el ciclo de vida de la sesión: login, logout, verificación y renovación de tokens JWT.
`login` y `refresh` no requieren autenticación previa.

---

## Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/auth/login` | Iniciar sesión | No |
| POST | `/auth/logout` | Cerrar sesión e invalidar token | Sí |
| GET | `/auth/verify` | Verificar token y obtener datos del usuario | Sí |
| POST | `/auth/refresh` | Renovar access token con refresh token | No |

---

## POST /auth/login

### Request Body
```json
{
  "email": "string — requerido",
  "password": "string — requerido"
}
```

### Response 200
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "admin@floreria.com",
      "first_name": "Juan",
      "last_name": "Perez",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `data.user.id` | number | ID del usuario |
| `data.user.email` | string | Correo electrónico |
| `data.user.first_name` | string | Nombre |
| `data.user.last_name` | string | Apellido |
| `data.user.role` | string | `admin` \| `cashier` \| `warehouse` |
| `data.token` | string | JWT de acceso (corta duración) — incluir en `Authorization: Bearer <token>` |
| `data.refreshToken` | string | JWT de renovación (larga duración) — guardar para renovar el token |

### Errores
| Código | Mensaje |
|--------|---------|
| 400 | `Email and password are required` |
| 401 | `Invalid credentials` |

---

## POST /auth/logout

Invalida el token actual añadiéndolo a la blacklist del servidor.

### Headers
```
Authorization: Bearer <token>
```

### Request Body
No requiere body.

### Response 200
```json
{
  "success": true,
  "message": "Logout successful",
  "data": null
}
```

---

## GET /auth/verify

Verifica que el token sea válido y no esté en la blacklist. Usar al cargar la app para restaurar sesión.

### Headers
```
Authorization: Bearer <token>
```

### Response 200
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "id": 1,
    "email": "admin@floreria.com",
    "first_name": "Juan",
    "last_name": "Perez",
    "role": "admin"
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `data.id` | number | ID del usuario autenticado |
| `data.email` | string | Correo electrónico |
| `data.first_name` | string | Nombre |
| `data.last_name` | string | Apellido |
| `data.role` | string | Rol: `admin` \| `cashier` \| `warehouse` |

### Errores
| Código | Mensaje |
|--------|---------|
| 401 | Token inválido, expirado o en blacklist |

---

## POST /auth/refresh

Genera un nuevo par de tokens usando el refresh token.

### Request Body
```json
{
  "refreshToken": "string — requerido"
}
```

### Response 200
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `data.token` | string | Nuevo access token |
| `data.refreshToken` | string | Nuevo refresh token |

### Errores
| Código | Mensaje |
|--------|---------|
| 400 | `Refresh token is required` |
| 401 | Token de refresco inválido o expirado |

---

## Flujo recomendado

```
1. Al iniciar la app → GET /auth/verify
   - 200: sesión activa, guardar datos del usuario en estado global
   - 401: redirigir a pantalla de login

2. Login → POST /auth/login
   - Guardar token y refreshToken en almacenamiento seguro (ej: localStorage / SecureStore)

3. Cada request → header: Authorization: Bearer <token>

4. Si una request devuelve 401 → POST /auth/refresh
   - Éxito: reemplazar tokens y reintentar la request original
   - Fallo: limpiar tokens y redirigir a login

5. Logout → POST /auth/logout → limpiar tokens del almacenamiento
```
