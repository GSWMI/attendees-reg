import type { EventData, SponsorshipCategory } from '../services/api'

// PLACEHOLDER per-person prices, used only until the backend returns real
// values in event.sponsorshipUnitPrices. See the registration-flow-redesign
// note — Specific Sponsorship totals are provisional until then.
export const PLACEHOLDER_UNIT_PRICES: Record<SponsorshipCategory, number> = {
  meal: 6500,
  accommodation: 20000,
  transport: 5000,
}

export const CATEGORY_LABELS: Record<SponsorshipCategory, string> = {
  meal: 'meal',
  accommodation: 'accommodation',
  transport: 'transport',
}

// Resolve the per-person unit price for a sponsorship category. Falls back to a
// placeholder (flagged) when the event has no admin-set price yet.
export function getUnitPrice(
  event: EventData | null,
  category: SponsorshipCategory
): { price: number; isPlaceholder: boolean } {
  const up = event?.sponsorshipUnitPrices
  if (up) {
    if (category === 'meal' && typeof up.meal === 'number') return { price: up.meal, isPlaceholder: false }
    if (category === 'transport' && typeof up.transport === 'number') return { price: up.transport, isPlaceholder: false }
    if (category === 'accommodation' && up.accommodation && up.accommodation.length > 0) {
      return { price: up.accommodation[0].pricePerPerson, isPlaceholder: false }
    }
  }
  return { price: PLACEHOLDER_UNIT_PRICES[category], isPlaceholder: true }
}
