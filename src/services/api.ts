const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://ticket-booking-dev.onrender.com/api'
const SITE_URL = 'https://events.gswmi.com'


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
  mealOptions?: MealOptionGroup[]
  customQuestions?: CustomQuestion[]
  consentText?: string
  registrationOpen: boolean
  mealRegistrationOpen: boolean
  accommodationRegistrationOpen?: boolean
  transportRegistrationOpen?: boolean
  accommodations?: AccommodationData[]
  transport?: TransportData[]
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

export interface CreateOrderPayload {
  eventId: string
  guest: {
    firstName: string
    lastName: string
    email: string
    phone: string
    gender: string
    nextOfKin: { fullName: string; email: string }
  }
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
    gender: string
    nextOfKin: { fullName: string; email: string }
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

// POST /orders/:orderId/pay
// Response: { success, data: { authorizationUrl, accessCode, reference } }
export async function initiatePayment(
  orderId: string,
  slug: string
): Promise<{ paymentUrl: string; reference: string }> {
  const callbackUrl = `${SITE_URL}/events/s/${slug}/verify`
  const raw = await request<{ success: boolean; data: Record<string, unknown> }>(`/orders/${orderId}/pay`, {
    method: 'POST',
    body: JSON.stringify({ callbackUrl }),
  })
  const inner = raw.data ?? (raw as unknown as Record<string, unknown>)
  const paymentUrl = String(inner.authorizationUrl ?? inner.paymentUrl ?? inner.authorization_url ?? '')
  const reference = String(inner.reference ?? inner.accessCode ?? '')
  return { paymentUrl, reference }
}

// GET /orders/verify/:reference
// Response: { success, data: { order: { id, status, paymentStatus, qrCodes, ... } } }
export async function verifyPayment(
  reference: string
): Promise<{ status: string; order: OrderData }> {
  const data = await request<{ success: boolean; data: { order: Record<string, unknown> } }>(
    `/orders/verify/${reference}`
  )
  const inner = data.data ?? (data as unknown as { order: Record<string, unknown> })
  const rawOrder = (inner as { order?: Record<string, unknown> }).order ?? (inner as Record<string, unknown>)
  const order = normalizeId(rawOrder as Record<string, unknown>) as unknown as OrderData
  const status = String(rawOrder.status ?? rawOrder.paymentStatus ?? 'unknown')
  return { status, order }
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