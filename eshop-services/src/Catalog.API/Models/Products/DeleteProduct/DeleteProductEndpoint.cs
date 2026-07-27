namespace Catalog.API.Models.Products.DeleteProduct
{
    public record DeleteProductResponse(bool IsSuccess);

    public class DeleteProductEndpoint : ICarterModule
    {
        public void AddRoutes(IEndpointRouteBuilder app)
        {
            app.MapDelete("/products/{name}", async (string name, ISender sender) =>
            {
                var result = await sender.Send(new DeleteProductCommand(name));
                return Results.Ok(new DeleteProductResponse(result.IsSuccess));
            })
                .WithName("EliminarProducto")
                .Produces<DeleteProductResponse>(StatusCodes.Status200OK)
                .ProducesProblem(StatusCodes.Status404NotFound)
                .WithSummary("Elimina un producto por nombre")
                .WithDescription("Busca el producto por su nombre exacto y lo elimina del catalogo.");
        }
    }
}
