using Microsoft.Extensions.Options;
using MongoDB.Driver;
using OrderService.Models;

namespace OrderService.Data
{
    public class OrderRepository : IOrderRepository
    {
        private readonly IMongoCollection<Order> _orders;

        public OrderRepository(IOptions<MongoDbSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _orders = database.GetCollection<Order>(settings.Value.OrdersCollectionName);
        }

        public Task InsertAsync(Order order, CancellationToken cancellationToken = default) =>
            _orders.InsertOneAsync(order, cancellationToken: cancellationToken);

        public Task<Order?> GetByIdAsync(string id, CancellationToken cancellationToken = default) =>
            _orders.Find(o => o.Id == id).FirstOrDefaultAsync(cancellationToken)!;

        public async Task<List<Order>> GetByCustomerAsync(string customerId, CancellationToken cancellationToken = default) =>
            await _orders.Find(o => o.CustomerId == customerId)
                .SortByDescending(o => o.CreatedAt)
                .ToListAsync(cancellationToken);

        public async Task<(List<Order> Data, long Count)> GetAllAsync(int pageIndex, int pageSize, CancellationToken cancellationToken = default)
        {
            var filter = FilterDefinition<Order>.Empty;
            var count = await _orders.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
            var data = await _orders.Find(filter)
                .SortByDescending(o => o.CreatedAt)
                .Skip((pageIndex - 1) * pageSize)
                .Limit(pageSize)
                .ToListAsync(cancellationToken);
            return (data, count);
        }

        public Task<Order?> GetByIdempotencyKeyAsync(string customerId, string idempotencyKey, CancellationToken cancellationToken = default) =>
            _orders.Find(o => o.CustomerId == customerId && o.IdempotencyKey == idempotencyKey)
                .FirstOrDefaultAsync(cancellationToken)!;

        public async Task<Order?> UpdateStatusAsync(string id, OrderStatus newStatus, CancellationToken cancellationToken = default)
        {
            var update = Builders<Order>.Update.Set(o => o.Status, newStatus);
            return await _orders.FindOneAndUpdateAsync<Order>(
                o => o.Id == id,
                update,
                new FindOneAndUpdateOptions<Order> { ReturnDocument = ReturnDocument.After },
                cancellationToken);
        }
    }
}
