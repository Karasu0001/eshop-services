import { useEffect, useState } from 'react'
import { createProduct, deleteProduct, getProducts, updateProduct } from '../api/catalogApi'
import ErrorMessage from '../components/ErrorMessage'
import Loader from '../components/Loader'
import Pagination from '../components/Pagination'
import ProductCard from '../components/ProductCard'
import ProductFormModal from '../components/ProductFormModal'

const PAGE_SIZE = 8

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [pageIndex, setPageIndex] = useState(1)
  const [result, setResult] = useState({ data: [], count: 0, pageIndex: 1, pageSize: PAGE_SIZE })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)

  // formState: null (cerrado) | 'create' | { product } (edicion de ese producto)
  const [formState, setFormState] = useState(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    // Debounce simple: espera a que el usuario deje de escribir antes de consultar el catalogo.
    const timeoutId = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getProducts({
          name: searchTerm,
          pageIndex,
          pageSize: PAGE_SIZE,
          signal: controller.signal,
        })
        setResult(data)
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [searchTerm, pageIndex, reloadToken])

  const handleSearchChange = (value) => {
    setSearchTerm(value)
    setPageIndex(1)
  }

  const reload = () => setReloadToken((token) => token + 1)

  const handleCreateSubmit = async (data) => {
    setFormSubmitting(true)
    setFormError(null)
    try {
      await createProduct(data)
      setFormState(null)
      reload()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleEditSubmit = async (data) => {
    setFormSubmitting(true)
    setFormError(null)
    try {
      await updateProduct(formState.product.name, data)
      setFormState(null)
      reload()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDelete = async (product) => {
    if (!window.confirm(`¿Eliminar "${product.name}" del catálogo?`)) return
    setError(null)
    try {
      await deleteProduct(product.name)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="products-page">
      <div className="products-page__header">
        <h1>Catálogo de productos</h1>
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Buscar producto por nombre..."
          className="products-page__search"
        />
        <button type="button" onClick={() => setFormState('create')}>
          + Nuevo producto
        </button>
      </div>

      <ErrorMessage message={error} />

      {loading ? (
        <Loader label="Cargando productos..." />
      ) : result.data.length === 0 ? (
        <p className="empty-state">No se encontraron productos.</p>
      ) : (
        <>
          <div className="products-grid">
            {result.data.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={(p) => setFormState({ product: p })}
                onDelete={handleDelete}
              />
            ))}
          </div>
          <Pagination
            pageIndex={result.pageIndex}
            pageSize={result.pageSize}
            count={result.count}
            onPageChange={setPageIndex}
          />
        </>
      )}

      {formState && (
        <ProductFormModal
          product={formState === 'create' ? null : formState.product}
          submitting={formSubmitting}
          error={formError}
          onSubmit={formState === 'create' ? handleCreateSubmit : handleEditSubmit}
          onCancel={() => {
            setFormState(null)
            setFormError(null)
          }}
        />
      )}
    </section>
  )
}
