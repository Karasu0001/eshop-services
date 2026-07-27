# eshop-front

Aplicación web en React (Vite, JavaScript) que consume los microservicios `Catalog.API`
(catálogo de productos) y `Basket.API` (carrito de compra) del repositorio `eshop-services`.

## Estructura

```
src/
  api/                Clientes HTTP hacia cada microservicio
    http.js            Wrapper fetch (JSON + manejo de errores ProblemDetails)
    catalogApi.js       GET /products
    basketApi.js        GET/POST/DELETE /basket/{userName}
  context/
    CartContext.jsx     Estado global del carrito (usuario simulado + items)
  components/
    Navbar.jsx           Navegación + selector de usuario + contador del carrito
    ProductCard.jsx      Tarjeta de producto con botón "Agregar al carrito"
    Pagination.jsx       Paginación del catálogo
    Loader.jsx / ErrorMessage.jsx
  pages/
    ProductsPage.jsx     Catálogo: búsqueda por nombre + paginado
    CartPage.jsx         Carrito: listar, quitar item, vaciar, total
    NotFoundPage.jsx
```

No hay backend propio de autenticación, por lo que el "usuario" es un nombre simulado
que se guarda en `localStorage` (editable desde la barra de navegación) y se usa como
`userName` — la identidad del carrito en `Basket.API`.

## Requisitos

- Node.js 18+
- Los microservicios `Catalog.API` y `Basket.API` corriendo (ver `docker-compose.override.yml`
  en `eshop-services/eshop-services`), o sus URLs desplegadas.

## Configuración de entorno

Variables usadas por Vite (deben empezar con `VITE_`):

| Variable | Descripción | Valor local por defecto |
|---|---|---|
| `VITE_CATALOG_API_URL` | Base URL de Catalog.API | `http://localhost:8080` |
| `VITE_BASKET_API_URL` | Base URL de Basket.API | `http://localhost:8082` |

Copia `.env.example` a `.env.local` si necesitas sobreescribir los valores de
`.env.development` (por ejemplo, para apuntar a microservicios ya publicados en la nube).

## Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Ese origen (y `5174`, `5175`, `4173`) ya está permitido en el
CORS (`Cors:AllowedOrigins`) de ambas APIs por defecto.

## Build de producción

```bash
npm run build   # genera ./dist
npm run preview # sirve ./dist localmente para probar el build
```

## Publicación en Netlify

1. Sube este proyecto a un repositorio de GitHub (puede ser el mismo repo o uno aparte).
2. En Netlify: **Add new site → Import an existing project** y conecta el repositorio.
3. Configuración de build (Netlify detecta `netlify.toml`, pero verifica):
   - **Base directory**: `eshop-front` (si el repo incluye también el backend en la misma raíz).
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. En **Site settings → Environment variables**, agrega:
   - `VITE_CATALOG_API_URL` → URL pública de Catalog.API (ej. `https://catalog-api.azurewebsites.net`)
   - `VITE_BASKET_API_URL` → URL pública de Basket.API
5. Deploy. `netlify.toml` ya incluye la regla de redirect necesaria para que las rutas de
   `react-router` (ej. `/cart`) funcionen al refrescar o entrar por URL directa.

### Importante: CORS del backend

Antes de que el frontend en Netlify pueda llamar a los microservicios, hay que agregar la
URL pública de Netlify (ej. `https://tu-app.netlify.app`) a `Cors:AllowedOrigins` en el
`appsettings.json` (o variable de entorno equivalente) de **Catalog.API** y **Basket.API**,
y volver a desplegar el backend. Sin este paso, el navegador bloqueará las peticiones aunque
la API responda correctamente (error de CORS, no de red).

## Notas técnicas relevantes para el video explicativo

- **Vertical slice por página**: cada feature (`ProductsPage`, `CartPage`) es autocontenida
  con su propia lógica de datos, en vez de repartir estado global innecesario.
- **Sin endpoint de "actualizar item"**: `Basket.API` solo expone `POST /basket` para
  guardar el carrito completo. Por eso `CartContext` siempre reconstruye el arreglo de
  `items` en el cliente y reenvía el carrito entero (upsert), tanto al agregar como al quitar
  productos.
- **Manejo de carrito inexistente**: `GET /basket/{userName}` responde `404` la primera vez
  que un usuario no tiene carrito creado. `basketApi.js` captura ese caso y devuelve un
  carrito vacío en lugar de propagar el error, para que la UI no muestre un error al usuario
  nuevo.
- **Debounce de búsqueda**: `ProductsPage` espera 300ms tras dejar de escribir antes de
  llamar a `GET /products`, y cancela peticiones en vuelo con `AbortController` si el usuario
  sigue escribiendo.
