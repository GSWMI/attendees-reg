import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { ArrowDownToLine } from 'lucide-react'
import { verifyPayment, initiatePayment, getEventBySlug } from '../services/api'
import type { EventData, OrderData } from '../services/api'
import { useRegistration } from '../hooks/useRegistration.ts'
import { Header, AnnouncementBanner, Footer } from '../components/Layout'
import TicketDocument from '../components/TicketDocument'
import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'

// ── Please Wait ──────────────────────────────────────────────────────────────
// This page initiates payment itself so navigation doesn't kill the request

export function PleaseWaitPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const initiated = useRef(false)

  useEffect(() => {
    if (initiated.current) return
    initiated.current = true

    const orderId = (location.state as { orderId?: string })?.orderId
    if (!orderId || !slug) {
      navigate(`/events/s/${slug}/failed`)
      return
    }

    initiatePayment(orderId, slug)
      .then((payment) => {
        console.log('💳 Payment response:', payment)
        if (payment.paymentUrl) {
          window.location.href = payment.paymentUrl
        } else {
          console.error('No paymentUrl in response:', payment)
          navigate(`/events/s/${slug}/failed`)
        }
      })
      .catch((err) => {
        console.error('Payment initiation failed:', err)
        navigate(`/events/s/${slug}/failed`)
      })
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-6">
      <div className="w-10 h-10 border-2 border-[#0d1b2a] border-t-transparent rounded-full animate-spin" />
      <div className="text-center">
        <h2 className="text-[22px] font-bold text-[#0d1b2a] mb-2">Please wait</h2>
        <p className="text-[15px] text-gray-500">You are now being taken to where to make your payment</p>
      </div>
    </div>
  )
}

// ── Payment Failed ───────────────────────────────────────────────────────────

export function PaymentFailedPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4 px-4">
      <div className="text-center">
        <h2 className="text-[22px] font-bold text-[#0d1b2a] mb-2">Transaction failed</h2>
        <p className="text-[15px] text-gray-500 mb-10">We were unable to process your transaction. Please try again.</p>
        <button
          onClick={() => navigate(`/events/s/${slug}/register`)}
          className="px-12 py-3.5 bg-[#d32f2f] text-white rounded-lg text-[15px] font-medium hover:bg-[#b71c1c] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

// ── Payment Verify ───────────────────────────────────────────────────────────

export function PaymentVerifyPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const { setOrder } = useRegistration()

  useEffect(() => {
    const reference = searchParams.get('reference') ?? searchParams.get('trxref')
    if (!reference) {
      navigate(`/events/s/${slug}/failed`)
      return
    }
    verifyPayment(reference)
      .then((result) => {
        const successStatuses = ['success', 'paid', 'completed', 'successful']
        if (successStatuses.includes(result.status?.toLowerCase())) {
          setOrder(result.order)
          navigate(`/events/s/${slug}/success`)
        } else {
          navigate(`/events/s/${slug}/failed`)
        }
      })
      .catch(() => navigate(`/events/s/${slug}/failed`))
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-6">
      <div className="w-10 h-10 border-2 border-[#0d1b2a] border-t-transparent rounded-full animate-spin" />
      <div className="text-center">
        <h2 className="text-[22px] font-bold text-[#0d1b2a] mb-2">Verifying payment</h2>
        <p className="text-[15px] text-gray-500">Please wait while we confirm your payment...</p>
      </div>
    </div>
  )
}

// ── Success ──────────────────────────────────────────────────────────────────

export function SuccessPage() {
  const { slug } = useParams<{ slug: string }>()
  const { event: ctxEvent, order: ctxOrder, setOrder, setEvent } = useRegistration()
  const navigate = useNavigate()
  const ticketRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [localOrder, setLocalOrder] = useState<OrderData | null>(null)
  const [localEvent, setLocalEvent] = useState<EventData | null>(null)

  // On mount: use context if available, else fall back to localStorage
  useEffect(() => {
    const order = ctxOrder ?? (() => {
      try {
        const raw = localStorage.getItem('gswmi_order')
        return raw ? JSON.parse(raw) as OrderData : null
      } catch { return null }
    })()

    if (!order) {
      navigate(slug ? `/events/s/${slug}` : '/')
      return
    }

    setLocalOrder(order)
    if (!ctxOrder) setOrder(order)

    // Try to get event from context first, then from order's eventId
    const event = ctxEvent ?? null
    if (event) {
      setLocalEvent(event)
    } else {
      // Try to fetch event by slug stored in localStorage
      const savedSlug = (() => {
        try { return localStorage.getItem('gswmi_event_slug') ?? '' } catch { return '' }
      })()
      if (savedSlug) {
        getEventBySlug(savedSlug).then((e) => {
          setLocalEvent(e)
          setEvent(e)
        }).catch(() => {})
      }
    }
  }, [])

  const order = localOrder ?? ctxOrder
  const event = localEvent ?? ctxEvent

  const handleDownload = async () => {
    if (!ticketRef.current || !order) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(ticketRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      })
      const img = new Image()
      img.src = dataUrl
      await new Promise<void>((res) => { img.onload = () => res() })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [img.width / 2, img.height / 2] })
      pdf.addImage(dataUrl, 'PNG', 0, 0, img.width / 2, img.height / 2)
      pdf.save(`ticket-${order.orderNumber ?? 'gswmi'}.pdf`)
    } catch (err) {
      console.error('Download failed', err)
    } finally {
      setDownloading(false)
    }
  }

  if (!order) return null

  return (
    <div className="min-h-screen bg-[#f5f5f3] flex flex-col">
      <Header />
      <AnnouncementBanner />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Banner */}
        {event?.bannerUrl && !event.bannerUrl.startsWith('blob:') ? (
          <div className="w-full max-w-[600px] h-[200px] rounded-2xl overflow-hidden mb-8 shadow-sm">
            <img src={event.bannerUrl} alt={event.name} className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
        ) : (
          <div className="w-full max-w-[600px] h-[200px] rounded-2xl overflow-hidden mb-8 shadow-sm bg-gradient-to-br from-[#1a2f4a] to-[#2F64E1]" />
        )}

        {/* Content */}
        <div className="text-center max-w-[480px]">
          <div className="text-[64px] mb-4">🎉</div>
          <h2 className="text-[28px] font-bold text-[#0d1b2a] mb-3">Registered!</h2>
          <p className="text-[15px] text-gray-600 mb-2">
            Yay! We can't wait to have you at {event?.name ?? order.guest?.firstName ? `${order.guest.firstName}'s event` : 'the event'}.
          </p>
          <p className="text-[14px] text-gray-400 mb-8">
            A copy of your tickets have been sent to your email. You can also download your ticket here directly.
          </p>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-white text-[15px] font-semibold mx-auto transition-all disabled:opacity-60"
            style={{ backgroundColor: '#2F64E1' }}
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Preparing...
              </>
            ) : (
              <>
                Download ticket
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </>
            )}
          </button>
        </div>
      </main>

      <Footer />

      {/* Hidden ticket for PDF */}
      {order && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, pointerEvents: 'none' }}>
          <TicketDocument ref={ticketRef} order={order} event={event ?? { _id: '', name: '', description: '', startDate: '', endDate: '', totalDays: 1, registrationOpen: true, mealRegistrationOpen: false }} />
        </div>
      )}
    </div>
  )
}


export function PaymentCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setOrder } = useRegistration()

  useEffect(() => {
    const reference = searchParams.get('reference') ?? searchParams.get('trxref')
    if (!reference) {
      navigate('/payment/failed')
      return
    }
    verifyPayment(reference)
      .then((result) => {
        const successStatuses = ['success', 'paid', 'completed', 'successful']
        if (successStatuses.includes(result.status?.toLowerCase())) {
          setOrder(result.order)
          // Persist to localStorage so success page can read after full reload
          try {
            localStorage.setItem('gswmi_order', JSON.stringify(result.order))
          } catch {}
          navigate('/payment/success')
        } else {
          navigate('/payment/failed')
        }
      })
      .catch(() => navigate('/payment/failed'))
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-6">
      <div className="w-10 h-10 border-2 border-[#0d1b2a] border-t-transparent rounded-full animate-spin" />
      <div className="text-center">
        <h2 className="text-[22px] font-bold text-[#0d1b2a] mb-2">Verifying payment</h2>
        <p className="text-[15px] text-gray-500">Please wait while we confirm your payment...</p>
      </div>
    </div>
  )
}