namespace Catalog.API.Models.Products.CreateProduct
{
    public record CreateProductCommand(string Name, string Description,List<string> Category,string ImagesFiles,decimal Price)
        : ICommand<CreateProductResult>;
    public record CreateProductResult(Guid Id);
    internal class CreateProductCommandHandler(IDocumentSession documentSession): ICommandHandler<CreateProductCommand, CreateProductResult>
    {
        public async Task<CreateProductResult> Handle(CreateProductCommand request,CancellationToken cancellationToken)
        {
            Product product = new Product
            {
                Name = request.Name,
                Descripcion = request.Description,
                Category = request.Category,
                ImageFiles = request.ImagesFiles,
                Price = request.Price
            };
            documentSession.Store(product);
            await documentSession.SaveChangesAsync(cancellationToken);
            return new CreateProductResult(Guid.NewGuid());
        }
    }

}
