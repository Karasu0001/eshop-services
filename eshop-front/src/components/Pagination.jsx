export default function Pagination({ pageIndex, pageSize, count, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize))

  return (
    <div className="pagination">
      <button type="button" disabled={pageIndex <= 1} onClick={() => onPageChange(pageIndex - 1)}>
        ← Anterior
      </button>
      <span>
        Página {pageIndex} de {totalPages} ({count} productos)
      </span>
      <button
        type="button"
        disabled={pageIndex >= totalPages}
        onClick={() => onPageChange(pageIndex + 1)}
      >
        Siguiente →
      </button>
    </div>
  )
}
