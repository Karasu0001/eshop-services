using MongoDB.Bson.Serialization.Attributes;

namespace OrderService.Models
{
    public enum OrderStatus
    {
        Pending,
        Confirmed,
        Cancelled
    }

    // Documento raiz de la coleccion "orders" en MongoDB Atlas.
    public class Order
    {
        [BsonId]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        public string CustomerId { get; set; } = default!;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonRepresentation(MongoDB.Bson.BsonType.String)]
        public OrderStatus Status { get; set; } = OrderStatus.Pending;

        public List<OrderItem> Items { get; set; } = new();

        public decimal Subtotal { get; set; }

        public decimal Tax { get; set; }

        public decimal Total { get; set; }

        // Header "Idempotency-Key" que genero esta orden; null si el cliente no lo mando.
        public string? IdempotencyKey { get; set; }
    }

    public class OrderItem
    {
        public string ProductId { get; set; } = default!;

        public string ProductName { get; set; } = default!;

        public int Quantity { get; set; }

        public decimal UnitPrice { get; set; }

        public decimal LineTotal { get; set; }
    }
}
