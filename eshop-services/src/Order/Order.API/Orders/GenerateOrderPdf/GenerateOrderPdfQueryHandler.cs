using OrderService.Data;
using QuestPDF.Fluent;

namespace OrderService.Orders.GenerateOrderPdf
{
    internal class GenerateOrderPdfQueryHandler(IOrderRepository repository)
        : IqueryHandler<GenerateOrderPdfQuery, GenerateOrderPdfResult>
    {
        public async Task<GenerateOrderPdfResult> Handle(GenerateOrderPdfQuery query, CancellationToken cancellationToken)
        {
            var order = await repository.GetByIdAsync(query.Id, cancellationToken);
            if (order is null)
                throw new NotFoundException($"Orden con id '{query.Id}' no encontrada.");

            var bytes = new OrderPdfDocument(order).GeneratePdf();
            var fileName = $"orden-{order.Id}.pdf";

            return new GenerateOrderPdfResult(bytes, fileName);
        }
    }
}
