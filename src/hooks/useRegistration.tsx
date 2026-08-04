import { useState, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import type { EventData, MealSelection, OrderData, SponsorshipData } from '../services/api'
import { RegistrationContext, emptyGuestForm, emptyPurchaser, emptySponsorForm, MODE_STORAGE_KEY } from './registrationContext'
import type { QuantityMap, GuestForm, RegMode, PurchaserForm, SponsorForm } from './registrationContext'

// ── Provider ────────────────────────────────────────────────────────────────

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [event, setEvent] = useState<EventData | null>(null)
  const [quantities, setQuantities] = useState<QuantityMap>({})
  const [selectedAccommodationId, setSelectedAccommodationId] = useState('')
  const [selectedTransportId, setSelectedTransportId] = useState('')
  // Mode is persisted to sessionStorage so a refresh mid-journey (or the
  // Paystack round-trip) keeps the chosen path; it clears when the tab closes.
  const [mode, setModeState] = useState<RegMode | null>(() => {
    try { return (sessionStorage.getItem(MODE_STORAGE_KEY) as RegMode | null) ?? null } catch { return null }
  })
  const setMode: Dispatch<SetStateAction<RegMode | null>> = (value) => {
    setModeState((prev) => {
      const next = typeof value === 'function'
        ? (value as (p: RegMode | null) => RegMode | null)(prev)
        : value
      try {
        if (next) sessionStorage.setItem(MODE_STORAGE_KEY, next)
        else sessionStorage.removeItem(MODE_STORAGE_KEY)
      } catch { /* ignore */ }
      return next
    })
  }
  const [guest, setGuest] = useState<GuestForm>(emptyGuestForm)
  const [purchaser, setPurchaser] = useState<PurchaserForm>(emptyPurchaser)
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({})
  const [consent, setConsent] = useState(false)
  const [sponsor, setSponsor] = useState<SponsorForm>(emptySponsorForm)
  const [order, setOrder] = useState<OrderData | null>(null)
  const [sponsorship, setSponsorship] = useState<SponsorshipData | null>(null)

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

  // Wipe the whole registration draft after a completed payment so the next
  // journey starts clean. Leaves order/sponsorship/event intact (the success
  // page still needs them to render).
  const resetRegistration = () => {
    setMode(null)
    setGuest(emptyGuestForm)
    setPurchaser(emptyPurchaser)
    setSponsor(emptySponsorForm)
    setCustomAnswers({})
    setConsent(false)
    setQuantities({})
    setSelectedAccommodationId('')
    setSelectedTransportId('')
  }

  return (
    <RegistrationContext.Provider value={{
      event, setEvent,
      quantities, setQty, selectOption,
      grandTotal, mealSelections,
      selectedAccommodationId, setSelectedAccommodationId,
      selectedTransportId, setSelectedTransportId,
      mode, setMode,
      guest, setGuest,
      purchaser, setPurchaser,
      customAnswers, setCustomAnswers,
      consent, setConsent,
      sponsor, setSponsor,
      order, setOrder, clearOrder,
      sponsorship, setSponsorship,
      resetRegistration,
    }}>
      {children}
    </RegistrationContext.Provider>
  )
}