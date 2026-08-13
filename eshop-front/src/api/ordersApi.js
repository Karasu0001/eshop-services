import { createHttpClient } from './http'

// URL del microservicio Order.API. En local apunta a localhost:6002 (docker-compose),
// en produccion se sobreescribe con la variable de entorno de Netlify.
const ORDER_API_URL = import.meta.env.VITE_ORDER_API_URL || 'http://localhost:6002'

const http = createHttpClient(ORDER_API_URL)

// POST /api/orders con header Idempotency-Key -> evita crear ordenes duplicadas
// si el usuario hace doble clic o si la peticion se reintenta.
export function createOrder({ customerId, idempotencyKey }) {
  return http.post(
    '/api/orders',
    { customerId, basketId: customerId },
    { headers: { 'Idempotency-Key': idempotencyKey } },
  )
}

// GET /api/orders/{id}
export function getOrderById(id) {
  return http.get(`/api/orders/${encodeURIComponent(id)}`)
}

// GET /api/orders/customer/{customerId}
export function getOrdersByCustomer(customerId) {
  return http.get(`/api/orders/customer/${encodeURIComponent(customerId)}`)
}

// PATCH /api/orders/{id}/status body: { status: "Confirmed" | "Cancelled" }
export function updateOrderStatus(id, status) {
  return http.patch(`/api/orders/${encodeURIComponent(id)}/status`, { status })
}
