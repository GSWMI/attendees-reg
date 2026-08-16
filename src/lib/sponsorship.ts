import type { EventData } from '../services/api'

// Sponsorship pricing is a DEDICATED admin-configured price list on the event
// (event.sponsorshipUnitPrices), separate from normal ticket prices. The backend
// prices sponsorships from it and rejects categories that aren't configured.
// It must also be returned on the event read for these helpers to work.

export interface SponsorAccItem {
  identifier: string   // accommodation id
  name: string
  price: number        // per-person sponsorship price
}

export function sponsorshipMealPrice(event: EventData | null): number | null {
  const v = event?.sponsorshipUnitPrices?.meal
  return typeof v === 'number' ? v : null
}

export function sponsorshipTransportPrice(event: EventData | null): number | null {
  const v = event?.sponsorshipUnitPrices?.transport
  return typeof v === 'number' ? v : null
}

// Accommodation sponsorship items: the configured per-type prices, joined with
// the event's accommodations list for display names.
export function accommodationSponsorItems(event: EventData | null): SponsorAccItem[] {
  const prices = event?.sponsorshipUnitPrices?.accommodation ?? []
  return prices.map((p) => {
    const acc = event?.accommodations?.find((a) => a._id === p.accommodationId)
    return { identifier: p.accommodationId, name: acc?.name ?? 'Accommodation', price: p.pricePerPerson }
  })
}

// Whether the event has any sponsorship pricing configured at all.
export function sponsorshipConfigured(event: EventData | null): boolean {
  return (
    sponsorshipMealPrice(event) != null ||
    sponsorshipTransportPrice(event) != null ||
    accommodationSponsorItems(event).length > 0
  )
}
