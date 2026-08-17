import { createContext, type Dispatch, type SetStateAction } from 'react'
import type { EventData, MealSelection, OrderData, SponsorshipData, DonationData } from '../services/api'

// Meal quantities: per day → per slot → per option index → quantity.
// Multiple options can be selected within the same slot (each with its own qty).
export interface QuantityMap {
  [day: number]: {
    [slot: string]: {
      [optionIndex: number]: number
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
export type RegMode = 'myself' | 'someone-else' | 'sponsor' | 'donate'

// Payer details, collected only in the "someone else" flow.
export interface PurchaserForm {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export const emptyPurchaser: PurchaserForm = { firstName: '', lastName: '', email: '', phone: '' }

// Sponsor-individuals draft: sponsor details + persons per selected item.
// mealPersons/accommodationPersons are keyed by option identifier (meal code /
// accommodation id); transportPersons is a single flat count.
export interface SponsorForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  categories: SponsorshipCategoryKey[]  // which category chips are active
  mealPersons: number                   // single meal sponsorship price → one count
  transportPersons: number              // single transport price → one count
  accommodationPersons: Record<string, number> // by accommodation id (per type)
}

export type SponsorshipCategoryKey = 'meal' | 'transport' | 'accommodation'

export const emptySponsorForm: SponsorForm = {
  firstName: '', lastName: '', email: '', phone: '',
  categories: [], mealPersons: 0, transportPersons: 0, accommodationPersons: {},
}

// Donate draft (open amount).
export interface DonateForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  amount: string       // kept as string for the input; parsed on submit
  isAnonymous: boolean
}

export const emptyDonateForm: DonateForm = {
  firstName: '', lastName: '', email: '', phone: '', amount: '', isAnonymous: false,
}

export interface RegistrationContextValue {
  event: EventData | null
  setEvent: (e: EventData) => void
  quantities: QuantityMap
  setQty: (day: number, slot: string, optionIndex: number, delta: number) => void
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
  // Sponsor-individuals draft — persisted across the sponsor form/review steps
  sponsor: SponsorForm
  setSponsor: Dispatch<SetStateAction<SponsorForm>>
  // Donate draft
  donate: DonateForm
  setDonate: Dispatch<SetStateAction<DonateForm>>
  order: OrderData | null
  setOrder: (o: OrderData) => void
  clearOrder: () => void
  sponsorship: SponsorshipData | null
  setSponsorship: (s: SponsorshipData | null) => void
  donation: DonationData | null
  setDonation: (d: DonationData | null) => void
  // WhatsApp group link — only returned by the payment verify endpoint, so it's
  // captured there and read on the success page.
  whatsappLink: string | null
  setWhatsappLink: (v: string | null) => void
  // Clears mode + all draft form state (called after a completed payment).
  resetRegistration: () => void
}

// Key under which the chosen mode is persisted for the tab session, so a
// refresh mid-journey doesn't lose it.
export const MODE_STORAGE_KEY = 'gswmi_reg_mode'

export const RegistrationContext = createContext<RegistrationContextValue | null>(null)