namespace OrderService.Orders.GetOrdersByCustomer
{
    public class GetOrdersByCustomerEndpoint : ICarterModule
    {
        public void AddRoutes(IEndpointRouteBuilder app)
        {
            app.MapGet("/api/orders/customer/{customerId}", async (string customerId, ISender sender) =>
            {
                var result = await sender.Send(new GetOrdersByCustomerQuery(customerId));
                return Results.Ok(result); // lista vacia (no 404) si el cliente no tiene ordenes
            })
            .WithName("ObtenerOrdenesPorCliente")
            .Produces<List<Contracts.OrderDto>>(StatusCodes.Status200OK)
            .WithSummary("Lista las ordenes de un cliente");
        }
    }
}
