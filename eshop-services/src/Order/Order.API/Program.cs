using BuildingBlocks.Behaviors;
using FluentValidation;
using OrderService.Basket;
using OrderService.Data;
using OrderService.Exceptions;
using OrderService.Models;

var builder = WebApplication.CreateBuilder(args);

// Azure App Service (codigo) y otros hosts asignan el puerto dinamicamente via PORT.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

builder.Services.AddCarter();
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly);
    cfg.AddOpenBehavior(typeof(LoggingBehavior<,>));
    cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
});
builder.Services.AddValidatorsFromAssembly(typeof(Program).Assembly);

// MongoDB Atlas: connection string/db solo por variables de entorno (MongoDb__ConnectionString),
// nunca hardcodeadas en appsettings.json.
builder.Services.Configure<MongoDbSettings>(builder.Configuration.GetSection("MongoDb"));
builder.Services.AddSingleton<IOrderRepository, OrderRepository>();

builder.Services.Configure<OrderOptions>(builder.Configuration.GetSection("Order"));

// Order.API no tiene base de datos de carritos propia: consulta Basket.API por HTTP
// (Database per Service). La URL base sale de configuracion (Services:BasketApi).
builder.Services.AddHttpClient<IBasketApiClient, BasketApiClient>(client =>
{
    var basketApiUrl = builder.Configuration["Services:BasketApi"]
        ?? throw new InvalidOperationException("Falta configurar Services:BasketApi");
    client.BaseAddress = new Uri(basketApiUrl);
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddExceptionHandler<OrderExceptionHandler>();
builder.Services.AddProblemDetails();

var app = builder.Build();

app.UseCors("Frontend");
app.MapCarter();
app.UseExceptionHandler(options => { });

app.Run();
