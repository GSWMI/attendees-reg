const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://gswmi-backend-prod.onrender.com/api'


async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? 'Something went wrong')
  return data
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Normalize id → _id on any object so components can use _id safely
function normalizeId<T extends Record<string, unknown>>(obj: T): T {
  if (obj && obj.id && !obj._id) {
    return { ...obj, _id: obj.id }
  }
  return obj
}

// ── Event ─────────────────────────────────────────────────────────────────────

export interface MealOptionItem {
  code: string          // stable id; orders reference options by code
  name: string
  price: number
  maxPerOrder?: number | null
  limit?: number | null
}

export interface MealOptionGroup {
  day: number
  slot: string
  options: MealOptionItem[]
}

export interface CustomQuestion {
  question: string
  required: boolean
}

export interface AccommodationData {
  _id: string
  name: string
  description: string
  price: number
  peoplePerRoom: number
  totalCapacity: number
  available: boolean
  amenities?: string[]
}

export interface TransportData {
  _id: string
  name: string
  description: string
  price: number
  available: boolean
  pickupLocation: string
  dropoffLocation: string
}

export interface EventData {
  id?: string
  _id: string
  name: string
  description: string
  startDate: string
  endDate: string
  totalDays: number
  location?: string
  bannerUrl?: string
  slug?: string
  mealOptions?: MealOptionGroup[]
  customQuestions?: CustomQuestion[]
  consentText?: string
  registrationOpen: boolean
  mealRegistrationOpen: boolean
  accommodationRegistrationOpen?: boolean
  transportRegistrationOpen?: boolean
  accommodations?: AccommodationData[]
  transport?: TransportData[]
  // Per-person unit prices for Specific Sponsorship. Set once by the admin on
  // the event; returned by GET /events/s/:slug. Absent when the admin hasn't
  // configured sponsorship pricing (the sponsor flow gates in that case).
  sponsorshipUnitPrices?: {
    meal?: number
    transport?: number
    accommodation?: { accommodationId: string; name?: string; pricePerPerson: number }[]
  }
}

// GET /events/s/:slug
// Response: { success, data: { event: {...}, accommodations: [...], transport: [...] } }
// accommodations and transport are siblings of event, not nested inside it
export async function getEventBySlug(slug: string): Promise<EventData> {
  const data = await request<{ success: boolean; data: Record<string, unknown> }>(`/events/s/${slug}`)
  const inner = data.data ?? {}

  const rawEvent = (inner.event ?? inner) as Record<string, unknown>
  const event = normalizeId(rawEvent)

  // Attach accommodations — sibling of event in the response
  if (inner.accommodations && !event.accommodations) {
    const raw = inner.accommodations as Record<string, unknown>[]
    event.accommodations = raw.map(normalizeId)
  }

  // Attach transport — sibling of event in the response
  if (inner.transport !== undefined && !event.transport) {
    const t = inner.transport
    const rawArr: Record<string, unknown>[] = Array.isArray(t) ? t : t ? [t as Record<string, unknown>] : []
    event.transport = rawArr.map(normalizeId)
  }

  return event as unknown as EventData
}

// GET /events/public — public endpoint, no auth required
// Response: { success, data: { events: [...] } }
export async function getAllEvents(): Promise<EventData[]> {
  const data = await request<{ success: boolean; data: { events: EventData[] } }>('/events/public')
  const events = data?.data?.events ?? []
  return events.map((e) => normalizeId(e as unknown as Record<string, unknown>)) as unknown as EventData[]
}

// ── Order ─────────────────────────────────────────────────────────────────────

export interface MealSelection {
  day: number
  meals: {
    slot: string
    code: string         // backend identifies the option by code
    optionName: string   // kept for display in summaries
    price: number        // kept for display/totals
    quantity: number
  }[]
}

// Payer details — present when someone pays for another registrant.
// Receipts go to the purchaser; the ticket goes to the guest.
export interface PurchaserData {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export interface CreateOrderPayload {
  eventId: string
  guest: {
    firstName: string
    lastName: string
    email: string
    phone: string
    whatsappNumber: string
    gender: string
    nextOfKin: { fullName: string; email: string; phone: string; whatsappNumber: string }
  }
  purchaser?: PurchaserData
  mealSelections: MealSelection[]
  customAnswers: { question: string; answer: string }[]
  accommodationId?: string
  transportId?: string  // backend expects transportId, not wantsTransport
}

export interface OrderData {
  _id: string
  orderNumber: string
  status: string
  paymentStatus: string
  totalAmount: number
  guest: {
    firstName: string
    lastName: string
    email: string
    phone: string
    whatsappNumber: string
    gender: string
    nextOfKin: { fullName: string; email: string; phone: string; whatsappNumber: string }
  }
  // Present when someone paid for another registrant (pay for someone else).
  purchaser?: PurchaserData
  mealSelections: MealSelection[]
  qrCodes?: {
    code: string
    qrImage?: string
    type: string
    day?: number
    mealType?: string
    optionName?: string
    direction?: string
    pickupLocation?: string
    accommodationName?: string
    quantity?: number
    redeemed: boolean
  }[]
  paidAt?: string
  paid_at?: string
  createdAt?: string
  created_at?: string
}

export async function createOrder(payload: CreateOrderPayload): Promise<OrderData> {
  const data = await request<{ success: boolean; data: { order: OrderData } }>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const order = data.data?.order ?? (data.data as unknown as OrderData) ?? (data as unknown as OrderData)
  return normalizeId(order as unknown as Record<string, unknown>) as unknown as OrderData
}

export async function calculateOrder(
  payload: CreateOrderPayload
): Promise<{ totalAmount: number; breakdown: Record<string, number> }> {
  const data = await request<{ success: boolean; data: { totalAmount: number; breakdown: Record<string, number> } }>(
    '/orders/calculate',
    { method: 'POST', body: JSON.stringify(payload) }
  )
  return data.data ?? (data as unknown as { totalAmount: number; breakdown: Record<string, number> })
}

// Payment is handled by a context-aware router serving orders, sponsorships
// and donations (replaces the old /orders/:id/pay path).
export type PaymentContext = 'order' | 'sponsorship' | 'donation'

// The payment context is encoded in the reference prefix by the backend
// (PAY_ORD_… / PAY_SPN_… / PAY_DON_…).
export function contextFromReference(reference: string): PaymentContext {
  if (/^PAY[_-]?SPN/i.test(reference)) return 'sponsorship'
  if (/^PAY[_-]?DON/i.test(reference)) return 'donation'
  return 'order'
}

// POST /payments/:context/:resourceId/initiate
// Response: { success, data: { authorizationUrl, accessCode, reference } }
// (Postman documents this as /pay, but the deployed route is /initiate.)
// We send an origin-based callbackUrl so each environment (localhost / prod)
// gets the right return URL. NOTE: the backend must forward this to Paystack's
// `callback_url`; until it does, Paystack falls back to the fixed dashboard URL.
export async function initiatePayment(
  context: PaymentContext,
  resourceId: string
): Promise<{ paymentUrl: string; reference: string }> {
  const callbackUrl = `${window.location.origin}/payment/callback`
  const raw = await request<{ success: boolean; data: Record<string, unknown> }>(
    `/payments/${context}/${resourceId}/initiate`,
    { method: 'POST', body: JSON.stringify({ callbackUrl }) }
  )
  const inner = raw.data ?? (raw as unknown as Record<string, unknown>)
  const paymentUrl = String(inner.authorizationUrl ?? inner.paymentUrl ?? inner.authorization_url ?? '')
  const reference = String(inner.reference ?? inner.accessCode ?? '')
  return { paymentUrl, reference }
}

// GET /payments/verify/:reference
// Context is derived from the reference prefix (PAY_ORD_… / PAY_SPN_…).
// Order verify returns the order plus a whatsappLink (only exposed here, never
// on the public event read). Sponsorship verify returns the sponsorship object.
export async function verifyPayment(
  reference: string
): Promise<{
  status: string
  context: PaymentContext
  order?: OrderData
  sponsorship?: SponsorshipData
  donation?: DonationData
  whatsappLink?: string
}> {
  const data = await request<{ success: boolean; data: Record<string, unknown> }>(
    `/payments/verify/${reference}`
  )
  const inner = (data.data ?? (data as unknown as Record<string, unknown>)) as Record<string, unknown>
  const ctx = contextFromReference(reference)

  if (ctx === 'sponsorship' || inner.sponsorship) {
    const rawSp = (inner.sponsorship ?? inner) as Record<string, unknown>
    const sponsorship = normalizeId(rawSp) as unknown as SponsorshipData
    const status = String(rawSp.paymentStatus ?? rawSp.status ?? 'unknown')
    return { status, context: 'sponsorship', sponsorship }
  }

  if (ctx === 'donation' || inner.donation) {
    const rawD = (inner.donation ?? inner) as Record<string, unknown>
    const donation = normalizeId(rawD) as unknown as DonationData
    const status = String(rawD.paymentStatus ?? rawD.status ?? 'unknown')
    return { status, context: 'donation', donation }
  }

  const rawOrder = (inner.order ?? inner) as Record<string, unknown>
  const order = normalizeId(rawOrder) as unknown as OrderData
  const status = String(rawOrder.status ?? rawOrder.paymentStatus ?? 'unknown')
  const whatsappLink = (inner.whatsappLink ?? rawOrder.whatsappLink) as string | undefined
  return { status, context: 'order', order, whatsappLink }
}

// ── Sponsorship (sponsor individuals across categories) ──────────────────────

export type SponsorshipCategory = 'meal' | 'accommodation' | 'transport'

// One selected item within a category (meal option or accommodation type),
// identified by its code/id, with the number of persons sponsored.
export interface CategoryItemSelection {
  identifier: string
  numberOfPersons: number
}

// Categories payload. meal & transport are single flat counts (one configured
// sponsorship price each); accommodation is an array of per-type selections.
export interface SponsorshipCategories {
  meal?: number
  transport?: number
  accommodation?: CategoryItemSelection[]
}

export interface CreateSponsorshipPayload {
  eventId: string
  sponsor: { name: string; email: string; phone: string }
  categories: SponsorshipCategories
}

// Per-category computed breakdown returned by the backend.
export interface SponsorshipCategoryDetails {
  meal?: { numberOfPersons: number; amount: number; identifier?: string } | { numberOfPersons: number; amount: number; identifier?: string }[]
  transport?: { numberOfPersons: number; amount: number }
  accommodation?: { numberOfPersons: number; amount: number; identifier?: string }[]
}

export interface SponsorshipData {
  _id: string
  id?: string
  referenceNumber?: string
  status?: string
  paymentStatus?: string
  eventId: string
  sponsor: { name: string; email: string; phone: string }
  categoryDetails?: SponsorshipCategoryDetails
  amount: number
  totalAmount?: number
}

// POST /sponsorships → returns the created sponsorship (id used as the payment resourceId)
export async function createSponsorship(payload: CreateSponsorshipPayload): Promise<SponsorshipData> {
  const data = await request<{ success: boolean; data: { sponsorship?: SponsorshipData } | SponsorshipData }>(
    '/sponsorships',
    { method: 'POST', body: JSON.stringify(payload) }
  )
  const inner = (data as { data?: unknown }).data ?? data
  const raw = ((inner as { sponsorship?: SponsorshipData }).sponsorship ?? inner) as Record<string, unknown>
  return normalizeId(raw) as unknown as SponsorshipData
}

// ── Donation (open amount) ───────────────────────────────────────────────────

export interface CreateDonationPayload {
  eventId: string
  sponsor: { name: string; email: string; phone: string }
  amount: number
  isAnonymous: boolean
}

export interface DonationData {
  _id: string
  id?: string
  referenceNumber?: string
  status?: string
  paymentStatus?: string
  eventId: string
  sponsor: { name: string; email: string; phone: string }
  isAnonymous?: boolean
  amount: number
  totalAmount?: number
}

// POST /donations → returns the created donation (id used as the payment resourceId)
export async function createDonation(payload: CreateDonationPayload): Promise<DonationData> {
  const data = await request<{ success: boolean; data: { donation?: DonationData } | DonationData }>(
    '/donations',
    { method: 'POST', body: JSON.stringify(payload) }
  )
  const inner = (data as { data?: unknown }).data ?? data
  const raw = ((inner as { donation?: DonationData }).donation ?? inner) as Record<string, unknown>
  return normalizeId(raw) as unknown as DonationData
}

// GET /orders/lookup/:orderNumber
export async function getOrderByNumber(orderNumber: string): Promise<OrderData> {
  const data = await request<{ success: boolean; data: { order: OrderData } | OrderData }>(
    `/orders/lookup/${orderNumber}`
  )
  const inner = (data as { success: boolean; data: { order?: OrderData } }).data
  const raw = ((inner as { order?: OrderData }).order ?? inner ?? data) as Record<string, unknown>
  return normalizeId(raw) as unknown as OrderData
}