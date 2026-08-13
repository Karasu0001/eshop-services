namespace OrderService.Orders.UpdateOrderStatus
{
    public class UpdateOrderStatusEndpoint : ICarterModule
    {
        public void AddRoutes(IEndpointRouteBuilder app)
        {
            app.MapPatch("/api/orders/{id}/status", async (string id, UpdateOrderStatusRequest request, ISender sender) =>
            {
                var result = await sender.Send(new UpdateOrderStatusCommand(id, request.Status));
                return Results.Ok(result);
            })
            .WithName("ActualizarEstadoOrden")
            .Produces<Contracts.OrderDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .WithSummary("Cambia el estado de una orden, validando la transicion")
            .WithDescription("Body: { status: \"Confirmed\" | \"Cancelled\" }. Solo se permite Pending->Confirmed o Pending->Cancelled.");
        }
    }
}
