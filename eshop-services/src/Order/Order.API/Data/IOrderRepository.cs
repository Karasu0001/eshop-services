using OrderService.Models;

namespace OrderService.Data
{
    public interface IOrderRepository
    {
        Task InsertAsync(Order order, CancellationToken cancellationToken = default);
        Task<Order?> GetByIdAsync(string id, CancellationToken cancellationToken = default);
        Task<List<Order>> GetByCustomerAsync(string customerId, CancellationToken cancellationToken = default);
        Task<(List<Order> Data, long Count)> GetAllAsync(int pageIndex, int pageSize, CancellationToken cancellationToken = default);
        Task<Order?> GetByIdempotencyKeyAsync(string customerId, string idempotencyKey, CancellationToken cancellationToken = default);
        Task<Order?> UpdateStatusAsync(string id, OrderStatus newStatus, CancellationToken cancellationToken = default);
    }
}
