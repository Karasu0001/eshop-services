import { createContext, useContext, useEffect, useState } from 'react'

// El precio que se guarda en Catalog.API es el numero final tal cual se muestra
// (ej. un producto guardado como 12 se ve como "$12.00", sin convertir montos) -
// este selector solo cambia el simbolo/formato de moneda, no hace conversion.
export const CURRENCIES = {
  USD: { label: 'USD $', locale: 'en-US', currency: 'USD' },
  MXN: { label: 'MXN $', locale: 'es-MX', currency: 'MXN' },
  EUR: { label: 'EUR €', locale: 'de-DE', currency: 'EUR' },
  COP: { label: 'COP $', locale: 'es-CO', currency: 'COP' },
}

const STORAGE_KEY = 'maruchanmarket_currency'
const DEFAULT_CURRENCY = 'MXN'

const CurrencyContext = createContext(null)

export function CurrencyProvider({ children }) {
  const [currencyCode, setCurrencyCode] = useState(
    () => localStorage.getItem(STORAGE_KEY) || DEFAULT_CURRENCY,
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currencyCode)
  }, [currencyCode])

  const config = CURRENCIES[currencyCode] ?? CURRENCIES[DEFAULT_CURRENCY]

  const format = (price) => {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      maximumFractionDigits: config.currency === 'COP' ? 0 : 2,
    }).format(Number(price) || 0)
  }

  const value = { currencyCode, setCurrencyCode, currencies: CURRENCIES, format }

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) throw new Error('useCurrency debe usarse dentro de un CurrencyProvider')
  return context
}
