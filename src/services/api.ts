const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://gwmi-backend-staging.onrender.com/api'
const SITE_URL = 'https://events.gswmi.com/'


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
  name: string
  price: number
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
  whatsappLink?: string
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
  // the event. PENDING BACKEND — the UI falls back to placeholders until this
  // is returned by GET /events/s/:slug.
  sponsorshipUnitPrices?: {
    meal?: number
    transport?: number
    accommodation?: { accommodationId: string; name: string; pricePerPerson: number }[]
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
    optionIndex: number
    optionName: string
    price: number
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

// Payment is now handled by a context-aware router that serves both orders and
// sponsorships (replaces the old /orders/:id/pay path).
export type PaymentContext = 'order' | 'sponsorship'

// POST /payments/:context/:resourceId/pay
// Response: { success, data: { authorizationUrl, accessCode, reference } }
export async function initiatePayment(
  context: PaymentContext,
  resourceId: string,
  slug?: string
): Promise<{ paymentUrl: string; reference: string }> {
  // Slug-based verify page for the event flow; slug-less callback otherwise.
  const callbackUrl = slug
    ? `${SITE_URL}/events/s/${slug}/verify`
    : `${SITE_URL}/payment/callback`
  const raw = await request<{ success: boolean; data: Record<string, unknown> }>(
    `/payments/${context}/${resourceId}/pay`,
    {
      method: 'POST',
      body: JSON.stringify({ callbackUrl }),
    }
  )
  const inner = raw.data ?? (raw as unknown as Record<string, unknown>)
  const paymentUrl = String(inner.authorizationUrl ?? inner.paymentUrl ?? inner.authorization_url ?? '')
  const reference = String(inner.reference ?? inner.accessCode ?? '')
  return { paymentUrl, reference }
}

// GET /payments/verify/:reference
// The reference already carries its context, so we don't pass it again.
// For an order context, data holds the order; for sponsorship, the sponsorship.
export async function verifyPayment(
  reference: string
): Promise<{ status: string; order?: OrderData; sponsorship?: SponsorshipData }> {
  const data = await request<{ success: boolean; data: Record<string, unknown> }>(
    `/payments/verify/${reference}`
  )
  const inner = (data.data ?? (data as unknown as Record<string, unknown>)) as Record<string, unknown>

  // Sponsorship result
  if (inner.sponsorship || inner.sponsorshipType) {
    const rawSp = (inner.sponsorship ?? inner) as Record<string, unknown>
    const sponsorship = normalizeId(rawSp) as unknown as SponsorshipData
    const status = String(rawSp.status ?? rawSp.paymentStatus ?? 'unknown')
    return { status, sponsorship }
  }

  // Order result (default)
  const rawOrder = (inner.order ?? inner) as Record<string, unknown>
  const order = normalizeId(rawOrder) as unknown as OrderData
  const status = String(rawOrder.status ?? rawOrder.paymentStatus ?? 'unknown')
  return { status, order }
}

// ── Sponsorship ─────────────────────────────────────────────────────────────

export type SponsorshipType = 'general' | 'specific'
export type SponsorshipCategory = 'meal' | 'accommodation' | 'transport'

export interface CreateSponsorshipPayload {
  eventId: string
  sponsor: { name: string; email: string; phone: string }
  sponsorshipType: SponsorshipType
  category?: SponsorshipCategory // required when sponsorshipType === 'specific'
  numberOfPersons?: number
  amount: number
}

export interface SponsorshipData {
  _id: string
  id?: string
  status?: string
  paymentStatus?: string
  eventId: string
  sponsor: { name: string; email: string; phone: string }
  sponsorshipType: SponsorshipType
  category?: SponsorshipCategory
  numberOfPersons?: number
  amount: number
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

// GET /orders/lookup/:orderNumber
export async function getOrderByNumber(orderNumber: string): Promise<OrderData> {
  const data = await request<{ success: boolean; data: { order: OrderData } | OrderData }>(
    `/orders/lookup/${orderNumber}`
  )
  const inner = (data as { success: boolean; data: { order?: OrderData } }).data
  const raw = ((inner as { order?: OrderData }).order ?? inner ?? data) as Record<string, unknown>
  return normalizeId(raw) as unknown as OrderData
}