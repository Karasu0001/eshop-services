import { createHttpClient } from './http'

// URL del microservicio Catalog.API. En local apunta a localhost:8080 (docker-compose),
// en produccion se sobreescribe con la variable de entorno de Netlify.
const CATALOG_API_URL = import.meta.env.VITE_CATALOG_API_URL || 'http://localhost:8080'

const http = createHttpClient(CATALOG_API_URL)

// GET /products?name=&pageIndex=&pageSize= -> PaginatedResult<Product>
export function getProducts({ name, pageIndex = 1, pageSize = 8, signal } = {}) {
  const params = new URLSearchParams({ pageIndex, pageSize })
  if (name) params.set('name', name)
  return http.get(`/products?${params.toString()}`, { signal })
}

// POST /products -> CreateProducResponse { id }
export function createProduct({ name, description, category, imagesFiles, price }) {
  return http.post('/products', { name, description, category, imagesFiles, price })
}

// PUT /products/{currentName} -> UpdateProductResponse { isSuccess }
// El backend busca el producto por su nombre ACTUAL (no por id), por eso se
// requiere currentName ademas de los nuevos datos.
export function updateProduct(currentName, { name, description, category, imagesFiles, price }) {
  return http.put(`/products/${encodeURIComponent(currentName)}`, {
    name,
    description,
    category,
    imagesFiles,
    price,
  })
}

// DELETE /products/{name} -> DeleteProductResponse { isSuccess }
export function deleteProduct(name) {
  return http.delete(`/products/${encodeURIComponent(name)}`)
}
