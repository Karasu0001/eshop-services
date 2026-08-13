using OrderService.Contracts;

namespace OrderService.Orders.UpdateOrderStatus
{
    public record UpdateOrderStatusRequest(string Status);

    public record UpdateOrderStatusCommand(string Id, string Status) : ICommand<OrderDto>;
}
