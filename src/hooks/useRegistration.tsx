import { useState, type ReactNode } from 'react'
import type { EventData, MealSelection, OrderData } from '../services/api'
import { RegistrationContext } from './registrationContext'
import type { QuantityMap } from './registrationContext'

// ── Provider ────────────────────────────────────────────────────────────────

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [event, setEvent] = useState<EventData | null>(null)
  const [quantities, setQuantities] = useState<QuantityMap>({})
  const [selectedAccommodationId, setSelectedAccommodationId] = useState('')
  const [selectedTransportId, setSelectedTransportId] = useState('')
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
      Object.entries(slots).forEach(([slot, val]) => {
        const { optionIndex, quantity } = val as { optionIndex: number; quantity: number }
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
      selectedAccommodationId, setSelectedAccommodationId,
      selectedTransportId, setSelectedTransportId,
      order, setOrder, clearOrder,
    }}>
      {children}
    </RegistrationContext.Provider>
  )
}