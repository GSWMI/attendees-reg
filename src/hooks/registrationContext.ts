import { createContext, type Dispatch, type SetStateAction } from 'react'
import type { EventData, MealSelection, OrderData } from '../services/api'

export interface QuantityMap {
  [day: number]: {
    [slot: string]: {
      optionIndex: number
      quantity: number
    }
  }
}

// Attendee + next-of-kin details. Lives in context (not local page state) so it
// survives navigation between the details form and the review screen.
export interface GuestForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  whatsappNumber: string
  gender: 'male' | 'female' | ''
  nokFullName: string
  nokEmail: string
  nokPhone: string
  nokWhatsappNumber: string
}

export const emptyGuestForm: GuestForm = {
  firstName: '', lastName: '', email: '',
  phone: '', whatsappNumber: '',
  gender: '',
  nokFullName: '', nokEmail: '', nokPhone: '', nokWhatsappNumber: '',
}

export interface RegistrationContextValue {
  event: EventData | null
  setEvent: (e: EventData) => void
  quantities: QuantityMap
  setQty: (day: number, slot: string, optionIndex: number, delta: number) => void
  selectOption: (day: number, slot: string, optionIndex: number) => void
  grandTotal: number
  mealSelections: MealSelection[]
  selectedAccommodationId: string
  setSelectedAccommodationId: (id: string) => void
  selectedTransportId: string
  setSelectedTransportId: (id: string) => void
  // Attendee details — persisted across the details/review steps
  guest: GuestForm
  setGuest: Dispatch<SetStateAction<GuestForm>>
  customAnswers: Record<string, string>
  setCustomAnswers: Dispatch<SetStateAction<Record<string, string>>>
  consent: boolean
  setConsent: Dispatch<SetStateAction<boolean>>
  order: OrderData | null
  setOrder: (o: OrderData) => void
  clearOrder: () => void
}

export const RegistrationContext = createContext<RegistrationContextValue | null>(null)