# Guía de estudio — MaruchanMarket / eshop-services

Este documento explica **todos los conceptos usados en el proyecto**, empezando desde lo más básico hasta el detalle técnico específico de este código. Pensado para repasar antes de un examen: cada concepto tiene una explicación simple, una analogía si ayuda, y luego "cómo se usa aquí" con el archivo real donde se ve.

---

## Índice

1. [Lo más básico: cliente, servidor y API](#1-lo-más-básico-cliente-servidor-y-api)
2. [Arquitectura de microservicios](#2-arquitectura-de-microservicios)
3. [.NET, C# y ASP.NET Core](#3-net-c-y-aspnet-core)
4. [Minimal APIs y Carter](#4-minimal-apis-y-carter)
5. [CQRS y MediatR](#5-cqrs-y-mediatr)
6. [Pipeline Behaviors (logging y validación automáticos)](#6-pipeline-behaviors-logging-y-validación-automáticos)
7. [Vertical Slice Architecture](#7-vertical-slice-architecture)
8. [Bases de datos: relacional vs documentos (Marten)](#8-bases-de-datos-relacional-vs-documentos-marten)
9. [Redis y el patrón Cache-Aside](#9-redis-y-el-patrón-cache-aside)
10. [El patrón Decorator (y Scrutor)](#10-el-patrón-decorator-y-scrutor)
11. [Mapster (mapeo de objetos)](#11-mapster-mapeo-de-objetos)
12. [Manejo de errores y ProblemDetails](#12-manejo-de-errores-y-problemdetails)
13. [Docker y contenedores](#13-docker-y-contenedores)
14. [Variables de entorno y configuración jerárquica](#14-variables-de-entorno-y-configuración-jerárquica)
15. [CORS](#15-cors)
16. [El frontend: React, Vite y componentes](#16-el-frontend-react-vite-y-componentes)
17. [Context API y hooks de React](#17-context-api-y-hooks-de-react)
18. [Consumir APIs desde el frontend (fetch)](#18-consumir-apis-desde-el-frontend-fetch)
19. [Despliegue en la nube: PaaS vs contenedores](#19-despliegue-en-la-nube-paas-vs-contenedores)
20. [Git y GitHub](#20-git-y-github)
21. [Tabla resumen rápida (repaso de último minuto)](#21-tabla-resumen-rápida-repaso-de-último-minuto)

---

## 1. Lo más básico: cliente, servidor y API

- **Cliente**: el programa que el usuario usa directamente. Aquí es la página web (React) corriendo en el navegador.
- **Servidor**: un programa que está encendido esperando peticiones y respondiendo con datos. Aquí son `Catalog.API` y `Basket.API`.
- **API** (*Application Programming Interface*): la "carta de menú" que expone un servidor — una lista de operaciones que otros programas pueden pedirle, sin necesidad de saber cómo están hechas por dentro. Ejemplo: `GET /products` = "dame la lista de productos".
- **HTTP**: el protocolo (idioma común) que usan cliente y servidor para hablar por internet. Cada petición tiene un **verbo** (qué quiero hacer) y una **URL** (a qué recurso):
  - `GET` → leer/consultar (no cambia nada)
  - `POST` → crear algo nuevo
  - `PUT` → actualizar algo que ya existe
  - `DELETE` → borrar algo
- **API REST**: un estilo de diseñar APIs sobre HTTP donde cada URL representa un "recurso" (ej. `/products`, `/products/{name}`) y el verbo HTTP dice qué operación hacer sobre ese recurso.
- **JSON** (*JavaScript Object Notation*): el formato de texto que se usa para mandar datos entre cliente y servidor. Ejemplo: `{"name": "Maruchan", "price": 12}`. Es el "idioma" en el que viajan los datos dentro de las peticiones HTTP.
- **Código de estado HTTP**: un número que dice cómo salió la petición:
  - `200 OK` → todo bien
  - `201 Created` → se creó algo nuevo
  - `400 Bad Request` → el cliente mandó datos inválidos
  - `404 Not Found` → no existe lo que se pidió
  - `405 Method Not Allowed` → la URL existe, pero no acepta ese verbo (este fue justo el bug que arreglamos: `PUT /products/{name}` no estaba registrado, solo `DELETE`)
  - `500 Internal Server Error` → algo se rompió del lado del servidor

**En este proyecto**: el frontend (cliente) le habla por HTTP a dos servidores (Catalog.API y Basket.API), intercambiando JSON.

---

## 2. Arquitectura de microservicios

Hay dos formas típicas de organizar un backend:

- **Monolito**: una sola aplicación grande que hace todo (productos, carrito, usuarios, pagos...) y usa una sola base de datos.
- **Microservicios**: se divide la aplicación en varios servicios pequeños e independientes, cada uno responsable de **una sola cosa**, que se pueden desplegar y escalar por separado.

**En este proyecto** hay dos microservicios:
- `Catalog.API` → solo se encarga del catálogo de productos.
- `Basket.API` → solo se encarga del carrito de compras.

### Database per Service

Regla importante de microservicios: **cada servicio tiene su propia base de datos**, y ningún otro servicio le puede leer/escribir directamente esa base. Si `Basket.API` necesita saber el precio de un producto, no debería consultar la base de `Catalog.API` directamente — cada quien es dueño de sus datos.

**En este proyecto**: `catalogdb` la usa solo `Catalog.API`, `basketdb` la usa solo `Basket.API`. Por eso cuando agregas un producto al carrito, el frontend le manda el nombre/precio/id ya conocidos, en vez de que `Basket.API` vaya a preguntarle a `Catalog.API`.

**Ventaja**: cada servicio se puede modificar, desplegar y hasta caerse sin afectar a los demás.
**Desventaja**: es más complejo — hay que coordinar varios servicios, y no hay una sola base de datos "de la verdad" con todo junto.

---

## 3. .NET, C# y ASP.NET Core

- **C#**: el lenguaje de programación en el que está escrito todo el backend.
- **.NET**: la plataforma/runtime que ejecuta programas en C# (parecido a como Node.js ejecuta JavaScript). Este proyecto usa **.NET 9**, la versión más reciente en el momento.
- **ASP.NET Core**: el framework (conjunto de herramientas ya hechas) que usa .NET específicamente para construir aplicaciones web y APIs. Se encarga de cosas como: recibir peticiones HTTP, enrutarlas al código correcto, manejar JSON automáticamente, etc.
- **NuGet**: el "gestor de paquetes" de .NET (equivalente a `npm` en JavaScript) — de ahí vienen todas las librerías externas que usa el proyecto (Marten, MediatR, Carter, etc., cada una se agrega al `.csproj` como `<PackageReference>`).

---

## 4. Minimal APIs y Carter

### Minimal API
Antes (en ASP.NET clásico), cada endpoint necesitaba una clase "Controller" con varios atributos. **Minimal API** (desde .NET 6) permite definir un endpoint con muy poco código:

```csharp
app.MapGet("/products", () => "hola");
```

### Carter
Con Minimal API puro, si tienes 20 endpoints, todos terminan amontonados en un solo archivo `Program.cs`. **Carter** es una librería que te deja organizar cada endpoint en su propia clase (`ICarterModule`), y luego los junta automáticamente.

**En este proyecto**: cada operación tiene su propio archivo `*Endpoint.cs` (ej. `CreateProductEndpoint.cs`, `DeleteProductEndpoint.cs`), cada uno implementa `ICarterModule` con un método `AddRoutes`. `builder.Services.AddCarter()` + `app.MapCarter()` en `Program.cs` los descubre y registra todos automáticamente — no hay que listarlos a mano.

---

## 5. CQRS y MediatR

### CQRS (*Command Query Responsibility Segregation*)
Es una regla de organización: separar las operaciones que **cambian datos** (Commands: crear, actualizar, borrar) de las que **solo leen datos** (Queries), en vez de mezclarlas en el mismo método.

- **Command** → "hacé algo" (ej. `CreateProductCommand`, no devuelve datos de negocio, solo si funcionó).
- **Query** → "dame algo" (ej. `GetProductsQuery`, solo lee, nunca modifica nada).

**En este proyecto**: `BuildingBlocks/CQRS/` define las interfaces base `ICommand`, `ICommandHandler`, `IQuery`, `IqueryHandler` que usan ambas APIs.

### El patrón Mediator y la librería MediatR

**Mediator** es un patrón de diseño: en vez de que el código A llame directamente al código B, A le manda un "mensaje" a un intermediario (el mediador), y el mediador decide quién debe procesarlo. Esto **desacopla** quién pide algo de quién lo resuelve.

**MediatR** es la librería de .NET que implementa esto. Así se ve en un endpoint:

```csharp
app.MapGet("/products", async (ISender sender, ...) =>
{
    var result = await sender.Send(new GetProductsQuery(name, pageIndex, pageSize));
    return Results.Ok(result);
});
```

El endpoint no sabe *cómo* se consigue la lista de productos — solo envía el mensaje `GetProductsQuery` y MediatR lo enruta automáticamente al `Handler` correspondiente (`GetProductsQueryHandler`), que sí tiene la lógica real:

```csharp
internal class GetProductsQueryHandler(IDocumentSession session, ...) : IqueryHandler<GetProductsQuery, GetProductsResult>
{
    public async Task<GetProductsResult> Handle(GetProductsQuery query, CancellationToken ct)
    {
        // aquí sí se consulta la base de datos
    }
}
```

**¿Por qué sirve esto?** El endpoint queda simple y enfocado solo en HTTP (recibir petición, devolver respuesta), y toda la lógica de negocio vive separada y es más fácil de probar.

---

## 6. Pipeline Behaviors (logging y validación automáticos)

Un **Pipeline Behavior** es código que MediatR ejecuta *alrededor* de cada Handler, como capas de una cebolla — se puede meter lógica que aplica a **todos** los Commands/Queries sin repetirla en cada uno.

**En este proyecto hay dos, usados solo en `Basket.API`:**

1. **`LoggingBehavior`**: registra en el log cuándo empieza y termina cada petición, y avisa si tardó más de 3 segundos:
```csharp
logger.LogInformation("[Empezamos] ...");
var response = await next(); // aquí se ejecuta el Handler real
if (timeTaken.Seconds > 3) logger.LogWarning("[Performance] ...");
```

2. **`ValidationBehavior`**: antes de dejar pasar la petición al Handler, corre todos los validadores de FluentValidation que apliquen a ese Command. Si algo falla, lanza una excepción y **el Handler nunca se llega a ejecutar**:
```csharp
var failures = validationResults.Where(r => r.Errors.Any())...
if (failures.Any()) throw new ValidationException(failures);
return await next();
```

### FluentValidation
Librería para escribir reglas de validación de forma declarativa, en vez de si-entonces a mano:
```csharp
RuleFor(x => x.UserName).NotEmpty();
```

**¿Por qué importa el orden?** Estos behaviors se registran como una cadena (`cfg.AddOpenBehavior(...)`), así que la petición pasa primero por Logging, luego por Validation, y solo si todo pasa, llega al Handler real.

---

## 7. Vertical Slice Architecture

Otra forma de organizar el código es por **capa técnica**: una carpeta `Controllers/`, otra `Services/`, otra `Repositories/` — y para hacer un solo cambio, tocas archivos en 4 carpetas distintas.

**Vertical Slice** organiza el código por **feature** (funcionalidad completa), agrupando todo lo que necesita esa funcionalidad en una sola carpeta:

```
Basket/StoreBasket/
  ├── StoreBasketCommand.cs
  ├── StoreBasketCommandHandler.cs
  ├── StoreBasketEndPoint.cs
  └── StoreBasketCommandValidator.cs
```

**Ventaja**: para entender o modificar "guardar carrito", solo miras una carpeta, no saltas entre capas.

---

## 8. Bases de datos: relacional vs documentos (Marten)

- **Base de datos relacional** (la forma "clásica"): datos organizados en tablas con filas y columnas fijas, relacionadas entre sí con llaves foráneas (ej. tabla `Productos`, tabla `Categorías`, unidas por un id).
- **Base de datos de documentos**: cada registro es un "documento" (parecido a un objeto JSON completo) guardado tal cual, sin necesidad de dividirlo en tablas relacionadas. MongoDB es el ejemplo más conocido.

**PostgreSQL** es una base de datos relacional — pero también soporta guardar JSON en una columna especial (`JSONB`), lo cual la vuelve capaz de funcionar como base de documentos.

**Marten** es la librería que aprovecha eso: convierte a PostgreSQL en una base de datos de documentos desde el punto de vista de C#. En vez de escribir SQL o mapear tablas, simplemente:

```csharp
session.Store(product);          // guardar
await session.SaveChangesAsync(); // confirmar cambios
var p = await session.LoadAsync<Product>(id); // leer por Id
session.Query<Product>().Where(p => p.Name == name); // consultar como si fuera LINQ normal
```

Por dentro, Marten serializa el objeto `Product` completo a JSON y lo guarda en una columna `JSONB` de Postgres. Cada tipo de documento tiene una **identidad** (normalmente `Id: Guid`), aunque se puede cambiar — `ShoppingCart` usa `UserName` como identidad en vez de un Guid:
```csharp
opts.Schema.For<ShoppingCart>().Identity(x => x.UserName);
```

**`IDocumentSession`**: es la "unidad de trabajo" de Marten — acumula los cambios que haces (`Store`, `Update`, `Delete`) en memoria, y solo se aplican de verdad a la base cuando llamas `SaveChangesAsync()`.

---

## 9. Redis y el patrón Cache-Aside

### ¿Qué es Redis?
Una base de datos que vive **en memoria RAM** (no en disco), tipo clave-valor (como un diccionario gigante: `"admin" → {carrito de admin}`). Al vivir en RAM, leer/escribir es muchísimo más rápido que Postgres — a cambio, es menos durable (si se apaga, se puede perder lo que no esté respaldado a disco).

### ¿Para qué se usa aquí?
Como **caché** delante de la base de datos real, solo en `Basket.API`. La idea: si algo ya se consultó recientemente, mejor traerlo de Redis (rápido) que volver a preguntarle a Postgres (más lento).

### Patrón Cache-Aside (o "Lazy Loading")
La aplicación decide manualmente cuándo usar la caché y cuándo no:

1. Alguien pide el carrito de "admin".
2. Primero se busca en Redis. **¿Está?** → se devuelve directo, sin tocar Postgres (*cache hit*).
3. **¿No está?** (*cache miss*) → se busca en Postgres, y el resultado se guarda en Redis para la próxima vez.
4. Si el carrito se actualiza o se borra, también se actualiza/borra en Redis, para que nunca quede desactualizado (*stale data*).

**`IDistributedCache`**: la interfaz estándar de .NET para hablar con una caché compartida entre varias instancias de la app (distinto de `IMemoryCache`, que es memoria local de un solo proceso). `StackExchange.Redis` es el cliente que implementa esa interfaz hablando el protocolo de Redis por detrás.

---

## 10. El patrón Decorator (y Scrutor)

**Decorator** es un patrón de diseño: envolver una implementación con otra que comparte la misma interfaz, agregando comportamiento extra **sin tocar la clase original**.

**En este proyecto**: `CacheBasketRepository` envuelve a `BasketRepository`. Ambos implementan `IBasketRepository`, pero el que realmente se usa en la app es el decorador:

```csharp
builder.Services.AddScoped<IBasketRepository, BasketRepository>();       // el "real" (Postgres)
builder.Services.Decorate<IBasketRepository, CacheBasketRepository>();   // lo envuelve con caché
```

Cuando algo pide `IBasketRepository`, en realidad recibe `CacheBasketRepository`, que primero mira Redis, y si no encuentra nada, le pasa la petición al `BasketRepository` real de adentro.

**¿Por qué es útil?** `BasketRepository` no sabe nada de caché — solo habla con Postgres. Toda la lógica de "primero Redis, si no está entonces Postgres" vive aparte, sin ensuciar el código de acceso a datos.

**Scrutor**: el paquete de NuGet que hace posible escribir `.Decorate<TInterface, TDecorator>()`, porque el contenedor de inyección de dependencias nativo de .NET no soporta esto de fábrica.

---

## 11. Mapster (mapeo de objetos)

Cuando llega un `CreateProductRequest` (lo que manda el cliente) hay que convertirlo a un `CreateProductCommand` (lo que MediatR necesita), y luego un `Result` a un `Response` (lo que se devuelve). Hacerlo a mano es repetitivo:

```csharp
new CreateProductCommand(request.Name, request.Description, ...); // a mano
```

**Mapster** puede hacerlo automáticamente si los nombres de las propiedades coinciden:
```csharp
var command = request.Adapt<CreateProductCommand>();
```

---

## 12. Manejo de errores y ProblemDetails

### `IExceptionHandler`
Interfaz de ASP.NET Core (desde .NET 8) para capturar **cualquier excepción no controlada** en un solo lugar central, en vez de poner `try/catch` en cada endpoint.

**En este proyecto**: `CustomExceptionHandler` decide qué código HTTP devolver según el tipo de excepción:
```csharp
var statusCode = exception switch
{
    ValidationException => StatusCodes.Status400BadRequest,
    ProductNotFoundException => StatusCodes.Status404NotFound,
    _ => StatusCodes.Status500InternalServerError
};
```

### ProblemDetails (RFC 7807)
Un estándar para que los errores de una API tengan siempre la misma forma en JSON, en vez de que cada API invente su propio formato:
```json
{ "title": "ProductNotFoundException", "status": 404, "detail": "Producto con nombre 'X' no encontrado" }
```
El frontend (`http.js`) sabe leer este formato para mostrar mensajes de error legibles, sin tener que adivinar la estructura.

---

## 13. Docker y contenedores

- **Contenedor**: una forma de empaquetar una aplicación junto con *todo* lo que necesita para correr (runtime, librerías, configuración) en una unidad aislada y portable — corre igual en tu computadora que en un servidor en la nube.
- **Imagen**: la "plantilla" (archivos + instrucciones) desde la que se crean contenedores. Un contenedor es una imagen "encendida" y corriendo.
- **Dockerfile**: el archivo de texto con las instrucciones para construir una imagen, paso por paso.
- **Multi-stage build**: un Dockerfile que usa varias etapas (`FROM ... AS build`, `FROM ... AS final`) para separar "todo lo necesario para compilar" (pesado: SDK completo) de "lo mínimo necesario para correr" (liviano: solo el runtime) — así la imagen final es más pequeña.
- **Docker Compose**: una herramienta para levantar **varios contenedores juntos** con un solo comando (`docker compose up`), describiendo todo en un archivo YAML — útil porque este proyecto necesita 5 piezas corriendo a la vez (2 APIs + 2 Postgres + Redis) para funcionar en local.

**En este proyecto**: `docker-compose.yml` (base) + `docker-compose.override.yml` (desarrollo local, con puertos y credenciales) levantan todo el stack local. En producción **no se usa Docker** — se descartó por restricciones de la suscripción de Azure usada (ver `DESPLIEGUE.md`).

---

## 14. Variables de entorno y configuración jerárquica

Una **variable de entorno** es un valor que vive fuera del código, en el sistema operativo/proceso donde corre la app — permite cambiar comportamiento (ej. a qué base de datos conectarse) **sin modificar ni recompilar el código**.

.NET tiene una convención: una variable de entorno con doble guion bajo `ConnectionStrings__Database` se traduce automáticamente a la configuración anidada `ConnectionStrings:Database` (como si viniera de un `appsettings.json`). Los arrays funcionan con índice: `Cors__AllowedOrigins__0`, `Cors__AllowedOrigins__1`.

**¿Por qué importa?** Así el mismo código funciona en desarrollo local (conectado a Postgres en Docker) y en producción (conectado a Neon en la nube) sin cambiar una sola línea — solo cambian las variables de entorno de cada lugar (ver `DESPLIEGUE.md`).

**Regla de seguridad importante**: las contraseñas/credenciales reales **nunca** se escriben en el código ni se suben a git — solo viven como variables de entorno configuradas directamente en el hosting (Azure App Settings, Netlify Environment variables).

---

## 15. CORS

**CORS** (*Cross-Origin Resource Sharing*): un mecanismo de seguridad que traen los **navegadores** (no es cosa del servidor, es el navegador el que lo aplica). Por defecto, una página web cargada desde un dominio (ej. `netlify.app`) **no puede** hacer peticiones JavaScript a un servidor en otro dominio (ej. `azurewebsites.net`), a menos que ese servidor diga explícitamente "sí, confío en ese origen".

**En este proyecto**: ambas APIs configuran una política de CORS que lee la lista de orígenes permitidos desde `Cors:AllowedOrigins` (configurable por variables de entorno). Si el origen del frontend no está en esa lista, el navegador bloquea la respuesta aunque el servidor sí haya procesado la petición correctamente — por eso hay que mantener sincronizada esta lista con la URL real del frontend.

---

## 16. El frontend: React, Vite y componentes

- **React**: librería de JavaScript para construir interfaces de usuario a partir de **componentes** — piezas reutilizables de UI que reciben datos (`props`) y devuelven qué se debe mostrar.
- **JSX**: la sintaxis que mezcla HTML con JavaScript dentro de los componentes de React (`<button onClick={...}>Agregar</button>`).
- **Vite**: la herramienta que compila y sirve el proyecto de React durante desarrollo (`npm run dev`) y genera los archivos finales optimizados para producción (`npm run build` → carpeta `dist/`).
- **React Router**: librería para manejar navegación entre "páginas" sin recargar el navegador (*Single Page Application*) — `<Route path="/cart" element={<CartPage />} />`.

**En este proyecto**: `ProductsPage`, `CartPage`, componentes como `ProductCard`, `Navbar`, etc.

---

## 17. Context API y hooks de React

- **Hook**: una función especial de React que empieza con `use` y permite "engancharse" a funcionalidades de React dentro de un componente (`useState` para guardar estado, `useEffect` para ejecutar código cuando algo cambia).
- **Context API**: una forma de compartir datos entre componentes **sin tener que pasarlos manualmente de padre a hijo en cada nivel** (evita el "prop drilling"). Se crea un `Context`, un `Provider` que envuelve la app y provee el valor, y un hook (`useContext`) para leerlo desde cualquier componente hijo.

**En este proyecto** hay tres contextos, todos siguiendo el mismo patrón:
- `CartContext` → carrito de compras (habla con `Basket.API`).
- `CurrencyContext` → moneda seleccionada y formateo de precios.
- `ThemeContext` → tema claro/oscuro, guardado en `localStorage`.

```jsx
// se envuelve toda la app una sola vez (main.jsx)
<CartProvider><App /></CartProvider>

// cualquier componente adentro puede leer/usar el carrito así:
const { cart, addItem } = useCart()
```

**`localStorage`**: almacenamiento simple del navegador que persiste entre recargas de página (usado aquí para recordar el tema elegido y la moneda).

---

## 18. Consumir APIs desde el frontend (fetch)

**`fetch`**: la función nativa del navegador para hacer peticiones HTTP desde JavaScript.

**En este proyecto**, `api/http.js` envuelve `fetch` en un cliente reutilizable que:
1. Arma la URL completa (base + path).
2. Convierte el `body` a JSON antes de enviarlo.
3. Parsea la respuesta de JSON a objeto de JavaScript.
4. Si la respuesta no es exitosa (`response.ok === false`), lanza un error de JavaScript con el mensaje que venga en el `ProblemDetails` del backend.

```js
export function createHttpClient(baseUrl) {
  return {
    get: (path, options) => request(baseUrl, path, { ...options, method: 'GET' }),
    post: (path, body, options) => request(baseUrl, path, { ...options, method: 'POST', body }),
    // ...
  }
}
```

Así, `catalogApi.js` y `basketApi.js` solo tienen que llamar `http.get('/products')` sin preocuparse por los detalles de `fetch`.

---

## 19. Despliegue en la nube: PaaS vs contenedores

- **PaaS** (*Platform as a Service*): un servicio en la nube donde subes tu código y ellos se encargan de correrlo, sin que tengas que administrar servidores ni contenedores directamente. **Azure App Service (código)**, **Netlify** y **Neon**/**Upstash** funcionan así.
- **Serverless / base de datos administrada**: **Neon** (Postgres) y **Upstash** (Redis) son bases de datos "serverless" — no gestionas el servidor donde corre la base, solo te conectas con una cadena de conexión y pagas/usas por consumo.
- **Zip Deploy**: la forma en que Visual Studio publicó el código a Azure App Service — compila el proyecto y sube el resultado comprimido, sin pasar por Docker.

**En este proyecto** se evaluó primero Azure Container Apps + Docker, pero se cambió a App Service en modo código por restricciones de la cuenta usada (ver `DESPLIEGUE.md` para el detalle completo). Frontend en Netlify, cada API en su propio App Service, cada base en su propio motor administrado.

---

## 20. Git y GitHub

- **Git**: sistema de control de versiones — guarda el historial de cambios del código, permitiendo volver atrás o ver qué cambió y cuándo.
- **Repositorio (repo)**: la carpeta del proyecto trackeada por Git.
- **Commit**: una "foto" guardada de los cambios en un momento dado, con un mensaje que explica qué y por qué.
- **Push**: subir los commits locales a un repositorio remoto (GitHub).
- **`.gitignore`**: lista de archivos/carpetas que Git debe ignorar y nunca subir (ej. `node_modules/`, `bin/`, `obj/`, contraseñas locales).
- **GitHub**: el servicio donde vive el repositorio remoto (`github.com/Karasu0001/eshop-services`), y desde donde Netlify hace build automático cada vez que hay un push.

---

## 21. Tabla resumen rápida (repaso de último minuto)

| Término | En una frase |
|---|---|
| API REST | Forma de exponer operaciones sobre HTTP usando URLs + verbos (GET/POST/PUT/DELETE) |
| Microservicio | Servicio pequeño e independiente, responsable de una sola cosa |
| Database per Service | Cada microservicio tiene su propia base de datos, nadie más la toca |
| Minimal API | Estilo de ASP.NET Core para definir endpoints con poco código |
| Carter | Organiza los endpoints de Minimal API en módulos separados |
| CQRS | Separar operaciones de escritura (Command) de las de lectura (Query) |
| Mediator / MediatR | El endpoint manda un mensaje, un intermediario lo enruta al handler correcto |
| Pipeline Behavior | Código que corre automáticamente alrededor de cada Command/Query (logging, validación) |
| FluentValidation | Reglas de validación declarativas |
| Vertical Slice Architecture | Organizar el código por feature completa, no por capa técnica |
| Marten | Convierte PostgreSQL en una base de datos de documentos (JSONB) |
| `IDocumentSession` | Unidad de trabajo de Marten — acumula cambios hasta `SaveChangesAsync()` |
| Redis | Base de datos en memoria, clave-valor, muy rápida |
| Cache-Aside | Patrón: primero mirar la caché, si no está, ir a la base y luego guardarlo en caché |
| Decorator | Envolver una implementación con otra que agrega comportamiento, sin tocar la original |
| Scrutor | Habilita `.Decorate<T,TImpl>()` en el contenedor de dependencias de .NET |
| Mapster | Mapea automáticamente un objeto a otro con propiedades parecidas |
| `IExceptionHandler` | Punto central para capturar y convertir excepciones en respuestas HTTP |
| ProblemDetails | Formato estándar (RFC 7807) para representar errores de API en JSON |
| Docker / contenedor | Empaqueta la app con todo lo que necesita para correr igual en cualquier lado |
| Docker Compose | Levanta varios contenedores juntos con un solo comando |
| Variables de entorno | Configuración fuera del código, cambia el comportamiento sin recompilar |
| CORS | El navegador bloquea peticiones a otro dominio salvo que el servidor lo permita explícitamente |
| React | Librería para construir UI a partir de componentes reutilizables |
| Hook (`useState`, `useEffect`) | Función que engancha un componente a funcionalidad de React |
| Context API | Comparte datos entre componentes sin pasarlos manualmente en cada nivel |
| `fetch` | Función del navegador para hacer peticiones HTTP desde JavaScript |
| PaaS | Subes tu código y el proveedor de nube se encarga de correrlo |
| Git / commit / push | Guardar y subir el historial de cambios del código |
