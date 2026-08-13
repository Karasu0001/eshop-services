namespace OrderService.Basket
{
    // Espejo del contrato JSON que expone Basket.API (GET /basket/{userName}),
    // usado solo para deserializar la respuesta al llamarlo por HTTP.
    public record BasketItemDto(Guid ProductId, string ProductName, string Color, decimal Price, int Quantity);

    public record ShoppingCartDto(string UserName, List<BasketItemDto> Items);

    public record GetBasketResponseDto(ShoppingCartDto Cart);
}
