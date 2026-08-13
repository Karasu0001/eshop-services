namespace OrderService.Orders.GetAllOrders
{
    public class GetAllOrdersEndpoint : ICarterModule
    {
        public void AddRoutes(IEndpointRouteBuilder app)
        {
            app.MapGet("/api/orders", async ([AsParameters] GetAllOrdersQuery query, ISender sender) =>
            {
                var result = await sender.Send(query);
                return Results.Ok(result);
            })
            .WithName("ListarTodasLasOrdenes")
            .Produces<PaginatedOrdersResult>(StatusCodes.Status200OK)
            .WithSummary("Lista todas las ordenes (paginado)");
        }
    }
}
