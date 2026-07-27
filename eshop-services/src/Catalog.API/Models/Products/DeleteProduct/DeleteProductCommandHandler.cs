using Catalog.API.Exceptions;

namespace Catalog.API.Models.Products.DeleteProduct
{
    public record DeleteProductCommand(string Name) : ICommand<DeleteProductResult>;
    public record DeleteProductResult(bool IsSuccess);

    internal class DeleteProductCommandHandler(IDocumentSession session)
        : ICommandHandler<DeleteProductCommand, DeleteProductResult>
    {
        public async Task<DeleteProductResult> Handle(DeleteProductCommand command, CancellationToken cancellationToken)
        {
            var product = await session.Query<Product>()
                .FirstOrDefaultAsync(p => p.Name == command.Name, cancellationToken);

            if (product is null)
                throw new ProductNotFoundException(command.Name);

            session.Delete<Product>(product.Id);
            await session.SaveChangesAsync(cancellationToken);

            return new DeleteProductResult(true);
        }
    }
}
