using Microsoft.Extensions.Options;
using OrderService.Contracts;
using OrderService.Basket;
using OrderService.Data;
using OrderService.Models;

namespace OrderService.Orders.CreateOrder
{
    internal class CreateOrderCommandHandler(
        IOrderRepository repository,
        IBasketApiClient basketClient,
        IOptions<OrderOptions> orderOptions,
        ILogger<CreateOrderCommandHandler> logger)
        : ICommandHandler<CreateOrderCommand, CreateOrderCommandResult>
    {
        public async Task<CreateOrderCommandResult> Handle(CreateOrderCommand command, CancellationToken cancellationToken)
        {
            // Idempotencia: si el cliente ya mando esta misma Idempotency-Key antes,
            // devolvemos la orden que ya existe en vez de crear una nueva.
            if (!string.IsNullOrWhiteSpace(command.IdempotencyKey))
            {
                var existing = await repository.GetByIdempotencyKeyAsync(command.CustomerId, command.IdempotencyKey, cancellationToken);
                if (existing is not null)
                    return new CreateOrderCommandResult(OrderDto.FromOrder(existing), IsNew: false);
            }

            // El carrito vive en Basket.API (Database per Service) - lo consultamos por HTTP.
            var basket = await basketClient.GetBasketAsync(command.CustomerId, cancellationToken);
            if (basket is null || basket.Items.Count == 0)
                throw new BadRequestException("El carrito esta vacio, no se puede generar la orden de compra.");

            var items = new List<OrderItem>();
            foreach (var item in basket.Items)
            {
                if (item.ProductId == Guid.Empty || string.IsNullOrWhiteSpace(item.ProductName))
                    throw new BadRequestException("El carrito contiene un producto invalido o inexistente.");
                if (item.Quantity <= 0)
                    throw new BadRequestException($"Cantidad invalida para el producto '{item.ProductName}'.");
                if (item.Price < 0)
                    throw new BadRequestException($"Precio invalido para el producto '{item.ProductName}'.");

                items.Add(new OrderItem
                {
                    ProductId = item.ProductId.ToString(),
                    ProductName = item.ProductName,
                    Quantity = item.Quantity,
                    UnitPrice = item.Price, // se conserva el precio del carrito al momento de comprar
                    LineTotal = item.Price * item.Quantity,
                });
            }

            var subtotal = items.Sum(i => i.LineTotal);
            var tax = Math.Round(subtotal * (decimal)orderOptions.Value.TaxRate, 2, MidpointRounding.AwayFromZero);
            var total = subtotal + tax;

            var order = new Order
            {
                CustomerId = command.CustomerId,
                Items = items,
                Subtotal = subtotal,
                Tax = tax,
                Total = total,
                IdempotencyKey = command.IdempotencyKey,
            };

            try
            {
                await repository.InsertAsync(order, cancellationToken);
            }
            catch (Exception ex)
            {
                // No se expone el detalle real de Mongo (connection string, host, etc) al cliente.
                logger.LogError(ex, "Error al insertar la orden en MongoDB para el cliente {CustomerId}", command.CustomerId);
                throw new InternalServerException("No se pudo guardar la orden. Intenta de nuevo mas tarde.");
            }

            return new CreateOrderCommandResult(OrderDto.FromOrder(order), IsNew: true);
        }
    }
}
