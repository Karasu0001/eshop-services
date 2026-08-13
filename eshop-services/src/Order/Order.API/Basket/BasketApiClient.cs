using System.Net;
using System.Net.Http.Json;

namespace OrderService.Basket
{
    // Order.API no tiene su propia base de datos de carritos (Database per Service):
    // para saber que hay en el carrito, le pregunta a Basket.API por HTTP, igual que
    // haria el frontend.
    public class BasketApiClient(HttpClient httpClient, ILogger<BasketApiClient> logger) : IBasketApiClient
    {
        public async Task<ShoppingCartDto?> GetBasketAsync(string customerId, CancellationToken cancellationToken = default)
        {
            var response = await httpClient.GetAsync($"/basket/{Uri.EscapeDataString(customerId)}", cancellationToken);

            if (response.StatusCode == HttpStatusCode.NotFound)
                return null;

            if (!response.IsSuccessStatusCode)
            {
                logger.LogError("Basket.API respondio {StatusCode} al consultar el carrito de {CustomerId}",
                    response.StatusCode, customerId);
                throw new InternalServerException("No se pudo consultar el carrito del cliente.");
            }

            var payload = await response.Content.ReadFromJsonAsync<GetBasketResponseDto>(cancellationToken: cancellationToken);
            return payload?.Cart;
        }
    }
}
