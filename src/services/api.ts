const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://gswmi-backend.onrender.com/api'
const SITE_URL = 'https://gswmi-event.netlify.app'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`
  console.log('🌐 API request:', url)
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  const data = await res.json()
  console.log('📦 API response:', data)
  if (!res.ok) throw new Error(data.message ?? 'Something went wrong')
  return data
}

// ── Event ──────────────────────────────────────────────────────────────────

export interface MealOptionItem {
  name: string
  price: number
  limit?: number
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

export async function getEventBySlug(slug: string): Promise<EventData> {
  const data = await request<Record<string, unknown>>(`/events/s/${slug}`)

  // Unwrap: { success, data: { event: {...}, accommodations: [], transport: [] } }
  const inner = (data as { data: { event: Record<string, unknown>; accommodations?: unknown[]; transport?: unknown } }).data
  const event = (inner?.event ?? inner ?? data) as Record<string, unknown>

  // Normalise id → _id
  if (event.id && !event._id) {
    event._id = event.id
  }

  // Attach accommodations and transport from the same response
  if (inner?.accommodations && !event.accommodations) {
    event.accommodations = inner.accommodations
  }
  if (inner?.transport !== undefined && !event.transport) {
    // transport can be null, array, or object — normalise to array
    const t = inner.transport
    event.transport = Array.isArray(t) ? t : t ? [t] : []
  }

  return event as unknown as EventData
}

// ── Order ──────────────────────────────────────────────────────────────────

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
  guest: { firstName: string; lastName: string; email: string; phone: string }
  mealSelections: MealSelection[]
  customAnswers: { question: string; answer: string }[]
  wantsTransport?: boolean
  accommodationId?: string
}

export interface OrderData {
  _id: string
  orderNumber: string
  status: string
  paymentStatus: string
  totalAmount: number
  guest: { firstName: string; lastName: string; email: string; phone: string }
  mealSelections: MealSelection[]
  qrCodes?: {
    code: string
    qrImage?: string
    type: string
    day?: number
    mealType?: string
    optionName?: string
    direction?: string
    quantity?: number
    redeemed: boolean
  }[]
  paidAt?: string
  paid_at?: string
  createdAt?: string
  created_at?: string
}

export async function createOrder(payload: CreateOrderPayload): Promise<OrderData> {
  const data = await request<Record<string, unknown>>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const inner = (data as { data: { order: OrderData } }).data
  return (inner as { order: OrderData }).order ?? inner ?? data
}

export async function calculateOrder(payload: CreateOrderPayload): Promise<{ totalAmount: number; breakdown: Record<string, number> }> {
  const data = await request<{ success: boolean; data: { totalAmount: number; breakdown: Record<string, number> } }>('/orders/calculate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return (data as { success: boolean; data: { totalAmount: number; breakdown: Record<string, number> } }).data ?? data
}

export async function initiatePayment(orderId: string, slug: string): Promise<{ paymentUrl: string; reference: string }> {
  const callbackUrl = `${SITE_URL}/events/s/${slug}/verify`
  const raw = await request<Record<string, unknown>>(`/orders/${orderId}/pay`, {
    method: 'POST',
    body: JSON.stringify({ callbackUrl }),
  })
  console.log('💳 Raw pay response:', JSON.stringify(raw))
  // Unwrap: { success, data: { authorizationUrl, accessCode, reference } }
  const inner = (raw as { data?: Record<string, unknown> }).data ?? raw
  console.log('💳 Inner pay data:', JSON.stringify(inner))
  const paymentUrl = String(
    inner.authorizationUrl ?? inner.paymentUrl ?? inner.authorization_url ?? ''
  )
  const reference = String(inner.reference ?? inner.accessCode ?? '')
  console.log('💳 paymentUrl:', paymentUrl, 'reference:', reference)
  return { paymentUrl, reference }
}

export async function verifyPayment(reference: string): Promise<{ status: string; order: OrderData }> {
  const data = await request<Record<string, unknown>>(`/orders/verify/${reference}`)
  // Response: { success, message, data: { order: { id, status, paymentStatus, qrCodes, ... } } }
  const inner = (data as { data?: Record<string, unknown> }).data ?? data
  const order = ((inner as { order?: Record<string, unknown> }).order ?? inner) as Record<string, unknown>
  // Normalise id → _id
  if (order && order.id && !order._id) order._id = order.id
  // status is on the order object itself
  const status = String(order.status ?? order.paymentStatus ?? inner.status ?? 'unknown')
  return { status, order: order as unknown as OrderData }
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderData> {
  const data = await request<{ success: boolean; data: { order: OrderData } | OrderData }>(`/orders/lookup/${orderNumber}`)
  const inner = (data as { success: boolean; data: { order: OrderData } }).data
  return (inner as { order: OrderData }).order ?? inner ?? data
}

export async function getAllEvents(): Promise<EventData[]> {
  const data = await request<{ success: boolean; data: { events?: EventData[]; event?: EventData[] } | EventData[] }>('/events/public')
  const inner = (data as { success: boolean; data: unknown }).data ?? data
  if (Array.isArray(inner)) return inner as EventData[]
  const arr = (inner as { events?: EventData[]; event?: EventData[] }).events
    ?? (inner as { event?: EventData[] }).event
    ?? []
  return arr
}