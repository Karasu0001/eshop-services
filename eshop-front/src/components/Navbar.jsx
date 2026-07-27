import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function Navbar() {
  const { userName, setUserName, totalItems } = useCart()
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
      <div className="navbar__brand">eShop</div>

      <nav className="navbar__links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Productos
        </NavLink>
        <NavLink to="/cart" className={({ isActive }) => (isActive ? 'active' : '')}>
          Carrito
          {totalItems > 0 && <span className="navbar__badge">{totalItems}</span>}
        </NavLink>
      </nav>

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
    </header>
  )
}
