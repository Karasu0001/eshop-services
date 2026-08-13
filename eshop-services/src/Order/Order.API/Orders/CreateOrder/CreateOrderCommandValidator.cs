using FluentValidation;

namespace OrderService.Orders.CreateOrder
{
    public class CreateOrderCommandValidator : AbstractValidator<CreateOrderCommand>
    {
        public CreateOrderCommandValidator()
        {
            RuleFor(x => x.CustomerId)
                .NotEmpty()
                .WithMessage("customerId es requerido.");

            RuleFor(x => x)
                .Must(x => string.IsNullOrWhiteSpace(x.BasketId) || x.BasketId == x.CustomerId)
                .WithMessage("basketId debe coincidir con customerId: en este sistema cada cliente tiene un unico carrito, identificado por su propio customerId.");
        }
    }
}
