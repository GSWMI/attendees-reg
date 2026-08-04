import { createContext, type Dispatch, type SetStateAction } from 'react'
import type { EventData, MealSelection, OrderData, SponsorshipData } from '../services/api'

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

// Which registration path the user picked on the landing screen.
export type RegMode = 'myself' | 'someone-else' | 'sponsor'

// Payer details, collected only in the "someone else" flow.
export interface PurchaserForm {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export const emptyPurchaser: PurchaserForm = { firstName: '', lastName: '', email: '', phone: '' }

// Sponsorship form draft (sponsor details + what they're sponsoring).
export interface SponsorForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  sponsorshipType: '' | 'general' | 'specific'
  category: '' | 'meal' | 'accommodation' | 'transport'
  numberOfPersons: string // kept as string for the input; parsed on submit
  amount: string          // general sponsorship free-form amount
}

export const emptySponsorForm: SponsorForm = {
  firstName: '', lastName: '', email: '', phone: '',
  sponsorshipType: '', category: '', numberOfPersons: '', amount: '',
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
  // Which flow the user is in (myself / someone-else / sponsor)
  mode: RegMode | null
  setMode: Dispatch<SetStateAction<RegMode | null>>
  // Attendee details — persisted across the details/review steps
  guest: GuestForm
  setGuest: Dispatch<SetStateAction<GuestForm>>
  // Payer details — only used in the "someone else" flow
  purchaser: PurchaserForm
  setPurchaser: Dispatch<SetStateAction<PurchaserForm>>
  customAnswers: Record<string, string>
  setCustomAnswers: Dispatch<SetStateAction<Record<string, string>>>
  consent: boolean
  setConsent: Dispatch<SetStateAction<boolean>>
  // Sponsorship draft — persisted across the sponsor form/review steps
  sponsor: SponsorForm
  setSponsor: Dispatch<SetStateAction<SponsorForm>>
  order: OrderData | null
  setOrder: (o: OrderData) => void
  clearOrder: () => void
  sponsorship: SponsorshipData | null
  setSponsorship: (s: SponsorshipData | null) => void
  // Clears mode + all draft form state (called after a completed payment).
  resetRegistration: () => void
}

// Key under which the chosen mode is persisted for the tab session, so a
// refresh mid-journey doesn't lose it.
export const MODE_STORAGE_KEY = 'gswmi_reg_mode'

export const RegistrationContext = createContext<RegistrationContextValue | null>(null)