using OrderService.Contracts;
using OrderService.Data;

namespace OrderService.Orders.GetOrdersByCustomer
{
    internal class GetOrdersByCustomerQueryHandler(IOrderRepository repository)
        : IqueryHandler<GetOrdersByCustomerQuery, List<OrderDto>>
    {
        public async Task<List<OrderDto>> Handle(GetOrdersByCustomerQuery query, CancellationToken cancellationToken)
        {
            var orders = await repository.GetByCustomerAsync(query.CustomerId, cancellationToken);
            return orders.Select(OrderDto.FromOrder).ToList();
        }
    }
}
