import { useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { ArrowDownToLine } from 'lucide-react'
import { verifyPayment, initiatePayment } from '../services/api'
import { useRegistration } from '../hooks/useRegistration'
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
        if (result.status === 'success' || result.status === 'paid') {
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
  const { event, order } = useRegistration()
  const navigate = useNavigate()
  const ticketRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!order || !event) navigate(`/events/s/${slug}`)
  }, [order, event])

  const handleDownload = async () => {
    if (!ticketRef.current || !order) return
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
      pdf.save(`ticket-${order.orderNumber}.pdf`)
    } catch (err) {
      console.error('Download failed', err)
    }
  }

  if (!order || !event) return null

  return (
    <div className="min-h-screen bg-[#f5f5f3] flex flex-col">
      <Header />
      <AnnouncementBanner />

      <main className="flex-1 max-w-[1000px] mx-auto w-full px-4 py-8">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 min-h-[240px]">
            <div className="overflow-hidden min-h-[180px] md:min-h-0">
              {event.bannerUrl
                ? <img src={event.bannerUrl} alt={event.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-[#1a2f4a] to-[#3b5bdb] min-h-[180px]" />
              }
            </div>
            <div className="p-6 md:p-8 flex flex-col justify-center">
              <h1 className="text-2xl md:text-3xl font-bold text-[#0d1b2a] mb-2">{event.name}</h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[#3b5bdb] font-semibold text-[16px] mb-6">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="18 15 12 9 6 15" />
          </svg>
          Meal ticket
        </div>

        <div className="flex flex-col items-center text-center py-8 px-4">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-[26px] font-bold text-[#0d1b2a] mb-3">Registered!</h2>
          <p className="text-[15px] text-gray-600 mb-2">
            Yay! We can't wait to have you at {event.name}.
          </p>
          <p className="text-[14px] text-gray-500 mb-8">
            A copy of your tickets have been sent to your email. You can also download your ticket here directly.
          </p>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-8 py-3.5 bg-[#3b5bdb] text-white rounded-lg text-[15px] font-semibold hover:bg-[#3451c7] transition-colors"
          >
            Download ticket
            <ArrowDownToLine size={16} />
          </button>
        </div>
      </main>

      <Footer />

      <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, pointerEvents: 'none' }}>
        <TicketDocument ref={ticketRef} order={order} event={event} />
      </div>
    </div>
  )
}