import { createContext, useContext, useState, type ReactNode } from 'react'
import type { EventData, MealSelection, OrderData } from '../services/api'

interface QuantityMap {
  [day: number]: {
    [slot: string]: {
      optionIndex: number
      quantity: number
    }
  }
}

interface RegistrationContextValue {
  event: EventData | null
  setEvent: (e: EventData) => void
  quantities: QuantityMap
  setQty: (day: number, slot: string, optionIndex: number, delta: number) => void
  selectOption: (day: number, slot: string, optionIndex: number) => void
  grandTotal: number
  mealSelections: MealSelection[]
  order: OrderData | null
  setOrder: (o: OrderData) => void
  clearOrder: () => void
}

const RegistrationContext = createContext<RegistrationContextValue | null>(null)

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [event, setEvent] = useState<EventData | null>(null)
  const [quantities, setQuantities] = useState<QuantityMap>({})
  const [order, setOrder] = useState<OrderData | null>(null)

  const setQty = (day: number, slot: string, optionIndex: number, delta: number) => {
    setQuantities((prev) => {
      const current = prev[day]?.[slot]?.quantity ?? 0
      const newQty = Math.max(0, Math.min(5, current + delta))
      if (newQty === 0 && !prev[day]?.[slot]) return prev
      return {
        ...prev,
        [day]: {
          ...(prev[day] ?? {}),
          [slot]: { optionIndex, quantity: newQty },
        },
      }
    })
  }

  const selectOption = (day: number, slot: string, optionIndex: number) => {
    setQuantities((prev) => ({
      ...prev,
      [day]: {
        ...(prev[day] ?? {}),
        [slot]: { optionIndex, quantity: prev[day]?.[slot]?.quantity ?? 0 },
      },
    }))
  }

  // Build mealSelections for API
  const mealSelections: MealSelection[] = []
  if (event?.mealOptions) {
    const dayMap: Record<number, MealSelection> = {}
    Object.entries(quantities).forEach(([dayStr, slots]) => {
      const day = Number(dayStr)
      Object.entries(slots).forEach(([slot, { optionIndex, quantity }]) => {
        if (quantity === 0) return
        const group = event.mealOptions?.find((g) => g.day === day && g.slot === slot)
        if (!group) return
        const opt = group.options[optionIndex]
        if (!opt) return
        if (!dayMap[day]) dayMap[day] = { day, meals: [] }
        dayMap[day].meals.push({ slot, optionIndex, optionName: opt.name, price: opt.price, quantity })
      })
    })
    mealSelections.push(...Object.values(dayMap))
  }

  // Compute grand total
  let grandTotal = 0
  mealSelections.forEach((sel) => {
    sel.meals.forEach((m) => { grandTotal += m.price * m.quantity })
  })

  const clearOrder = () => setOrder(null)

  return (
    <RegistrationContext.Provider value={{
      event, setEvent,
      quantities, setQty, selectOption,
      grandTotal, mealSelections,
      order, setOrder, clearOrder,
    }}>
      {children}
    </RegistrationContext.Provider>
  )
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext)
  if (!ctx) throw new Error('useRegistration must be used within RegistrationProvider')
  return ctx
}