namespace OrderService.Orders.GenerateOrderPdf
{
    public record GenerateOrderPdfQuery(string Id) : IQuery<GenerateOrderPdfResult>;

    public record GenerateOrderPdfResult(byte[] Content, string FileName);
}
