using OrderService.Contracts;
using OrderService.Data;
using OrderService.Exceptions;
using OrderService.Models;

namespace OrderService.Orders.UpdateOrderStatus
{
    internal class UpdateOrderStatusCommandHandler(IOrderRepository repository)
        : ICommandHandler<UpdateOrderStatusCommand, OrderDto>
    {
        // Unicas transiciones permitidas (regla 4.2 del examen).
        private static readonly Dictionary<OrderStatus, OrderStatus[]> AllowedTransitions = new()
        {
            [OrderStatus.Pending] = [OrderStatus.Confirmed, OrderStatus.Cancelled],
            [OrderStatus.Confirmed] = [],
            [OrderStatus.Cancelled] = [],
        };

        public async Task<OrderDto> Handle(UpdateOrderStatusCommand command, CancellationToken cancellationToken)
        {
            var order = await repository.GetByIdAsync(command.Id, cancellationToken);
            if (order is null)
                throw new NotFoundException($"Orden con id '{command.Id}' no encontrada.");

            if (!Enum.TryParse<OrderStatus>(command.Status, ignoreCase: true, out var targetStatus))
                throw new BadRequestException($"Estado '{command.Status}' invalido. Valores validos: Pending, Confirmed, Cancelled.");

            var allowed = AllowedTransitions[order.Status];
            if (!allowed.Contains(targetStatus))
            {
                throw new InvalidOrderTransitionException(
                    $"No se puede pasar la orden de '{order.Status}' a '{targetStatus}'. " +
                    $"Transiciones validas desde '{order.Status}': {(allowed.Length == 0 ? "ninguna (estado final)" : string.Join(", ", allowed))}.");
            }

            var updated = await repository.UpdateStatusAsync(command.Id, targetStatus, cancellationToken)
                ?? throw new NotFoundException($"Orden con id '{command.Id}' no encontrada.");

            return OrderDto.FromOrder(updated);
        }
    }
}
