using OrderService.Contracts;
using OrderService.Data;

namespace OrderService.Orders.GetAllOrders
{
    internal class GetAllOrdersQueryHandler(IOrderRepository repository)
        : IqueryHandler<GetAllOrdersQuery, PaginatedOrdersResult>
    {
        public async Task<PaginatedOrdersResult> Handle(GetAllOrdersQuery query, CancellationToken cancellationToken)
        {
            var pageIndex = query.PageIndex < 1 ? 1 : query.PageIndex;
            var pageSize = query.PageSize is < 1 or > 100 ? 20 : query.PageSize;

            var (data, count) = await repository.GetAllAsync(pageIndex, pageSize, cancellationToken);
            return new PaginatedOrdersResult(pageIndex, pageSize, count, data.Select(OrderDto.FromOrder).ToList());
        }
    }
}
