// Wrapper minimo sobre fetch: arma la URL, serializa/parsea JSON
// y convierte respuestas HTTP no exitosas en errores de JS con mensaje legible.

export class ApiError extends Error {
  constructor(message, status, problemDetails) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.problemDetails = problemDetails
  }
}

async function request(baseUrl, path, { method = 'GET', body, signal, headers } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : undefined),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })

  if (response.status === 204) return null

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    // Las APIs de catalogo/carrito devuelven errores en formato ProblemDetails (RFC 7807)
    const message = data?.detail || data?.title || `Error ${response.status} al llamar ${path}`
    throw new ApiError(message, response.status, data)
  }

  return data
}

export function createHttpClient(baseUrl) {
  return {
    get: (path, options) => request(baseUrl, path, { ...options, method: 'GET' }),
    post: (path, body, options) => request(baseUrl, path, { ...options, method: 'POST', body }),
    put: (path, body, options) => request(baseUrl, path, { ...options, method: 'PUT', body }),
    patch: (path, body, options) => request(baseUrl, path, { ...options, method: 'PATCH', body }),
    delete: (path, options) => request(baseUrl, path, { ...options, method: 'DELETE' }),
  }
}
