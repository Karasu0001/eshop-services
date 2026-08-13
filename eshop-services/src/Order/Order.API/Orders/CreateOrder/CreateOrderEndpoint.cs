namespace OrderService.Orders.CreateOrder
{
    public class CreateOrderEndpoint : ICarterModule
    {
        public void AddRoutes(IEndpointRouteBuilder app)
        {
            app.MapPost("/api/orders", async (CreateOrderRequest request, HttpRequest httpRequest, ISender sender) =>
            {
                // El header Idempotency-Key es opcional, pero si se repite con la misma
                // clave para el mismo cliente, no se debe crear una segunda orden.
                string? idempotencyKey = httpRequest.Headers["Idempotency-Key"].FirstOrDefault();

                var command = new CreateOrderCommand(request.CustomerId, request.BasketId, idempotencyKey);
                var result = await sender.Send(command);

                return result.IsNew
                    ? Results.Created($"/api/orders/{result.Order.Id}", result.Order)
                    : Results.Ok(result.Order); // reintento con la misma Idempotency-Key: no es una creacion nueva
            })
            .WithName("CrearOrden")
            .Produces<Contracts.OrderDto>(StatusCodes.Status201Created)
            .Produces<Contracts.OrderDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status500InternalServerError)
            .WithSummary("Genera una orden de compra a partir del carrito del cliente")
            .WithDescription("Body: { customerId, basketId }. Header opcional Idempotency-Key para evitar ordenes duplicadas ante reintentos.");
        }
    }
}
