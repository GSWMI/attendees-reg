import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { verifyPayment, initiatePayment, getEventBySlug, getOrderByNumber } from '../services/api'
import type { EventData, OrderData } from '../services/api'
import { useRegistration } from '../hooks/useRegistration.ts'
import { Header, AnnouncementBanner, Footer } from '../components/Layout'
import TicketDocument from '../components/TicketDocument'
import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'

// ── Please Wait ───────────────────────────────────────────────────────────────

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

    initiatePayment('order', orderId)
      .then((payment) => {
        if (payment.paymentUrl) {
          window.location.href = payment.paymentUrl
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
        <h2 className="text-[22px] font-bold text-[#0d1b2a] mb-2">Please wait</h2>
        <p className="text-[15px] text-gray-500">You are now being taken to where to make your payment</p>
      </div>
    </div>
  )
}

// ── Payment Failed ────────────────────────────────────────────────────────────

export function PaymentFailedPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4 px-4">
      <div className="text-center">
        <h2 className="text-[22px] font-bold text-[#0d1b2a] mb-2">Transaction failed</h2>
        <p className="text-[15px] text-gray-500 mb-10">We were unable to process your transaction. Please try again.</p>
        <button
          onClick={() => navigate(slug ? `/events/s/${slug}/register` : '/')}
          className="px-12 py-3.5 bg-[#d32f2f] text-white rounded-lg text-[15px] font-medium hover:bg-[#b71c1c] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

// ── Payment Verify (slug-based callback) ─────────────────────────────────────

export function PaymentVerifyPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const { setOrder, setWhatsappLink } = useRegistration()

  useEffect(() => {
    const reference = searchParams.get('reference') ?? searchParams.get('trxref')
    if (!reference) {
      navigate(`/events/s/${slug}/failed`)
      return
    }
    verifyPayment(reference)
      .then((result) => {
        const ok = ['success', 'paid', 'completed', 'successful'].includes(result.status?.toLowerCase())
        if (ok && result.sponsorship) {
          navigate(`/events/s/${slug}/sponsor/success`)
        } else if (ok && result.order) {
          setOrder(result.order)
          setWhatsappLink(result.whatsappLink ?? null)
          const orderNum = result.order.orderNumber ?? result.order._id ?? ''
          navigate(`/events/s/${slug}/success?order=${encodeURIComponent(orderNum)}`)
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

// ── Success Page ──────────────────────────────────────────────────────────────
// Used for both:
//   /events/s/:slug/success?order=ORD-...   (slug-based, after verify)
//   /payment/success?order=ORD-...           (slug-less, Paystack dashboard callback)

export function SuccessPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const { event: ctxEvent, order: ctxOrder, setOrder, setEvent, whatsappLink: ctxWhatsappLink, resetRegistration } = useRegistration()
  const navigate = useNavigate()
  const ticketRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [order, setLocalOrder] = useState<OrderData | null>(ctxOrder)
  const [event, setLocalEvent] = useState<EventData | null>(ctxEvent)
  // Captured at first render (before resetRegistration runs) — the link comes
  // from the payment verify step and lives only in context.
  const [whatsappLink] = useState<string | null>(ctxWhatsappLink)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // A completed order — wipe the draft so a fresh registration starts clean.
  useEffect(() => { resetRegistration() }, [])

  useEffect(() => {
    const orderNumber = searchParams.get('order')

    if (!orderNumber) {
      // No order number at all — go home
      navigate(slug ? `/events/s/${slug}` : '/')
      return
    }

    // Always fetch fresh from the API on this page.
    // Context may be empty after a full page reload (Paystack redirect).
    getOrderByNumber(orderNumber)
      .then((o) => {
        setLocalOrder(o)
        setOrder(o)
        setLoading(false)
      })
      .catch(() => {
        // If API fails but we have context order, still show it
        if (ctxOrder) {
          setLocalOrder(ctxOrder)
          setLoading(false)
        } else {
          setError(true)
          setLoading(false)
        }
      })

    // Fetch event for the banner and ticket document
    const eventSlug = slug ?? (() => {
      try { return localStorage.getItem('gswmi_event_slug') ?? '' } catch { return '' }
    })()

    if (ctxEvent) {
      setLocalEvent(ctxEvent)
    } else if (eventSlug) {
      getEventBySlug(eventSlug)
        .then((e) => { setLocalEvent(e); setEvent(e) })
        .catch(() => {})
    }
  }, [])

  const handleDownload = async () => {
    if (!ticketRef.current || !order) return
    setDownloading(true)
    try {
      await new Promise((res) => setTimeout(res, 300))
      const dataUrl = await toPng(ticketRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        skipFonts: true,
        filter: (node) => {
          if (node instanceof HTMLImageElement) {
            const src = node.getAttribute('src') ?? ''
            if (src.startsWith('http') && !src.startsWith('data:')) return false
          }
          return true
        },
      })
      const img = new Image()
      img.src = dataUrl
      await new Promise<void>((res) => { img.onload = () => res() })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [img.width / 2, img.height / 2] })
      pdf.addImage(dataUrl, 'PNG', 0, 0, img.width / 2, img.height / 2)
      pdf.save(`ticket-${order.orderNumber ?? 'gswmi'}.pdf`)
    } catch (err) {
      console.error('Download failed', err)
      alert('Download failed. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f3]">
        <div className="w-8 h-8 border-2 border-[#2F64E1] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f5f5f3] px-4">
        <p className="text-[16px] text-gray-600">Could not load your ticket. Please check your email for your ticket details.</p>
        <button onClick={() => navigate('/')} className="px-6 py-2.5 bg-[#3b5bdb] text-white rounded-xl text-[14px] font-medium">
          Go to home
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f3] flex flex-col">
      <Header />
      <AnnouncementBanner />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {event?.bannerUrl && !event.bannerUrl.startsWith('blob:') && (
          <div className="w-full max-w-[600px] h-[200px] rounded-2xl overflow-hidden mb-8 shadow-sm bg-gradient-to-br from-[#1a2f4a] to-[#2F64E1] flex-shrink-0">
            <img src={event.bannerUrl} alt={event?.name ?? ''} className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
        )}

        <div className="text-center max-w-[480px]">
          <div className="text-[64px] mb-4">🎉</div>
          <h2 className="text-[28px] font-bold text-[#0d1b2a] mb-3">Registered!</h2>
          <p className="text-[15px] text-gray-600 mb-2">
            Yay! We can't wait to have you at {event?.name ?? 'the event'}.
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

          {whatsappLink && /^https?:\/\//i.test(whatsappLink) && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-[14px] text-gray-500 mb-3">Join the event WhatsApp group to stay updated.</p>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-white text-[15px] font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: '#25D366' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Join WhatsApp group
              </a>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {order && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, pointerEvents: 'none' }}>
          <TicketDocument
            ref={ticketRef}
            order={order}
            event={event ?? {
              _id: '', name: '', description: '', startDate: '', endDate: '',
              totalDays: 1, registrationOpen: true, mealRegistrationOpen: false,
            }}
          />
        </div>
      )}
    </div>
  )
}

// ── Payment Callback (slug-less, Paystack dashboard) ─────────────────────────

export function PaymentCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setOrder, setWhatsappLink } = useRegistration()

  useEffect(() => {
    const reference = searchParams.get('reference') ?? searchParams.get('trxref')
    if (!reference) {
      navigate('/payment/failed')
      return
    }
    verifyPayment(reference)
      .then((result) => {
        const ok = ['success', 'paid', 'completed', 'successful'].includes(result.status?.toLowerCase())
        if (ok && result.sponsorship) {
          navigate('/payment/sponsor-success')
        } else if (ok && result.order) {
          setOrder(result.order)
          setWhatsappLink(result.whatsappLink ?? null)
          const orderNumber = result.order.orderNumber ?? result.order._id ?? ''
          navigate(`/payment/success?order=${encodeURIComponent(orderNumber)}`)
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

// ── Sponsorship Success ───────────────────────────────────────────────────────

export function SponsorSuccessPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { event, resetRegistration } = useRegistration()

  // A completed sponsorship — wipe the draft so a fresh journey starts clean.
  useEffect(() => { resetRegistration() }, [])

  return (
    <div className="min-h-screen bg-[#f5f5f3] flex flex-col">
      <Header />
      <AnnouncementBanner />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center max-w-[480px]">
          <div className="text-[64px] mb-4">🎉</div>
          <h2 className="text-[28px] font-bold text-[#0d1b2a] mb-3">Thank you for sponsoring!</h2>
          <p className="text-[15px] text-gray-600 mb-2">
            Your sponsorship of {event?.name ?? 'this event'} has been received.
          </p>
          <p className="text-[14px] text-gray-400 mb-8">
            A receipt of your payment has been sent to your email address.
          </p>
          <button
            onClick={() => navigate(slug ? `/events/s/${slug}` : '/')}
            className="px-8 py-3.5 rounded-xl text-white text-[15px] font-semibold"
            style={{ backgroundColor: '#2F64E1' }}
          >
            Done
          </button>
        </div>
      </main>
      <Footer />
    </div>
  )
}