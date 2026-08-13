import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useCurrency } from '../context/CurrencyContext'
import { useTheme } from '../context/ThemeContext'

export default function Navbar() {
  const { userName, setUserName, totalItems } = useCart()
  const { currencyCode, setCurrencyCode, currencies } = useCurrency()
  const { theme, toggleTheme } = useTheme()
  const [draftName, setDraftName] = useState(userName)

  // Solo confirmamos el cambio de usuario al salir del campo o presionar Enter,
  // para no disparar una consulta al carrito en cada tecla presionada.
  const commitUserName = () => {
    if (draftName.trim() && draftName.trim() !== userName) {
      setUserName(draftName)
    }
  }

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
        <NavLink to="/orders" className={({ isActive }) => (isActive ? 'active' : '')}>
          📦 Mis órdenes
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
        <label htmlFor="userName">Usuario</label>
        <input
          id="userName"
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitUserName}
          onKeyDown={(e) => e.key === 'Enter' && commitUserName()}
          placeholder="tu nombre"
        />
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
