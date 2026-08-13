import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useCurrency } from '../context/CurrencyContext'
import { createOrder, getOrderPdfUrl } from '../api/ordersApi'
import ErrorMessage from '../components/ErrorMessage'
import Loader from '../components/Loader'

const currencyFallback = (value) => `$${Number(value).toFixed(2)}`

export default function CartPage() {
  const { cart, loading, error, totalPrice, removeItem, updateQuantity, clearCart, userName } = useCart()
  const { format } = useCurrency()

  // La Idempotency-Key se genera una sola vez por intento de compra: si el POST falla
  // y el usuario reintenta, reutiliza la misma clave (evita ordenes duplicadas ante reintentos).
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())
  const [placing, setPlacing] = useState(false)
  const [purchaseError, setPurchaseError] = useState(null)
  const [confirmedOrder, setConfirmedOrder] = useState(null)

  const handlePurchase = async () => {
    setPlacing(true)
    setPurchaseError(null)
    try {
      const order = await createOrder({ customerId: userName, idempotencyKey })
      setConfirmedOrder(order)
      await clearCart()
      setIdempotencyKey(crypto.randomUUID()) // proxima compra = nueva clave de idempotencia
    } catch (err) {
      setPurchaseError(err.message)
    } finally {
      setPlacing(false)
    }
  }

  if (confirmedOrder) {
    return (
      <section className="cart-page">
        <h1>¡Compra confirmada! 🎉</h1>
        <div className="order-confirmation">
          <p>
            Orden <strong>{confirmedOrder.id}</strong> — estado <strong>{confirmedOrder.status}</strong>
          </p>
          <ul className="order-confirmation__items">
            {confirmedOrder.items.map((item) => (
              <li key={item.productId}>
                {item.quantity}× {item.productName} — {currencyFallback(item.lineTotal)}
              </li>
            ))}
          </ul>
          <div className="order-confirmation__totals">
            <span>Subtotal: {currencyFallback(confirmedOrder.subtotal)}</span>
            <span>Impuestos: {currencyFallback(confirmedOrder.tax)}</span>
            <span className="order-confirmation__total">Total: {currencyFallback(confirmedOrder.total)}</span>
          </div>
        </div>
        <div className="order-confirmation__actions">
          <a className="pdf-link" href={getOrderPdfUrl(confirmedOrder.id)} target="_blank" rel="noreferrer">
            🧾 Ver comprobante (PDF)
          </a>
          <Link to="/orders">Ver mis órdenes</Link>
          <Link to="/">Seguir comprando</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="cart-page">
      <h1>Carrito de {userName}</h1>

      <ErrorMessage message={error || purchaseError} />

      {loading ? (
        <Loader label="Cargando carrito..." />
      ) : cart.items.length === 0 ? (
        <p className="empty-state">Tu carrito está vacío. Agrega productos desde el catálogo.</p>
      ) : (
        <>
          <table className="cart-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Precio</th>
                <th>Cantidad</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.items.map((item) => (
                <tr key={item.productId}>
                  <td>{item.productName}</td>
                  <td>{format(item.price)}</td>
                  <td>
                    <div className="quantity-stepper">
                      <button
                        type="button"
                        className="icon-button"
                        title="Disminuir cantidad"
                        onClick={() => updateQuantity(item.productId, -1)}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        className="icon-button"
                        title="Aumentar cantidad"
                        onClick={() => updateQuantity(item.productId, 1)}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td>{format(item.price * item.quantity)}</td>
                  <td>
                    <button type="button" className="link-button" onClick={() => removeItem(item.productId)}>
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="cart-summary">
            <span>Total: {format(totalPrice)}</span>
            <div className="cart-summary__actions">
              <button type="button" className="button--secondary" onClick={clearCart} disabled={placing}>
                Vaciar carrito
              </button>
              <button type="button" onClick={handlePurchase} disabled={placing}>
                {placing ? 'Generando orden...' : '✅ Realizar compra'}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
