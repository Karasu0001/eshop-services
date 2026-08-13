# Despliegue — MaruchanMarket (eshop-services)

Este documento explica **cómo quedó desplegado el proyecto en la nube**: qué servicio aloja cada pieza, cómo se conectan entre sí, y qué variables de entorno hay que configurar para reproducirlo o mantenerlo. Es el punto de referencia si algo se rompe en producción o si hay que volver a desplegar desde cero.

> **Ninguna contraseña ni cadena de conexión real está escrita en este archivo ni en ningún otro del repositorio.** Todo lo sensible vive únicamente en las *Application Settings* de cada App Service en Azure (Configuración → Configuración de la aplicación). Aquí solo se documenta el **formato** y **dónde** está cada cosa.

---

## 1. Arquitectura desplegada

```
┌─────────────────────────┐         ┌──────────────────────────────────┐
│   Netlify (frontend)      │        │        Azure (rg-eshop-services)    │
│   eshop-front (React)     │──HTTPS─▶│                                    │
│   bucolic-travesseiro-    │        │  ┌──────────────────────────┐      │
│   a1f32c.netlify.app      │        │  │ App Service (Linux, código) │      │
└─────────────────────────┘         │  │ eshop-catalog-api-karasu    │──┼──▶ Neon Postgres · catalogdb
                │                     │  └──────────────────────────┘      │
                │                     │  ┌──────────────────────────┐      │
                │                     │  │ App Service (Linux, código) │      │
                │──HTTPS─────────────▶│  │ eshop-basket-api-karasu     │──┼──▶ Neon Postgres · basketdb
                │                     │  └──────────────────────────┘      │
                │                     │              │                     │
                │                     │              └───────────────────┼──▶ Upstash Redis
                │                     │  ┌──────────────────────────┐      │
                └──HTTPS─────────────▶│  │ App Service (Linux, código) │      │
                                      │  │ eshop-order-api-karasu      │──┼──▶ MongoDB Atlas · OrderDb
                                      │  └──────────┬───────────────┘      │
                                      │             └── HTTP interno ──────┼──▶ Basket.API (consulta el carrito)
                                      └──────────────────────────────────┘
```

- **Frontend**: React (Vite) en **Netlify**, build automático desde este repo (rama `main`, carpeta `eshop-front`).
- **Catalog.API**, **Basket.API** y **Order.API**: tres **Azure App Service (Linux) independientes**, cada uno con su propio plan de hosting, publicados como **código (no contenedor)** directamente desde Visual Studio (`Publicar` → Zip Deploy).
- **Bases de datos**: `catalogdb` y `basketdb` (Postgres) viven en el **mismo proyecto de Neon** — cada API solo usa la suya (Database per Service). `Order.API` usa una base separada en **MongoDB Atlas** (`OrderDb`), sin relación con Neon.
- **Redis**: una instancia de **Upstash**, usada solo por Basket.API como caché delante de Postgres.
- `Order.API` no tiene acceso directo a la base de `Basket.API` — para generar una orden le consulta el carrito por HTTP, igual que el frontend (ver README §2).
- Todo vive en el **grupo de recursos `rg-eshop-services`**, suscripción **Azure for Students**.

No hay Docker involucrado en el despliegue final a la nube — el `docker-compose.override.yml` del repo es **solo para desarrollo local**.

---

## 2. Por qué App Service (código) y no contenedores

El plan original era usar **Azure Container Apps** con imágenes Docker construidas en **Azure Container Registry (ACR)**. Se abandonó por dos bloqueos específicos de la suscripción **Azure for Students**:

1. **Región bloqueada**: `East US 2` rechazó la creación de recursos por política de la suscripción (`RequestDisallowedByAzure`). Se resolvió creando el ACR en `East US`.
2. **ACR Tasks deshabilitado**: `az acr build` (compilar la imagen en la nube desde el repo de GitHub) falló con `TasksOperationsNotAllowed` — función bloqueada para este tipo de suscripción, sin importar la región.

En vez de compilar Docker localmente y pelear con credenciales de registro, se cambió de estrategia a **App Service en modo código**: Visual Studio compila el proyecto .NET y lo publica directo (Zip Deploy), sin pasar por Docker en ningún punto del camino a producción. Es más simple y con menos piezas que pueden fallar.

> Quedaron un **Azure Container Registry (`eshopservicesacr`)** y un intento de **Container Apps Environment** creados pero sin usar — se pueden borrar del grupo de recursos si se quiere limpiar/ahorrar cuota, no son necesarios para que el proyecto funcione.

`Order.API` (agregado en la segunda fase del proyecto) se publicó directamente con este mismo método probado — App Service en modo código — sin repetir el intento con Container Apps.

---

## 3. Backend — Azure App Service

| | Catalog.API | Basket.API | Order.API |
|---|---|---|---|
| Nombre del recurso | `eshop-catalog-api-karasu` | `eshop-basket-api-karasu` | `eshop-order-api-karasu` |
| URL pública | `https://eshop-catalog-api-karasu-hkhfejebgrgde5de.canadacentral-01.azurewebsites.net` | `https://eshop-basket-api-karasu-aedzh3bufvd4dydg.canadacentral-01.azurewebsites.net` | `https://eshop-order-api-karasu-fjdeawhqcyeddrhc.canadacentral-01.azurewebsites.net` |
| Región | Canada Central | Canada Central | Canada Central |
| Runtime | .NET 9 (Linux, código — no contenedor) | .NET 9 (Linux, código — no contenedor) | .NET 9 (Linux, código — no contenedor) |
| Método de publicación | Visual Studio → clic derecho en el proyecto → **Publicar** → perfil "Zip Deploy" | Igual | Igual |
| Perfil de publicación | `src/Catalog.API/Properties/PublishProfiles/*.pubxml` (en el repo, sin credenciales) | `src/Basket/Basket.API/Properties/PublishProfiles/*.pubxml` | `src/Order/Order.API/Properties/PublishProfiles/*.pubxml` |

### Application Settings — `eshop-catalog-api-karasu`

Configurar en Azure Portal → App Service → **Configuración → Configuración de la aplicación**:

| Nombre | Valor | Notas |
|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` | |
| `ConnectionStrings__Database` | `Host=<host-neon>;Port=5432;Database=catalogdb;Username=<usuario>;Password=<password>;SSL Mode=Require;Channel Binding=Require` | Ver [§4](#4-bases-de-datos--neon-postgresql) para el host/usuario reales |
| `Cors__AllowedOrigins__0` | `http://localhost:5173` | Para poder probar contra estas APIs desde el frontend corriendo local |
| `Cors__AllowedOrigins__1` | `https://bucolic-travesseiro-a1f32c.netlify.app` | El sitio publicado en Netlify |

### Application Settings — `eshop-basket-api-karasu`

Todo lo anterior (con `Database=basketdb`) más:

| Nombre | Valor | Notas |
|---|---|---|
| `ConnectionStrings__Redis` | `<host-upstash>:6379,password=<password>,ssl=True,abortConnect=False` | Formato de `StackExchange.Redis`, **no** una URL `redis://`. Ver [§5](#5-caché--upstash-redis) |

### Application Settings — `eshop-order-api-karasu`

| Nombre | Valor | Notas |
|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` | |
| `MongoDb__ConnectionString` | `mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/?appName=Cluster0` | Ver [§6](#6-base-de-datos-de-orderapi--mongodb-atlas) |
| `MongoDb__DatabaseName` | `OrderDb` | |
| `Services__BasketApi` | `https://eshop-basket-api-karasu-aedzh3bufvd4dydg.canadacentral-01.azurewebsites.net` | URL pública de Basket.API en Azure (no localhost) |
| `Cors__AllowedOrigins__0` | `http://localhost:5173` | |
| `Cors__AllowedOrigins__1` | `https://bucolic-travesseiro-a1f32c.netlify.app` | |
| `Order__TaxRate` | `0.16` | Opcional, mismo default que en local |

### Puerto / Kestrel

No se configuró `WEBSITES_PORT` en ningún App Service — al ser despliegue de **código** (no contenedor), Azure App Service Linux inyecta automáticamente la variable `PORT`, y `Program.cs` de las tres APIs ya la lee desde antes (código agregado originalmente pensando en Render.com):

```csharp
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}
```

Por eso funcionó sin tocar nada de configuración de puertos.

---

## 4. Bases de datos — Neon PostgreSQL

- **Un solo proyecto/endpoint de Neon**, con **dos bases de datos separadas**: `catalogdb` y `basketdb` (mantiene el patrón Database-per-Service aunque compartan el mismo servidor físico).
- Host del pooler: termina en `...neon.tech` (formato `ep-xxxxxxxx-pooler.c-N.<region>.aws.neon.tech`).
- Usuario: el que Neon asigna por defecto al proyecto (`neondb_owner` o similar).
- **Neon exige SSL** — sin `SSL Mode=Require` la conexión falla. `Channel Binding=Require` coincide con el `channel_binding=require` que trae la cadena de conexión que da Neon por defecto.

Formato completo de connection string (Npgsql/Marten):
```
Host=<host>;Port=5432;Database=<catalogdb|basketdb>;Username=<usuario>;Password=<password>;SSL Mode=Require;Channel Binding=Require
```

**Dónde ver las credenciales reales**: panel de Neon → proyecto → "Connection string" → pestaña ".NET"/Npgsql (te da la versión `postgresql://...` que hay que convertir al formato de arriba — cambiar `Host`/`Username`/`Password`/`Database` según corresponda, agregar `SSL Mode=Require;Channel Binding=Require`).

Verificado en su momento con una conexión real de prueba (`SELECT version()`) contra ambas bases antes de configurarlas en Azure — ambas respondieron con Postgres 15.18.

`Order.API` **no** usa Neon ni ninguna base relacional — ver [§6](#6-base-de-datos-de-orderapi--mongodb-atlas) para su base propia en MongoDB Atlas.

---

## 5. Caché — Upstash Redis

- Una sola base de Redis en Upstash, usada solo por `Basket.API` (cache-aside delante de `basketdb`, ver `ARQUITECTURA.md` §4 para el detalle del patrón).
- Host termina en `...upstash.io`, puerto `6379`, requiere TLS.

Upstash entrega la cadena en formato URI (`rediss://default:<password>@<host>:6379`), pero **`StackExchange.Redis` (el cliente que usa Basket.API) no acepta ese formato** — hay que convertirla a:
```
<host>:6379,password=<password>,ssl=True,abortConnect=False
```

**Dónde ver las credenciales reales**: panel de Upstash → base de datos → pestaña "Connect" → busca el formato para `.NET`/`StackExchange.Redis`, o toma el usuario/password de la URI `rediss://` y arma la cadena con el formato de arriba.

Verificado con `PING` y un `SET`/`GET` de prueba antes de configurarlo en Azure.

---

## 6. Base de datos de Order.API — MongoDB Atlas

- Un solo **cluster de MongoDB Atlas**, con una única base `OrderDb` — sin relación con los clusters de Neon (Database per Service: `Order.API` es dueño exclusivo de esta base).
- Formato de connection string (driver oficial `MongoDB.Driver`):
  ```
  mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/?appName=Cluster0
  ```
- **Network Access de Atlas** debe permitir las conexiones entrantes desde Azure App Service (en un proyecto educativo, lo más simple es `0.0.0.0/0`; para restringir más habría que usar las IPs salientes del App Service, que Azure no garantiza fijas en el plan usado).

**Dónde ver las credenciales reales**: panel de Atlas → cluster → **Connect** → "Drivers" → `.NET` (te da la cadena `mongodb+srv://...` completa con usuario, solo falta rellenar el password del usuario de base de datos que crees en Atlas, no el de tu cuenta).

Variables correspondientes en Azure: `MongoDb__ConnectionString` y `MongoDb__DatabaseName` (ver [§3](#3-backend--azure-app-service)).

---

## 7. Frontend — Netlify

| | Valor |
|---|---|
| URL pública | `https://bucolic-travesseiro-a1f32c.netlify.app` |
| Repositorio conectado | `Karasu0001/eshop-services`, rama `main` |
| Base directory | `eshop-front` |
| Build command | `npm run build` (definido en `eshop-front/netlify.toml`) |
| Publish directory | `dist` (relativo a la base directory) |
| Redirects | `eshop-front/netlify.toml` reescribe todas las rutas a `index.html` (200), necesario porque React Router usa `BrowserRouter` — sin esto, refrescar `/cart` daría 404 |

### Variables de entorno (Netlify → Site settings → Environment variables)

| Nombre | Valor |
|---|---|
| `VITE_CATALOG_API_URL` | `https://eshop-catalog-api-karasu-hkhfejebgrgde5de.canadacentral-01.azurewebsites.net` |
| `VITE_BASKET_API_URL` | `https://eshop-basket-api-karasu-aedzh3bufvd4dydg.canadacentral-01.azurewebsites.net` |
| `VITE_ORDER_API_URL` | `https://eshop-order-api-karasu-fjdeawhqcyeddrhc.canadacentral-01.azurewebsites.net` |

Cada push a `main` en `eshop-front/` dispara un build y deploy automático en Netlify.

---

## 8. CORS

Las tres APIs (.NET) tienen una política de CORS nombrada `"Frontend"` (`Program.cs`) que lee los orígenes permitidos desde `Cors:AllowedOrigins` — en Azure eso se sobreescribe con las variables `Cors__AllowedOrigins__0`, `__1`, etc. (ver [§3](#3-backend--azure-app-service)).

Actualmente permitidos en **las tres** APIs:
- `http://localhost:5173` (desarrollo local del frontend)
- `https://bucolic-travesseiro-a1f32c.netlify.app` (sitio publicado)

Verificado con `curl -H "Origin: https://bucolic-travesseiro-a1f32c.netlify.app"` contra las tres APIs — responden `Access-Control-Allow-Origin` correctamente.

**Si el dominio de Netlify cambia** (o se agrega un dominio propio), hay que agregar el nuevo origen como una variable `Cors__AllowedOrigins__N` más en **las tres** App Service — si falta en cualquiera de las tres APIs, el navegador bloqueará esas peticiones específicas aunque las otras funcionen.

---

## 9. Resumen rápido — qué tocar y dónde

| Quiero cambiar... | Dónde |
|---|---|
| Código del frontend | Push a `main` → Netlify redeploya solo |
| Código de Catalog.API, Basket.API u Order.API | Visual Studio → Publicar (perfil ya guardado) → sube directo a Azure, no hay CI/CD automático |
| Connection string de Catalog.API/Basket.API (Postgres) | Azure Portal → App Service correspondiente → Configuración → `ConnectionStrings__Database` |
| Connection string de Order.API (MongoDB Atlas) | Azure Portal → `eshop-order-api-karasu` → Configuración → `MongoDb__ConnectionString` |
| Credenciales de Redis | Azure Portal → `eshop-basket-api-karasu` → Configuración → `ConnectionStrings__Redis` |
| Orígenes permitidos (CORS) | Azure Portal → **las tres** App Service → Configuración → `Cors__AllowedOrigins__N` |
| Variables del frontend (URLs de API) | Netlify → Site settings → Environment variables → redeploy manual o nuevo push |

---

## 10. Entorno local (para contraste)

El desarrollo local **no usa nada de lo anterior** — corre todo en Docker en la máquina, salvo Order.API:

```bash
cd eshop-services
docker compose up -d --build
```

Levanta `catalogdb` (5433), `basketdb` (5434), `distributedcache`/Redis (6379), `catalog.api` (6003→8080) y `basket.api` (6001→8080).

`Order.API` **no** corre en Docker ni en local ni en producción — se ejecuta como código (`dotnet run`) contra una base de MongoDB Atlas propia; ver README §3 para el comando completo con las variables de entorno necesarias.

El frontend local (`npm run dev` en `eshop-front`) apunta a los tres servicios (`6003`, `6001`, `6002`) vía `.env.development`. Ver `ARQUITECTURA.md` para el detalle completo de la arquitectura de código.
