# MaruchanMarket — eshop-services

Sistema de e-commerce basado en **microservicios**: catálogo de productos, carrito de compras y **generación de órdenes de compra**, con un frontend en React. Segunda fase del proyecto: incorpora el **Microservicio de Órdenes** (ASP.NET Core Minimal API + MongoDB Atlas) sobre la arquitectura ya existente (Catalog.API, Basket.API, PostgreSQL/Neon, Redis/Upstash).

---

## 1. URLs desplegadas

| Servicio | URL |
|---|---|
| **Frontend** (Netlify) | https://bucolic-travesseiro-a1f32c.netlify.app |
| **Catalog.API** | https://eshop-catalog-api-karasu-hkhfejebgrgde5de.canadacentral-01.azurewebsites.net |
| **Basket.API** | https://eshop-basket-api-karasu-aedzh3bufvd4dydg.canadacentral-01.azurewebsites.net |
| **Order.API** | https://eshop-order-api-karasu-fjdeawhqcyeddrhc.canadacentral-01.azurewebsites.net |

No hay Swagger habilitado. Los contratos de cada endpoint están documentados en este README (§4).

---

## 2. Arquitectura

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Catalog.API   │     │  Basket.API    │     │  Order.API     │
│  PostgreSQL     │     │  PostgreSQL     │◄────┤  MongoDB Atlas  │
│  (Neon)         │     │  (Neon) + Redis │HTTP │  (sin BD propia │
│                 │     │  (Upstash)      │     │   de carritos)  │
└──────┬────────┘     └──────┬────────┘     └────────────────┘
       ▲                       ▲                       ▲
       └───────────────────────┴───────────────────────┘
                    React (Netlify) — fetch HTTP
```

- **Database per Service**: cada microservicio es dueño de su propia base de datos. `Order.API` **no** tiene acceso directo a la base de `Basket.API` — para generar una orden, le consulta el carrito por HTTP (`GET /basket/{userName}`), igual que lo haría el frontend.
- Detalle completo de la arquitectura de código (patrones, librerías, CQRS, etc.): [`eshop-services/ARQUITECTURA.md`](eshop-services/ARQUITECTURA.md).
- Detalle completo del despliegue en la nube (Azure, Neon, Upstash, MongoDB Atlas, Netlify, variables de entorno): [`DESPLIEGUE.md`](DESPLIEGUE.md).

---

## 3. Cómo correr el proyecto en local

### Catalog.API + Basket.API (Docker)
```bash
cd eshop-services
docker compose up -d --build
```
Levanta `catalogdb`, `basketdb`, `distributedcache` (Redis), `catalog.api` (puerto **6003**) y `basket.api` (puerto **6001**).

> Nota: el puerto de `catalog.api` es `6003` y no `6000` — Chrome/Chromium bloquea el puerto `6000` (`ERR_UNSAFE_PORT`, reservado históricamente para X11), así que se cambió para poder probar la app desde el navegador.

### Order.API (código, no usa Docker)
No requiere contenedor — corre igual que se despliega en Azure (código, no imagen). Necesita una base de MongoDB Atlas propia (ver §5 para las variables):

```bash
cd eshop-services/src/Order/Order.API
MongoDb__ConnectionString="<tu-connection-string-de-atlas>" \
MongoDb__DatabaseName="OrderDb" \
Services__BasketApi="http://localhost:6001" \
ASPNETCORE_URLS="http://localhost:6002" \
dotnet run
```
(En Windows/PowerShell usa `$env:VARIABLE="valor"` antes de `dotnet run`, o defínelas en `src/Order/Order.API/Properties/launchSettings.json` / `dotnet user-secrets`.)

### Frontend (React + Vite)
```bash
cd eshop-front
npm install
npm run dev
```
Lee las URLs de las 3 APIs desde `.env.development` (ya apunta a `localhost:6003`, `6001` y `6002`).

---

## 4. Microservicio de Órdenes — contrato de la API

### Modelo

**Order**: `id`, `customerId`, `createdAt`, `status` (`Pending` \| `Confirmed` \| `Cancelled`), `items`, `subtotal`, `tax`, `total`.
**OrderItem**: `productId`, `productName`, `quantity`, `unitPrice`, `lineTotal`.

El impuesto se calcula como **16%** del subtotal (configurable vía `Order__TaxRate`, no requiere cambios de código).

### Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/orders` | Genera una orden a partir del carrito del cliente. Body: `{ "customerId": "...", "basketId": "..." }`. Header opcional `Idempotency-Key`. |
| `GET` | `/api/orders/{id}` | Consulta una orden por su id. |
| `GET` | `/api/orders/customer/{customerId}` | Lista las órdenes de un cliente (array vacío si no tiene, no 404). |
| `GET` | `/api/orders?pageIndex=&pageSize=` | Lista **todas** las órdenes, paginado (endpoint adicional). |
| `PATCH` | `/api/orders/{id}/status` | Cambia el estado. Body: `{ "status": "Confirmed" \| "Cancelled" }`. Valida transición. |
| `GET` | `/api/orders/{id}/pdf` | Genera y devuelve el **comprobante de compra en PDF** de la orden (`Content-Type: application/pdf`), con detalle de productos, cantidades, precios y totales — estilo comprobante de Mercado Libre. Se abre inline en el navegador. |

### Decisiones de diseño / desviaciones del contrato sugerido

- **`basketId`**: el sistema de `Basket.API` no tiene un identificador de carrito independiente — el carrito se identifica únicamente por `userName`. Por eso `basketId` debe ser igual a `customerId` (se valida y rechaza con `400` si no coinciden); en la práctica el frontend siempre manda el mismo valor en ambos campos.
- **Idempotencia**: `POST /api/orders` acepta el header `Idempotency-Key`. Si se repite la misma clave para el mismo `customerId`, la API **no** crea una orden nueva — devuelve la orden ya existente con `200 OK` (en vez de `201 Created`, para que el cliente pueda distinguir una creación real de un reintento).
- **Ciclo de vida**: estados `Pending`, `Confirmed`, `Cancelled`. Únicas transiciones válidas: `Pending → Confirmed` y `Pending → Cancelled`. Cualquier otra transición (incluyendo `Confirmed → Cancelled`) responde `409 Conflict`.
- **Errores**: carrito vacío o inexistente → `400`; producto/cantidad/precio inválido → `400`; orden no encontrada → `404`; transición de estado inválida → `409`; fallo de MongoDB o cualquier error no controlado → `500` con mensaje genérico (nunca se expone el stack trace ni la cadena de conexión al cliente — verificado apagando la base intencionalmente durante las pruebas).
- **Comprobante en PDF**: generado en el momento (no se guarda en Mongo, se re-renderiza cada vez que se pide) a partir de los mismos datos de la orden, usando **QuestPDF**. Incluye encabezado de marca, número de orden, fecha, badge de estado, tabla de productos (cantidad, precio unitario, subtotal por línea) y el desglose de subtotal/impuestos/total — mismo formato tanto si se pide recién creada la orden como después de cambiar su estado.

---

## 5. Variables de entorno — Order.API

| Nombre | Ejemplo / notas |
|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` en Azure, `Development` en local |
| `MongoDb__ConnectionString` | `mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/?appName=Cluster0` — **nunca** se sube al repositorio, solo vive en Application Settings de Azure / variables de entorno locales |
| `MongoDb__DatabaseName` | `OrderDb` |
| `Services__BasketApi` | URL base de Basket.API (local: `http://localhost:6001`; prod: la URL de Azure) |
| `Cors__AllowedOrigins__0`, `__1`, ... | Orígenes permitidos del frontend (local + Netlify) |
| `Order__TaxRate` | Opcional, por defecto `0.16` |

Variables de Catalog.API, Basket.API, y del frontend: ver [`DESPLIEGUE.md`](DESPLIEGUE.md).

---

## 6. Evidencia de pruebas ejecutadas

Todas corridas contra el entorno **desplegado en producción** (Azure + Atlas reales), vía `curl`:

| Prueba | Resultado |
|---|---|
| P1 — Crear orden válida | `201 Created`, orden persistida con subtotal/impuestos/total correctos |
| P2 — Consultar orden | `200 OK`, datos completos |
| P3 — Carrito vacío | `400 Bad Request` |
| P4 — Repetir `Idempotency-Key` | Devuelve la misma orden (`200`), no crea duplicado |
| P5 — `Pending → Confirmed` | `200 OK`, estado actualizado |
| P6 — Transición inválida (`Confirmed → Cancelled`) | `409 Conflict` |
| P7 — MongoDB no disponible (probado en local apagando el contenedor) | `500` con mensaje genérico, sin stack trace ni datos sensibles |
| P8 — Flujo completo en React | Agregar al carrito → "Realizar compra" → confirmación visible → "Mis órdenes" → cambiar estado, todo probado en navegador (local y en el sitio publicado de Netlify) |
| P9 — Comprobante en PDF | `GET /api/orders/{id}/pdf` devuelve `200` con `application/pdf` válido (verificado abriendo el archivo generado); enlace "Ver recibo de compra" probado desde la confirmación de compra y desde "Mis órdenes" |
| CORS | Verificado con header `Origin` del sitio de Netlify contra las 3 APIs |

---

## 7. Stack técnico (Order.API)

ASP.NET Core 9 Minimal API + Carter (mismo patrón que Catalog.API/Basket.API) · MediatR + FluentValidation (pipeline de logging/validación) · MongoDB.Driver oficial · `HttpClient` tipado hacia Basket.API · **QuestPDF** (generación del comprobante en PDF, licencia Community) · Sin Docker en producción (publicado como código vía Visual Studio, igual que los otros dos servicios — ver [`DESPLIEGUE.md`](DESPLIEGUE.md) §2 para el porqué).
