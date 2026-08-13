using OrderService.Models;

namespace OrderService.Contracts
{
    public record OrderItemDto(string ProductId, string ProductName, int Quantity, decimal UnitPrice, decimal LineTotal);

    // DTO de salida para todas las respuestas de orden (evita exponer directamente
    // el documento de Mongo, ej. IdempotencyKey queda fuera de la respuesta).
    public record OrderDto(
        string Id,
        string CustomerId,
        DateTime CreatedAt,
        string Status,
        List<OrderItemDto> Items,
        decimal Subtotal,
        decimal Tax,
        decimal Total)
    {
        public static OrderDto FromOrder(Order order) => new(
            order.Id,
            order.CustomerId,
            order.CreatedAt,
            order.Status.ToString(),
            order.Items.Select(i => new OrderItemDto(i.ProductId, i.ProductName, i.Quantity, i.UnitPrice, i.LineTotal)).ToList(),
            order.Subtotal,
            order.Tax,
            order.Total);
    }
}
