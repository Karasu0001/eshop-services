import { NavLink } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useCurrency } from '../context/CurrencyContext'
import { useTheme } from '../context/ThemeContext'

export default function Navbar() {
  const { userName, totalItems } = useCart()
  const { currencyCode, setCurrencyCode, currencies } = useCurrency()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="navbar">
      <div className="navbar__brand">🍜 MaruchanMarket</div>

      <nav className="navbar__links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Productos
        </NavLink>
        <NavLink to="/cart" className={({ isActive }) => (isActive ? 'active' : '')}>
          🛒 Carrito
          {totalItems > 0 && <span className="navbar__badge">{totalItems}</span>}
        </NavLink>
      </nav>

      <div className="navbar__currency">
        <label htmlFor="currency">Moneda</label>
        <select id="currency" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)}>
          {Object.entries(currencies).map(([code, { label }]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="navbar__user">
        <span>Usuario</span>
        <strong>{userName}</strong>
      </div>

      <button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </header>
  )
}
