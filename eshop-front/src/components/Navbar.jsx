import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useCurrency } from '../context/CurrencyContext'
import { useTheme } from '../context/ThemeContext'
import RamenLogo from './RamenLogo'

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
      <div className="navbar__brand">
        <RamenLogo size={30} />
        MaruchanMarket
      </div>

      <nav className="navbar__links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Productos
        </NavLink>
        <NavLink to="/cart" className={({ isActive }) => (isActive ? 'active' : '')}>
          Carrito
          {totalItems > 0 && <span className="navbar__badge">{totalItems}</span>}
        </NavLink>
        <NavLink to="/orders" className={({ isActive }) => (isActive ? 'active' : '')}>
          Mis órdenes
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
        {theme === 'dark' ? (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M8 0.8V2.6M8 13.4V15.2M15.2 8H13.4M2.6 8H0.8M13.1 2.9L11.8 4.2M4.2 11.8L2.9 13.1M13.1 13.1L11.8 11.8M4.2 4.2L2.9 2.9"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path
              d="M14 9.3A6.2 6.2 0 1 1 6.7 2a5 5 0 0 0 7.3 7.3Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </header>
  )
}
