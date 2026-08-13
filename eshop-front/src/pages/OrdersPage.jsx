import { useEffect, useState } from 'react'
import { useCart } from '../context/CartContext'
import { getOrderPdfUrl, getOrdersByCustomer, updateOrderStatus } from '../api/ordersApi'
import ErrorMessage from '../components/ErrorMessage'
import Loader from '../components/Loader'

const currencyFallback = (value) => `$${Number(value).toFixed(2)}`

const STATUS_LABEL = {
  Pending: 'Pendiente',
  Confirmed: 'Confirmada',
  Cancelled: 'Cancelada',
}

// Vista de las ordenes del cliente actual, con acciones para Confirmar/Cancelar
// (demuestra PATCH /api/orders/{id}/status y sus reglas de transicion de estado).
export default function OrdersPage() {
  const { userName } = useCart()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getOrdersByCustomer(userName)
      setOrders(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName])

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id)
    setError(null)
    try {
      await updateOrderStatus(id, status)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <section className="orders-page">
      <h1>Órdenes de {userName}</h1>

      <ErrorMessage message={error} />

      {loading ? (
        <Loader label="Cargando órdenes..." />
      ) : orders.length === 0 ? (
        <p className="empty-state">Todavía no tienes órdenes. Agrega productos al carrito y realiza una compra.</p>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <article key={order.id} className="order-card">
              <div className="order-card__header">
                <div>
                  <strong>Orden {order.id}</strong>
                  <span className="order-card__date">{new Date(order.createdAt).toLocaleString()}</span>
                </div>
                <span className={`order-status order-status--${order.status.toLowerCase()}`}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>

              <ul className="order-card__items">
                {order.items.map((item) => (
                  <li key={item.productId}>
                    {item.quantity}× {item.productName} — {currencyFallback(item.lineTotal)}
                  </li>
                ))}
              </ul>

              <div className="order-card__footer">
                <span>Total: {currencyFallback(order.total)}</span>
                <div className="order-card__actions">
                  <a
                    className="button--secondary"
                    href={getOrderPdfUrl(order.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    🧾 PDF
                  </a>
                  {order.status === 'Pending' && (
                    <>
                      <button
                        type="button"
                        className="button--secondary"
                        disabled={updatingId === order.id}
                        onClick={() => handleStatusChange(order.id, 'Cancelled')}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === order.id}
                        onClick={() => handleStatusChange(order.id, 'Confirmed')}
                      >
                        Confirmar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
