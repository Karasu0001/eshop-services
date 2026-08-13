import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useCurrency } from '../context/CurrencyContext'
import { createOrder, getOrderPdfUrl } from '../api/ordersApi'
import ErrorMessage from '../components/ErrorMessage'
import Loader from '../components/Loader'

const currencyFallback = (value) => `$${Number(value).toFixed(2)}`

const STATUS_LABEL = {
  Pending: 'Pendiente',
  Confirmed: 'Confirmada',
  Cancelled: 'Cancelada',
}

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
        <h1>Compra confirmada</h1>
        <div className="receipt-card">
          <span className="receipt-card__badge">✓ Orden registrada</span>

          <div className="receipt-card__barcode" aria-hidden="true">
            <div className="receipt-card__barcode-bars" />
          </div>
          <span className="receipt-card__barcode-code">{String(confirmedOrder.id).toUpperCase()}</span>

          <div className="receipt-card__header">
            <div>
              <span className="receipt-card__eyebrow">Orden</span>
              <strong className="receipt-card__id">#{confirmedOrder.id}</strong>
            </div>
            <span className={`order-status order-status--${confirmedOrder.status.toLowerCase()}`}>
              {STATUS_LABEL[confirmedOrder.status] ?? confirmedOrder.status}
            </span>
          </div>

          <div className="receipt-card__product">
            <span className="receipt-card__product-icon" aria-hidden="true">
              🍜
            </span>
            <div>
              <strong>{confirmedOrder.items[0]?.productName}</strong>
              {confirmedOrder.items.length > 1 && <span> y {confirmedOrder.items.length - 1} más</span>}
              <span className="receipt-card__product-sub">por MaruchanMarket</span>
            </div>
          </div>

          <ul className="receipt-card__items">
            {confirmedOrder.items.map((item) => (
              <li key={item.productId}>
                <span>
                  {item.quantity}× {item.productName}
                </span>
                <span>{currencyFallback(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <div className="receipt-card__meta">
            <div>
              <span>Cliente</span>
              <span>{userName}</span>
            </div>
            <div>
              <span>Fecha</span>
              <span>{new Date(confirmedOrder.createdAt ?? Date.now()).toLocaleString()}</span>
            </div>
          </div>

          <div className="receipt-card__totals">
            <div>
              <span>Subtotal</span>
              <span>{currencyFallback(confirmedOrder.subtotal)}</span>
            </div>
            <div>
              <span>Impuestos</span>
              <span>{currencyFallback(confirmedOrder.tax)}</span>
            </div>
            <div className="receipt-card__total">
              <span>Total</span>
              <span>{currencyFallback(confirmedOrder.total)}</span>
            </div>
          </div>

          <a className="receipt-card__cta" href={getOrderPdfUrl(confirmedOrder.id)} target="_blank" rel="noreferrer">
            🎫 Ver recibo de compra
          </a>

          <div className="receipt-card__perforation" aria-hidden="true" />
          <span className="receipt-card__handle" aria-hidden="true" />
        </div>
        <div className="order-confirmation__actions">
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
