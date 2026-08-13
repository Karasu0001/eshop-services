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

        <div className="receipt">
          <div className="receipt__header">
            <div>
              <span className="eyebrow">Orden</span>
              <div className="receipt__id">#{confirmedOrder.id}</div>
            </div>
            <span className={`order-status order-status--${confirmedOrder.status.toLowerCase()}`}>
              <span className="order-status__dot" aria-hidden="true" />
              {STATUS_LABEL[confirmedOrder.status] ?? confirmedOrder.status}
            </span>
          </div>

          <ul className="line-list">
            {confirmedOrder.items.map((item) => (
              <li key={item.productId} className="line-list__row">
                <div>
                  <div className="line-list__name">{item.productName}</div>
                  <div className="line-list__meta">
                    {item.quantity} × {currencyFallback(item.unitPrice)}
                  </div>
                </div>
                <span className="line-list__total">{currencyFallback(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <div className="totals">
            <div className="totals__row">
              <span>Cliente</span>
              <span>{userName}</span>
            </div>
            <div className="totals__row">
              <span>Fecha</span>
              <span>{new Date(confirmedOrder.createdAt ?? Date.now()).toLocaleString()}</span>
            </div>
            <div className="totals__row">
              <span>Subtotal</span>
              <span>{currencyFallback(confirmedOrder.subtotal)}</span>
            </div>
            <div className="totals__row">
              <span>Impuestos</span>
              <span>{currencyFallback(confirmedOrder.tax)}</span>
            </div>
            <div className="totals__row totals__row--total">
              <span>Total</span>
              <span>{currencyFallback(confirmedOrder.total)}</span>
            </div>
          </div>

          <a className="receipt__cta" href={getOrderPdfUrl(confirmedOrder.id)} target="_blank" rel="noreferrer">
            Ver recibo de compra →
          </a>
        </div>

        <div className="page-actions">
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
          <ul className="line-list">
            {cart.items.map((item) => (
              <li key={item.productId} className="line-list__row">
                <div>
                  <div className="line-list__name">{item.productName}</div>
                  <div className="line-list__meta">{format(item.price)} c/u</div>
                </div>
                <div className="quantity-stepper">
                  <button
                    type="button"
                    className="stepper-btn"
                    title="Disminuir cantidad"
                    onClick={() => updateQuantity(item.productId, -1)}
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    className="stepper-btn"
                    title="Aumentar cantidad"
                    onClick={() => updateQuantity(item.productId, 1)}
                  >
                    +
                  </button>
                </div>
                <span className="line-list__total">{format(item.price * item.quantity)}</span>
                <button type="button" className="text-action text-action--danger" onClick={() => removeItem(item.productId)}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>

          <div className="cart-summary">
            <span>
              Total: <span className="amount">{format(totalPrice)}</span>
            </span>
            <div className="cart-summary__actions">
              <button type="button" className="button--secondary" onClick={clearCart} disabled={placing}>
                Vaciar carrito
              </button>
              <button type="button" onClick={handlePurchase} disabled={placing}>
                {placing ? 'Generando orden...' : 'Realizar compra'}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
