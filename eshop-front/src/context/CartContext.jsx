import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { deleteBasket, getBasket, storeBasket } from '../api/basketApi'

const USERNAME_STORAGE_KEY = 'maruchanmarket_username'
const DEFAULT_USERNAME = 'invitado'

const CartContext = createContext(null)

// Basket.API identifica el carrito por "userName" (= CustomerId de las ordenes) y no
// maneja autenticacion real; se simula un usuario editable guardado en localStorage,
// para poder demostrar el flujo de ordenes con distintos clientes.
export function CartProvider({ children }) {
  const [userName, setUserNameState] = useState(
    () => localStorage.getItem(USERNAME_STORAGE_KEY) || DEFAULT_USERNAME,
  )
  const [cart, setCart] = useState({ userName, items: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refreshCart = useCallback(async (name) => {
    setLoading(true)
    setError(null)
    try {
      const basket = await getBasket(name)
      setCart(basket)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshCart(userName)
  }, [userName, refreshCart])

  const addItem = useCallback(
    async (product, quantity = 1) => {
      setError(null)
      const existing = cart.items.find((item) => item.productId === product.id)
      const items = existing
        ? cart.items.map((item) =>
            item.productId === product.id ? { ...item, quantity: item.quantity + quantity } : item,
          )
        : [
            ...cart.items,
            {
              productId: product.id,
              productName: product.name,
              price: product.price,
              color: 'Unico',
              quantity,
            },
          ]

      const updatedCart = { ...cart, userName, items }
      setCart(updatedCart)
      try {
        await storeBasket(updatedCart)
      } catch (err) {
        setError(err.message)
        await refreshCart(userName)
      }
    },
    [cart, userName, refreshCart],
  )

  const removeItem = useCallback(
    async (productId) => {
      setError(null)
      const items = cart.items.filter((item) => item.productId !== productId)
      const updatedCart = { ...cart, userName, items }
      setCart(updatedCart)
      try {
        await storeBasket(updatedCart)
      } catch (err) {
        setError(err.message)
        await refreshCart(userName)
      }
    },
    [cart, userName, refreshCart],
  )

  // delta = +1 (boton "+") o -1 (boton "-"); si la cantidad llega a 0 se quita el item.
  const updateQuantity = useCallback(
    async (productId, delta) => {
      setError(null)
      const items = cart.items
        .map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + delta } : item,
        )
        .filter((item) => item.quantity > 0)

      const updatedCart = { ...cart, userName, items }
      setCart(updatedCart)
      try {
        await storeBasket(updatedCart)
      } catch (err) {
        setError(err.message)
        await refreshCart(userName)
      }
    },
    [cart, userName, refreshCart],
  )

  const setUserName = useCallback((name) => {
    const trimmed = name.trim() || DEFAULT_USERNAME
    localStorage.setItem(USERNAME_STORAGE_KEY, trimmed)
    setUserNameState(trimmed)
  }, [])

  const clearCart = useCallback(async () => {
    setError(null)
    try {
      await deleteBasket(userName)
      setCart({ userName, items: [] })
    } catch (err) {
      setError(err.message)
    }
  }, [userName])

  const totalPrice = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart.items],
  )

  const totalItems = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.quantity, 0),
    [cart.items],
  )

  const value = {
    userName,
    setUserName,
    cart,
    loading,
    error,
    totalPrice,
    totalItems,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    refreshCart: () => refreshCart(userName),
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart debe usarse dentro de un CartProvider')
  return context
}
