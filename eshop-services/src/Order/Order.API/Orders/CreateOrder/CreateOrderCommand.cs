using OrderService.Contracts;

namespace OrderService.Orders.CreateOrder
{
    public record CreateOrderRequest(string CustomerId, string? BasketId);

    // IdempotencyKey viaja aparte porque llega por header HTTP, no por el body.
    public record CreateOrderCommand(string CustomerId, string? BasketId, string? IdempotencyKey)
        : ICommand<CreateOrderCommandResult>;

    // IsNew=false cuando la respuesta es una orden ya creada previamente con la misma Idempotency-Key.
    public record CreateOrderCommandResult(OrderDto Order, bool IsNew);
}
