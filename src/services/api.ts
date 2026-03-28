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
}

export async function getEventBySlug(slug: string): Promise<EventData> {
  const data = await request<Record<string, unknown>>(`/events/s/${slug}`)

  console.log('🔍 Raw data:', data)
  console.log('🔍 data.data:', (data as Record<string, unknown>).data)
  console.log('🔍 data.data.event:', ((data as Record<string, unknown>).data as Record<string, unknown>)?.event)

  // Unwrap: { success, data: { event: {...} } }
  const inner = (data as { data: { event: Record<string, unknown> } }).data
  const event = inner?.event ?? inner ?? data

  console.log('✅ Final event:', event)

  // Normalise id → _id
  if (event.id && !event._id) {
    event._id = event.id
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
    type: string
    day?: number
    mealType?: string
    redeemed: boolean
  }[]
  paidAt?: string
  createdAt: string
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
  const data = await request<{ success: boolean; data: { paymentUrl: string; reference: string } }>(`/orders/${orderId}/pay`, {
    method: 'POST',
    body: JSON.stringify({ callbackUrl }),
  })
  return (data as { success: boolean; data: { paymentUrl: string; reference: string } }).data ?? data
}

export async function verifyPayment(reference: string): Promise<{ status: string; order: OrderData }> {
  const data = await request<{ success: boolean; data: { status: string; order: OrderData } }>(`/orders/verify/${reference}`)
  return (data as { success: boolean; data: { status: string; order: OrderData } }).data ?? data
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderData> {
  const data = await request<{ success: boolean; data: { order: OrderData } | OrderData }>(`/orders/lookup/${orderNumber}`)
  const inner = (data as { success: boolean; data: { order: OrderData } }).data
  return (inner as { order: OrderData }).order ?? inner ?? data
}