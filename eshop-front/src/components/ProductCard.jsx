import { useState } from 'react'
import { useCart } from '../context/CartContext'

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD' })

export default function ProductCard({ product, onEdit, onDelete }) {
  const { addItem } = useCart()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const handleAddToCart = async () => {
    setAdding(true)
    await addItem(product, 1)
    setAdding(false)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <article className="product-card">
      <div className="product-card__body">
        <div className="product-card__title-row">
          <h3>{product.name}</h3>
          <div className="product-card__admin-actions">
            <button type="button" className="icon-button" title="Editar producto" onClick={() => onEdit(product)}>
              ✎
            </button>
            <button
              type="button"
              className="icon-button icon-button--danger"
              title="Eliminar producto"
              onClick={() => onDelete(product)}
            >
              🗑
            </button>
          </div>
        </div>
        <p className="product-card__description">{product.descripcion}</p>
        {product.category?.length > 0 && (
          <ul className="product-card__tags">
            {product.category.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="product-card__footer">
        <span className="product-card__price">{currencyFormatter.format(product.price)}</span>
        <button type="button" onClick={handleAddToCart} disabled={adding}>
          {added ? 'Agregado ✓' : adding ? 'Agregando...' : 'Agregar al carrito'}
        </button>
      </div>
    </article>
  )
}
