using OrderService.Contracts;

namespace OrderService.Orders.GetAllOrders
{
    // Endpoint adicional (no exigido por el contrato minimo del examen, pero si pedido
    // explicitamente en la explicacion en audio: "consultar todas las ordenes").
    public record GetAllOrdersQuery(int PageIndex = 1, int PageSize = 20) : IQuery<PaginatedOrdersResult>;

    public record PaginatedOrdersResult(int PageIndex, int PageSize, long Count, List<OrderDto> Data);
}
