using OrderService.Contracts;
using OrderService.Data;

namespace OrderService.Orders.GetOrderById
{
    internal class GetOrderByIdQueryHandler(IOrderRepository repository)
        : IqueryHandler<GetOrderByIdQuery, OrderDto>
    {
        public async Task<OrderDto> Handle(GetOrderByIdQuery query, CancellationToken cancellationToken)
        {
            var order = await repository.GetByIdAsync(query.Id, cancellationToken);
            if (order is null)
                throw new NotFoundException($"Orden con id '{query.Id}' no encontrada.");

            return OrderDto.FromOrder(order);
        }
    }
}
