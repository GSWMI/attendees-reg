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
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null)

  // Set the quantity for a single option within a slot. Multiple options in the
  // same slot can each hold their own quantity (a qty of 0 removes the option).
  const setQty = (day: number, slot: string, optionIndex: number, delta: number) => {
    setQuantities((prev) => {
      const current = prev[day]?.[slot]?.[optionIndex] ?? 0
      const newQty = Math.max(0, Math.min(5, current + delta))
      const slotMap = { ...(prev[day]?.[slot] ?? {}) }
      if (newQty === 0) delete slotMap[optionIndex]
      else slotMap[optionIndex] = newQty
      return { ...prev, [day]: { ...(prev[day] ?? {}), [slot]: slotMap } }
    })
  }

  // Build mealSelections for the API — one meal entry per selected option,
  // referencing the option by its stable code.
  const mealSelections: MealSelection[] = []
  if (event?.mealOptions) {
    const dayMap: Record<number, MealSelection> = {}
    Object.entries(quantities).forEach(([dayStr, slots]) => {
      const day = Number(dayStr)
      Object.entries(slots).forEach(([slot, opts]) => {
        Object.entries(opts as Record<string, number>).forEach(([optIdxStr, quantity]) => {
          if (!quantity) return
          const optionIndex = Number(optIdxStr)
          const group = event.mealOptions?.find((g) => g.day === day && g.slot === slot)
          if (!group) return
          const opt = group.options[optionIndex]
          if (!opt) return
          if (!dayMap[day]) dayMap[day] = { day, meals: [] }
          dayMap[day].meals.push({ slot, code: opt.code, optionName: opt.name, price: opt.price, quantity })
        })
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
    setWhatsappLink(null)
  }

  return (
    <RegistrationContext.Provider value={{
      event, setEvent,
      quantities, setQty,
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
      whatsappLink, setWhatsappLink,
      resetRegistration,
    }}>
      {children}
    </RegistrationContext.Provider>
  )
}