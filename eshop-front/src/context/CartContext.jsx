import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { deleteBasket, getBasket, storeBasket } from '../api/basketApi'

// Basket.API identifica el carrito por "userName" y no maneja autenticacion real,
// por eso aqui se usa un unico usuario fijo ("admin") en vez de perfiles de verdad.
const FIXED_USERNAME = 'admin'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const userName = FIXED_USERNAME
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
