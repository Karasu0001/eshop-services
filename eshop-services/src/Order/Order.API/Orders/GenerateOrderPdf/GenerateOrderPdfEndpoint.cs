namespace OrderService.Orders.GenerateOrderPdf
{
    public class GenerateOrderPdfEndpoint : ICarterModule
    {
        public void AddRoutes(IEndpointRouteBuilder app)
        {
            app.MapGet("/api/orders/{id}/pdf", async (string id, ISender sender) =>
            {
                var result = await sender.Send(new GenerateOrderPdfQuery(id));

                // inline: el navegador la muestra directo (como el comprobante de Mercado Libre),
                // en vez de forzar una descarga inmediata.
                return Results.File(result.Content, "application/pdf", result.FileName, enableRangeProcessing: false);
            })
            .WithName("GenerarPdfOrden")
            .Produces(StatusCodes.Status200OK, contentType: "application/pdf")
            .ProducesProblem(StatusCodes.Status404NotFound)
            .WithSummary("Genera el comprobante en PDF de una orden de compra");
        }
    }
}
