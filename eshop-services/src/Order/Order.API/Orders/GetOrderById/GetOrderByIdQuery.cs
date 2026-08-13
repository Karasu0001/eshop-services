using OrderService.Contracts;

namespace OrderService.Orders.GetOrderById
{
    public record GetOrderByIdQuery(string Id) : IQuery<OrderDto>;
}
