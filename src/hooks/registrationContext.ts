import { createContext } from 'react'
import type { EventData, MealSelection, OrderData } from '../services/api'

export interface QuantityMap {
  [day: number]: {
    [slot: string]: {
      optionIndex: number
      quantity: number
    }
  }
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
  order: OrderData | null
  setOrder: (o: OrderData) => void
  clearOrder: () => void
}

export const RegistrationContext = createContext<RegistrationContextValue | null>(null)