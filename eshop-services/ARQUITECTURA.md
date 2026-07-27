# eShop Services — Documentación de Arquitectura

Proyecto de microservicios en **.NET 9** que implementa un sistema de e-commerce (catálogo de productos + carrito de compras) usando **Minimal APIs**, patrón **CQRS**, **Vertical Slice Architecture** y contenedores Docker.

---

## 1. Vista general del sistema

```
┌─────────────────┐        ┌─────────────────┐
│   Catalog.API    │        │   Basket.API     │
│  (puerto 8080)    │        │  (puerto 8082)    │
│  Minimal API/     │        │  Minimal API/      │
│  Carter + MediatR │        │  Carter + MediatR  │
└────────┬─────────┘        └────────┬─────────┘
         │ Marten (Postgres)         │ Marten (Postgres)   ┌───────────┐
         ▼                           ▼                     │  Redis     │
┌─────────────────┐        ┌─────────────────┐            │ (cache)    │
│   catalogdb      │        │   basketdb        │◄─────────┤ puerto 6379│
│ postgres:15       │        │ postgres:15        │         └───────────┘
│ puerto 5433→5432 │        │ puerto 5434→5432  │
└─────────────────┘        └─────────────────┘
```

Cada microservicio es dueño de su propia base de datos (**Database per Service**), no hay una base de datos compartida. `Basket.API` además usa **Redis** como caché distribuida delante de Postgres.

### Contenedores en ejecución (`docker ps`)

| Container       | Imagen           | Puertos host→contenedor | Rol                                   |
|-----------------|------------------|--------------------------|----------------------------------------|
| `catalog.api`   | `catalogapi:dev` | `8080:8080`               | API de catálogo de productos           |
| `basket.api`    | `basketapi:dev`  | `8082:8080`               | API de carrito de compras              |
| `catalogdb`     | `postgres:15`    | `5433:5432`               | Base de datos del catálogo             |
| `basketdb`      | `postgres:15`    | `5434:5432`               | Base de datos del carrito              |
| `redis`         | `redis:7.4`      | `6379:6379`               | Caché distribuida para Basket.API      |

> Nota: ambos servicios exponen internamente el puerto `8080` (estándar de las imágenes ASP.NET Core en Linux); el mapeo a `8082` en el host para `basket.api` evita el choque de puertos con `catalog.api`.

---

## 2. Docker Compose

El proyecto usa el patrón estándar de Visual Studio de **compose base + override**:

- **`docker-compose.yml`** (base, se usa en CI/producción): solo declara las imágenes de las bases de datos y los volúmenes nombrados (`catalogdbdata`, `posgres_basket`), sin credenciales ni puertos — pensado para combinarse con configuración de entorno real.
- **`docker-compose.override.yml`** (desarrollo local, se combina automáticamente con el anterior): añade credenciales, mapeo de puertos, variables de entorno y construcción (`build:`) de las imágenes de las APIs. Es el que efectivamente se usa al correr `docker compose up` en local.
- **`docker-compose.dcproj`**: proyecto de Visual Studio que orquesta el ciclo de vida de Docker Compose desde el IDE (F5 con "Docker Compose" como proyecto de inicio).

### Servicios definidos (override)

```yaml
catalogdb   # postgres:15 — user/pass "postgres", DB "CatalogDb", puerto host 5433
basketdb    # postgres:15 — user/pass "postgres", DB "BasketDb",  puerto host 5434
catalog.api # build desde src/Catalog.API/Dockerfile, puerto host 8080, depende de catalogdb
redis       # redis:7.4 — puerto host 6379
basket.api  # build desde src/Basket/Basket.API/Dockerfile, puerto host 8082, depende de basketdb y redis
```

Variables de entorno clave inyectadas por Compose (sobrescriben `appsettings.json` gracias a la convención de configuración jerárquica de .NET, donde `__` representa anidamiento):

- `ASPNETCORE_ENVIRONMENT=Development`
- `ConnectionStrings__Database` → cadena de conexión Postgres (usa el nombre del **servicio** Compose como host, ej. `catalogdb`, no `localhost`, porque los contenedores se resuelven por nombre dentro de la red interna de Docker).
- `ConnectionStrings__Redis=redis:6379` (solo en `basket.api`).

### Dockerfile (multi-stage build)

Ambos servicios (`src/Catalog.API/Dockerfile` y `src/Basket/Basket.API/Dockerfile`) siguen el mismo patrón de **build multi-etapa**:

1. **`base`**: imagen runtime `mcr.microsoft.com/dotnet/aspnet:9.0`, expone los puertos `8080`/`8081`, corre como usuario no-root (`$APP_UID`).
2. **`build`**: imagen SDK `mcr.microsoft.com/dotnet/sdk:9.0`, copia únicamente los `.csproj` primero (de la API y de `BuildingBlocks`) y ejecuta `dotnet restore` — esto aprovecha el **caché de capas de Docker**: si el código cambia pero no las dependencias, no se re-descargan paquetes NuGet.
3. **`publish`**: ejecuta `dotnet publish` en modo Release generando el artefacto final optimizado (sin host ejecutable, `UseAppHost=false`, porque se ejecuta vía `dotnet <dll>`).
4. **`final`**: parte de `base` (runtime liviano, sin SDK) y copia solo el resultado publicado — reduce el tamaño de la imagen final al no incluir herramientas de compilación.

El `context: .` en Compose apunta a la raíz del repo (no a la carpeta del proyecto) para poder incluir `BuildingBlocks` como dependencia compartida en el `COPY`.

---

## 3. Servicios (microservicios)

### 3.1 Catalog.API — Catálogo de productos

**Responsabilidad**: CRUD de productos del catálogo.

| Endpoint | Método | Descripción |
|---|---|---|
| `/products` | `POST` | Crear producto |
| `/products` | `GET` | Listar productos (filtro por `name`, paginado `pageIndex`/`pageSize`) |
| `/products/{id}` | `PUT` | Actualizar producto |
| `/products/{id}` | `DELETE` | Eliminar producto |

**Modelo `Product`**: `Id (Guid)`, `Name`, `Descripcion`, `Category (List<string>)`, `ImageFiles`, `Price (decimal)`.

**Persistencia**: [Marten](https://martendb.io/) sobre PostgreSQL — Postgres se usa como **base de datos de documentos** (JSON), no como tabla relacional tradicional; Marten serializa el objeto `Product` completo a una columna `JSONB`.

### 3.2 Basket.API — Carrito de compras

**Responsabilidad**: gestionar el carrito de compras por usuario, con caché en Redis delante de Postgres.

| Endpoint | Método | Descripción |
|---|---|---|
| `/basket` | `POST` | Crear/actualizar carrito |
| `/basket/{userName}` | `GET` | Obtener carrito por usuario |
| `/basket/{userName}` | `DELETE` | Eliminar carrito |

**Modelos**:
- `ShoppingCart`: `UserName` (identidad del documento en Marten), `Items (List<ShoppingCartItem>)`, `TatalPrice` (propiedad calculada = suma de `Price * Quantity`).
- `ShoppingCartItem`: `ProductId`, `ProductName`, `Color`, `Price`, `Quantity`.

### 3.3 BuildingBlocks — Librería compartida

Proyecto `.csproj` de clase, referenciado por ambas APIs (`ProjectReference`), que contiene código transversal reutilizable:

- **`CQRS/`**: interfaces base `ICommand`, `ICommandHandler`, `IQuery`, `IqueryHandler` sobre MediatR.
- **`Behaviors/`**: `LoggingBehavior` y `ValidationBehavior` (pipeline behaviors de MediatR, ver §5).
- **`Exceptions/`**: excepciones de dominio (`NotFoundException`, `BadRequestException`, `InternalServerException`) y `CustomExceptionHandler` (middleware global de manejo de errores → `ProblemDetails`).

---

## 4. Redis en este proyecto

### ¿Qué es Redis?
**Redis** (*REmote DIctionary Server*) es una base de datos en memoria de tipo **clave-valor**, usada típicamente como caché distribuida, broker de mensajes o almacén de sesiones. Al vivir en memoria RAM, sus lecturas/escrituras son órdenes de magnitud más rápidas que una base de datos en disco como Postgres, a cambio de durabilidad más débil (aunque soporta persistencia opcional a disco).

### Rol específico en `Basket.API`
Redis actúa como **caché de lectura/escritura (cache-aside pattern)** delante de la base de datos real (Postgres vía Marten), implementado con el patrón **Decorator**:

```csharp
builder.Services.AddScoped<IBasketRepository, BasketRepository>();
builder.Services.Decorate<IBasketRepository, CacheBasketRepository>();
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
});
```

- **`BasketRepository`**: implementación "real", habla directamente con Postgres a través de una sesión de Marten (`IDocumentSession`).
- **`CacheBasketRepository`**: **decora** (envuelve) a `BasketRepository` implementando la misma interfaz `IBasketRepository`, interceptando cada llamada para pasar primero por Redis.
- **`Scrutor`** (paquete NuGet) es la librería que habilita `.Decorate<TInterface, TDecorator>()` sobre el contenedor de inyección de dependencias nativo de .NET, ya que este último no soporta decoración de servicios de forma nativa.

**Flujo de `GetBasket` (cache-aside)**:
1. Buscar el carrito en Redis con clave = `userName`.
2. Si existe (`cache hit`) → deserializar JSON y devolver directo, sin tocar Postgres.
3. Si no existe (`cache miss`) → consultar Postgres, y luego **poblar Redis** con el resultado para la próxima consulta.

**Flujo de `StoreBasket`** (write-through): escribe primero en Postgres (fuente de verdad) y luego actualiza la misma clave en Redis, manteniendo ambos sincronizados.

**Flujo de `DeleteBasket`**: elimina de Postgres y también invalida (`RemoveAsync`) la entrada correspondiente en Redis, para no servir datos obsoletos (*stale data*).

La serialización usa `System.Text.Json` — el objeto `ShoppingCart` se guarda como **string JSON** bajo la API `IDistributedCache` (abstracción estándar de .NET para cachés distribuidas; `StackExchangeRedisCache` es la implementación concreta que habla el protocolo RESP de Redis).

**Conexión**: `ConnectionStrings__Redis` → en Docker Compose es `redis:6379` (nombre del servicio + puerto interno del contenedor); en ejecución local sin contenedores es `localhost:6379` (ver `appsettings.json` de `Basket.API`).

---

## 5. Terminología técnica (glosario)

| Término | Definición | Uso en este proyecto |
|---|---|---|
| **Minimal API** | Estilo de ASP.NET Core (desde .NET 6) para definir endpoints HTTP con la mínima cantidad de código boilerplate, sin necesidad de Controllers ni atributos MVC. | Ambas APIs usan `app.MapGet/MapPost/...` a través de Carter en lugar de Controllers tradicionales. |
| **Carter** | Framework que organiza los endpoints de Minimal API en módulos (`ICarterModule`), evitando que todos los `Map*` vivan en `Program.cs`. Se auto-descubre y registra vía `AddCarter()` / `MapCarter()`. | Cada feature (ej. `CreateProductEndpoint`, `GetBasketEndPoint`) implementa `ICarterModule`. |
| **CQRS** (*Command Query Responsibility Segregation*) | Patrón que separa las operaciones de **escritura** (Commands: crean/modifican estado, no retornan datos de dominio) de las de **lectura** (Queries: solo leen, no modifican estado). | `ICommand`/`ICommandHandler` para crear/borrar; `IQuery`/`IqueryHandler` para consultar. Definidos en `BuildingBlocks.CQRS`. |
| **MediatR** | Librería que implementa el patrón **Mediator**: en vez de que el endpoint llame directamente a la lógica de negocio, envía un mensaje (`ISender.Send(command)`) que MediatR enruta al `Handler` correspondiente. Desacopla el endpoint de la implementación. | Todo endpoint HTTP delega en `sender.Send(...)`. |
| **Pipeline Behavior** | Middleware específico de MediatR que se ejecuta *alrededor* de cada Handler (como una cebolla/onion), permitiendo lógica transversal sin tocar cada Handler individualmente. | `LoggingBehavior` (loggea entrada/salida y advierte si un request tarda más de 3s) y `ValidationBehavior` (ejecuta validadores de FluentValidation antes del Handler y lanza excepción si fallan). Registrados con `cfg.AddOpenBehavior(...)`. |
| **Vertical Slice Architecture** | Organizar el código por **feature** (ej. `StoreBasket/`, `GetProducts/`) conteniendo juntos endpoint + comando/query + handler + validador, en lugar de por capa técnica (`Controllers/`, `Services/`, `Repositories/`). | Carpetas como `Basket/StoreBasket/` agrupan `StoreBasketCommand`, `StoreBasketCommandHandler`, `StoreBasketEndPoint` y el validador. |
| **Marten** | ORM/librería que convierte PostgreSQL en una **base de datos de documentos** (similar a MongoDB), serializando objetos .NET completos como `JSONB`, sin necesitar mapeo objeto-relacional tradicional (EF-like). | `AddMarten(...).UseLightweightSessions()`; acceso vía `IDocumentSession` (`session.Store`, `session.LoadAsync`, `session.Query<T>()`). |
| **`IDocumentSession`** | Unidad de trabajo (*Unit of Work*) de Marten: acumula cambios en memoria y los persiste atómicamente al llamar `SaveChangesAsync()`. | Usado en `BasketRepository` y `GetProductsQueryHandler`. |
| **Decorator Pattern** | Patrón estructural GoF: envolver una implementación con otra que comparte la misma interfaz, añadiendo comportamiento (ej. caché, logging) sin modificar la clase original ni a sus consumidores. | `CacheBasketRepository` decora a `BasketRepository`, ambos implementan `IBasketRepository`. |
| **Scrutor** | Librería NuGet que extiende el contenedor DI de .NET con capacidades de *decoración* (`.Decorate<T,TImpl>()`) y *escaneo/registro por convención de ensamblados*. | Habilita `services.Decorate<IBasketRepository, CacheBasketRepository>()`. |
| **Cache-Aside** (*Lazy loading*) | Patrón de caché donde la aplicación consulta primero la caché; si falla (*miss*), consulta el origen de datos y **luego** escribe el resultado en caché para próximas lecturas. | Implementado en `CacheBasketRepository.GetBasket`. |
| **`IDistributedCache`** | Abstracción de .NET para cachés compartidas entre múltiples instancias/procesos de una app (a diferencia de `IMemoryCache`, que es local a un solo proceso). | Interfaz inyectada en `CacheBasketRepository`; su implementación concreta es Redis. |
| **StackExchange.Redis** | Cliente .NET de facto para hablar con Redis usando el protocolo RESP. `Microsoft.Extensions.Caching.StackExchangeRedisCache` es el paquete que adapta ese cliente a la interfaz `IDistributedCache`. | Paquete NuGet en `Basket.API.csproj`; configurado con `AddStackExchangeRedisCache`. |
| **FluentValidation** | Librería para definir reglas de validación de forma declarativa y fluida (`RuleFor(x => x.Prop).NotEmpty()...`) en lugar de Data Annotations. | `StoreBasketCommandvalidator` valida que el carrito y el nombre de usuario no sean nulos/vacíos. |
| **Mapster** | Librería de *object-to-object mapping* (similar a AutoMapper pero orientada a rendimiento vía generación de código), usada para transformar DTOs de request/response en Commands/Results y viceversa. | `request.Adapt<StoreBasketCommand>()`, `result.Adapt<StoreBasketResponse>()`. |
| **`ProblemDetails`** (RFC 7807) | Estándar HTTP para representar errores de API de forma estructurada y consistente (`title`, `status`, `detail`, `instance`, extensiones). | Generado por `CustomExceptionHandler` para cualquier excepción no controlada, con `traceId` y errores de validación anexados. |
| **`IExceptionHandler`** | Interfaz de ASP.NET Core (desde .NET 8) para centralizar el manejo de excepciones no controladas en un solo punto, en vez de usar `try/catch` en cada endpoint. | `CustomExceptionHandler`, registrado con `AddExceptionHandler<T>()` y activado con `app.UseExceptionHandler(...)`. |
| **CORS** (*Cross-Origin Resource Sharing*) | Mecanismo del navegador que restringe qué orígenes (dominios/puertos) pueden consumir una API vía JavaScript; se configura del lado servidor qué orígenes están permitidos. | Política `"Frontend"` que permite explícitamente los orígenes del frontend en desarrollo (`localhost:5173-5175`, `4173`, típicos de Vite). |
| **Multi-stage build** | Técnica de Dockerfile que usa varias instrucciones `FROM` en un mismo archivo para separar el entorno de compilación (pesado, con SDK) del entorno de ejecución final (liviano, solo runtime), reduciendo el tamaño de la imagen. | Ver Dockerfiles de ambas APIs (§2). |
| **Database per Service** | Patrón de microservicios donde cada servicio tiene su propia base de datos exclusiva, sin acceso directo de otros servicios a ella, para mantener bajo acoplamiento. | `catalogdb` solo la usa `Catalog.API`; `basketdb` solo la usa `Basket.API`. |
| **`GlobalUsing.cs`** | Archivo de directivas `global using` que aplican a todo el proyecto, evitando repetir `using` en cada archivo. | Ambas APIs importan globalmente `Carter`, `MediatR`, `Marten`, `BuildingBlocks.CQRS`. |

---

## 6. `Program.cs` — arranque de cada servicio

### Catalog.API (`src/Catalog.API/Program.cs`)
```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));
builder.Services.AddCarter();

builder.Services.AddMarten(opts =>
{
    opts.Connection(builder.Configuration.GetConnectionString("Database")!);
}).UseLightweightSessions();

builder.Services.AddCors(options => { /* política "Frontend" */ });

builder.Services.AddExceptionHandler<CustomExceptionHandler>();
builder.Services.AddProblemDetails();

var app = builder.Build();
app.UseCors("Frontend");
app.MapCarter();              // registra todos los ICarterModule del ensamblado
app.UseExceptionHandler(options => { });
app.Run();
```
Configuración mínima: MediatR + Carter + Marten (Postgres) + CORS + manejo de excepciones. **No usa Redis.**

### Basket.API (`src/Basket/Basket.API/Program.cs`)
```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCarter();
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly);
    cfg.AddOpenBehavior(typeof(LoggingBehavior<,>));     // pipeline: logging
    cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));  // pipeline: validación
});
builder.Services.AddValidatorsFromAssembly(typeof(Program).Assembly);

builder.Services.AddMarten(opts =>
{
    opts.Connection(builder.Configuration.GetConnectionString("Database")!);
    opts.Schema.For<ShoppingCart>().Identity(x => x.UserName); // UserName como PK del documento
}).UseLightweightSessions();

builder.Services.AddScoped<IBasketRepository, BasketRepository>();
builder.Services.Decorate<IBasketRepository, CacheBasketRepository>(); // Decorator + Redis
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
});

builder.Services.AddCors(options => { /* política "Frontend" */ });

builder.Services.AddExceptionHandler<CustomExceptionHandler>();
builder.Services.AddProblemDetails();

var app = builder.Build();
app.UseCors("Frontend");
app.MapCarter();
app.UseExceptionHandler(options => { });
app.Run();
```
Diferencia clave frente a Catalog.API: agrega **pipeline behaviors** de MediatR (logging + validación), **FluentValidation**, y el stack de **caché con Redis vía Decorator**. También fija explícitamente la identidad del documento Marten (`UserName` como clave, en vez del `Id: Guid` por defecto que usa `Product`).

---

## 7. Resumen de puertos

| Servicio     | Puerto contenedor | Puerto host | Protocolo/uso                          |
|--------------|--------------------|-------------|------------------------------------------|
| catalog.api  | 8080               | 8080        | HTTP REST (productos)                    |
| basket.api   | 8080               | 8082        | HTTP REST (carrito)                      |
| catalogdb    | 5432               | 5433        | PostgreSQL (Marten)                      |
| basketdb     | 5432               | 5434        | PostgreSQL (Marten)                      |
| redis        | 6379               | 6379        | RESP (caché distribuida `IDistributedCache`) |

---

## 8. Stack tecnológico resumido

- **.NET 9** / ASP.NET Core Minimal APIs
- **Carter** — enrutamiento modular de Minimal APIs
- **MediatR** — mediador para CQRS y pipeline behaviors
- **FluentValidation** — validación declarativa de comandos
- **Marten** — persistencia de documentos sobre PostgreSQL
- **Mapster** — mapeo objeto-objeto (DTO ↔ Command/Result)
- **Scrutor** — decoración de servicios en el contenedor DI
- **StackExchange.Redis** (`Microsoft.Extensions.Caching.StackExchangeRedisCache`) — caché distribuida
- **PostgreSQL 15** — motor de base de datos (uno por servicio)
- **Redis 7.4** — caché en memoria
- **Docker / Docker Compose** — contenerización y orquestación local

---

## 9. Despliegue en la nube

El detalle completo de cómo está desplegado el proyecto en producción (Azure App Service, Neon, Upstash, Netlify, variables de entorno, CORS) vive en **[`DESPLIEGUE.md`](../DESPLIEGUE.md)**, en la raíz del repositorio (documenta tanto el backend como el frontend, por eso no está anidado aquí dentro de `eshop-services/`).

Nota rápida: el despliegue final **no usa Docker/contenedores** — se evaluó Azure Container Apps + Container Registry primero, pero se descartó por restricciones de la suscripción usada (Azure for Students bloquea `ACR Tasks` y ciertas regiones). Catalog.API y Basket.API terminaron publicados como **código** (no contenedor) en Azure App Service (Linux), vía Visual Studio. `docker-compose.override.yml` sigue vigente solo para desarrollo local.
