using OrderService.Contracts;

namespace OrderService.Orders.GetOrdersByCustomer
{
    public record GetOrdersByCustomerQuery(string CustomerId) : IQuery<List<OrderDto>>;
}
