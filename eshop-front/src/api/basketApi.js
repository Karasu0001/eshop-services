import { ApiError, createHttpClient } from './http'

// URL del microservicio Basket.API. En local apunta a localhost:8082 (docker-compose),
// en produccion se sobreescribe con la variable de entorno de Netlify.
const BASKET_API_URL = import.meta.env.VITE_BASKET_API_URL || 'http://localhost:8082'

const http = createHttpClient(BASKET_API_URL)

// GET /basket/{userName} -> { cart: ShoppingCart }
// Basket.API responde 404 (BasketNotFoundException) si el usuario aun no tiene carrito;
// aqui lo tratamos como un carrito vacio en vez de propagar el error.
export async function getBasket(userName) {
  try {
    const data = await http.get(`/basket/${encodeURIComponent(userName)}`)
    return data.cart
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { userName, items: [] }
    }
    throw error
  }
}

// POST /basket body: { cart: ShoppingCart } -> upsert del carrito completo
// (la API no tiene endpoint para modificar un solo item, por eso siempre se envia
// el carrito completo ya actualizado)
export function storeBasket(cart) {
  return http.post('/basket', { cart })
}

// DELETE /basket/{userName}
export function deleteBasket(userName) {
  return http.delete(`/basket/${encodeURIComponent(userName)}`)
}
