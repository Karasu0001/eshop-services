namespace OrderService.Orders.GetOrderById
{
    public class GetOrderByIdEndpoint : ICarterModule
    {
        public void AddRoutes(IEndpointRouteBuilder app)
        {
            app.MapGet("/api/orders/{id}", async (string id, ISender sender) =>
            {
                var result = await sender.Send(new GetOrderByIdQuery(id));
                return Results.Ok(result);
            })
            .WithName("ObtenerOrdenPorId")
            .Produces<Contracts.OrderDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .WithSummary("Recupera una orden por su identificador");
        }
    }
}
