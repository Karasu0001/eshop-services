namespace OrderService.Basket
{
    public interface IBasketApiClient
    {
        // Devuelve null si el cliente no tiene carrito (Basket.API respondio 404).
        Task<ShoppingCartDto?> GetBasketAsync(string customerId, CancellationToken cancellationToken = default);
    }
}
