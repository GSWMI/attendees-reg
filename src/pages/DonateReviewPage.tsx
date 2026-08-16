import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { createDonation, initiatePayment } from '../services/api'
import { useRegistration } from '../hooks/useRegistration.ts'
import { Header, AnnouncementBanner, Footer } from '../components/Layout'

export default function DonateReviewPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { event, donate, setDonation } = useRegistration()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const amount = Number(donate.amount) || 0

  useEffect(() => {
    if (!event) navigate(`/events/s/${slug}`)
    else if (!donate.email || amount <= 0) navigate(`/events/s/${slug}/donate`)
  }, [event])

  if (!event || amount <= 0) return null

  const handleCheckout = async () => {
    setLoading(true)
    setError('')
    try {
      const d = await createDonation({
        eventId: event._id ?? event.id ?? '',
        sponsor: {
          name: `${donate.firstName} ${donate.lastName}`.trim(),
          email: donate.email.trim(),
          phone: donate.phone.trim(),
        },
        amount,
        isAnonymous: donate.isAnonymous,
      })
      setDonation(d)
      const id = d._id ?? d.id ?? ''
      const payment = await initiatePayment('donation', id)
      if (payment.paymentUrl) {
        window.location.href = payment.paymentUrl
      } else {
        setError('Could not start payment. Please try again.')
        setLoading(false)
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to process. Please try again.'
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f3] flex flex-col">
      <Header />
      <AnnouncementBanner />

      <main className="flex-1 max-w-[760px] mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(`/events/s/${slug}/donate`)} className="text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[22px] font-bold text-[#0d1b2a]">Order summary</h1>
        </div>

        <div className="max-w-[440px] bg-[#fafbff] border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[16px] font-bold text-[#3b5bdb]">Donation</h2>
            <button onClick={() => navigate(`/events/s/${slug}/donate`)} className="text-[#e8863b] hover:opacity-80 transition-opacity">
              <Pencil size={17} />
            </button>
          </div>

          <div className="flex flex-col gap-2 mb-5">
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-gray-700">Donor</span>
              <span className="text-gray-900">{donate.isAnonymous ? 'Anonymous' : `${donate.firstName} ${donate.lastName}`.trim()}</span>
            </div>
            <div className="flex items-center justify-between bg-[#eef2fb] rounded-lg px-4 py-3 mt-1">
              <span className="text-[14px] font-semibold text-gray-900">Amount</span>
              <span className="text-[15px] font-bold text-gray-900">₦{amount.toLocaleString()}</span>
            </div>
          </div>

          {error && <p className="text-[13px] text-red-500 mb-3">{error}</p>}

          <button onClick={handleCheckout} disabled={loading}
            className={`w-full py-3.5 rounded-lg text-[15px] font-semibold transition-all ${
              loading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#3b5bdb] text-white hover:bg-[#3451c7]'
            }`}>
            {loading ? 'Processing...' : 'Checkout'}
          </button>
        </div>
      </main>

      <Footer />
    </div>
  )
}
