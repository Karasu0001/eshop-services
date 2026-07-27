import { useCart } from '../context/CartContext'
import { useCurrency } from '../context/CurrencyContext'
import ErrorMessage from '../components/ErrorMessage'
import Loader from '../components/Loader'

export default function CartPage() {
  const { cart, loading, error, totalPrice, removeItem, updateQuantity, clearCart, userName } = useCart()
  const { format } = useCurrency()

  return (
    <section className="cart-page">
      <h1>Carrito de {userName}</h1>

      <ErrorMessage message={error} />

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
            <button type="button" onClick={clearCart}>
              Vaciar carrito
            </button>
          </div>
        </>
      )}
    </section>
  )
}
