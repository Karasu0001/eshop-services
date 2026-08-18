using OrderService.Contracts;

namespace OrderService.Orders.GetAllOrders
{
    // Endpoint adicional: listado paginado de todas las ordenes (no solo por cliente).
    public record GetAllOrdersQuery(int PageIndex = 1, int PageSize = 20) : IQuery<PaginatedOrdersResult>;

    public record PaginatedOrdersResult(int PageIndex, int PageSize, long Count, List<OrderDto> Data);
}
