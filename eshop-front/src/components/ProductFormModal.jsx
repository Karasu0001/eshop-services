import { useState } from 'react'
import ErrorMessage from './ErrorMessage'

const emptyForm = { name: '', description: '', category: '', imagesFiles: '', price: '' }

function productToForm(product) {
  if (!product) return emptyForm
  return {
    name: product.name,
    description: product.descripcion ?? '',
    category: (product.category ?? []).join(', '),
    imagesFiles: product.imageFiles ?? '',
    price: String(product.price ?? ''),
  }
}

// Modal usado tanto para crear como para editar un producto.
// `product` null = modo creacion; con producto = modo edicion.
export default function ProductFormModal({ product, submitting, error, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => productToForm(product))
  const isEditing = Boolean(product)

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      imagesFiles: form.imagesFiles.trim(),
      price: Number(form.price),
    })
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>{isEditing ? `Editar "${product.name}"` : 'Nuevo producto'}</h2>
        <ErrorMessage message={error} />
        <form onSubmit={handleSubmit} className="product-form">
          <label>
            Nombre
            <input type="text" value={form.name} onChange={handleChange('name')} required />
          </label>
          <label>
            Descripción
            <textarea value={form.description} onChange={handleChange('description')} rows={3} required />
          </label>
          <label>
            Categorías (separadas por coma)
            <input type="text" value={form.category} onChange={handleChange('category')} placeholder="Ropa, Verano" />
          </label>
          <label>
            Imagen (URL o nombre de archivo)
            <input type="text" value={form.imagesFiles} onChange={handleChange('imagesFiles')} />
          </label>
          <label>
            Precio
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={handleChange('price')}
              required
            />
          </label>
          <div className="product-form__actions">
            <button type="button" className="button--secondary" onClick={onCancel} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
