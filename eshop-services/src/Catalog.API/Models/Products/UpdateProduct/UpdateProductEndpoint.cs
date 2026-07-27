using Mapster;

namespace Catalog.API.Models.Products.UpdateProduct
{
    public record UpdateProductRequest(string Name, string Description, List<string> Category,
        string ImagesFiles, decimal Price);
    public record UpdateProductResponse(bool IsSuccess);

    public class UpdateProductEndpoint : ICarterModule
    {
        public void AddRoutes(IEndpointRouteBuilder app)
        {
            app.MapPut("/products", async (UpdateProductRequest request, ISender sender) =>
            {
                var command = request.Adapt<UpdateProductCommand>();
                var result = await sender.Send(command);
                var response = result.Adapt<UpdateProductResponse>();
                return Results.Ok(response);
            })
                .WithName("ActualizarProducto")
                .Produces<UpdateProductResponse>(StatusCodes.Status200OK)
                .ProducesProblem(StatusCodes.Status400BadRequest)
                .ProducesProblem(StatusCodes.Status404NotFound)
                .WithSummary("Actualiza un producto por nombre")
                .WithDescription("Busca el producto por su nombre actual (en la ruta) y actualiza sus datos con el cuerpo de la peticion.");
        }
    }
}
