import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { createSponsorship, initiatePayment } from '../services/api'
import type { SponsorshipCategory } from '../services/api'
import { useRegistration } from '../hooks/useRegistration.ts'
import { getUnitPrice, CATEGORY_LABELS } from '../lib/sponsorship'
import { Header, AnnouncementBanner, Footer } from '../components/Layout'

export default function SponsorReviewPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { event, sponsor, setSponsorship } = useRegistration()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If context was lost or the form wasn't completed, go back to the sponsor form.
  useEffect(() => {
    if (!event) navigate(`/events/s/${slug}`)
    else if (!sponsor.sponsorshipType || !sponsor.email) navigate(`/events/s/${slug}/sponsor`)
  }, [event])

  if (!event || !sponsor.sponsorshipType) return null

  const isSpecific = sponsor.sponsorshipType === 'specific'
  const persons = Number(sponsor.numberOfPersons) || 0
  const unit = isSpecific && sponsor.category
    ? getUnitPrice(event, sponsor.category as SponsorshipCategory)
    : null
  const amount = isSpecific
    ? (unit ? unit.price * persons : 0)
    : Number(sponsor.amount) || 0

  const handleCheckout = async () => {
    setLoading(true)
    setError('')
    try {
      const sp = await createSponsorship({
        eventId: event._id ?? event.id ?? '',
        sponsor: {
          name: `${sponsor.firstName} ${sponsor.lastName}`.trim(),
          email: sponsor.email.trim(),
          phone: sponsor.phone.trim(),
        },
        sponsorshipType: sponsor.sponsorshipType as 'general' | 'specific',
        ...(isSpecific ? {
          category: sponsor.category as SponsorshipCategory,
          numberOfPersons: persons,
        } : {}),
        amount,
      })
      setSponsorship(sp)
      const id = sp._id ?? sp.id ?? ''
      const payment = await initiatePayment('sponsorship', id, slug)
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
          <button onClick={() => navigate(`/events/s/${slug}/sponsor`)} className="text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[22px] font-bold text-[#0d1b2a]">Order summary</h1>
        </div>

        <div className="max-w-[440px] bg-[#fafbff] border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[17px] font-bold text-[#3b5bdb]">
              {isSpecific ? 'Specific sponsorship' : 'General sponsorship'}
            </h2>
            <button onClick={() => navigate(`/events/s/${slug}/sponsor`)}
              className="text-[#e8863b] hover:opacity-80 transition-opacity">
              <Pencil size={18} />
            </button>
          </div>

          {isSpecific ? (
            <div className="flex flex-col gap-3 mb-5">
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-gray-700">Cost of {CATEGORY_LABELS[sponsor.category as SponsorshipCategory]} per person</span>
                <span className="text-gray-900">₦{(unit?.price ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-gray-700">No. of persons</span>
                <span className="text-gray-900">{persons}</span>
              </div>
              <div className="flex items-center justify-between bg-[#eef2fb] rounded-lg px-4 py-3 mt-1">
                <span className="text-[14px] font-semibold text-gray-900">Total amount</span>
                <span className="text-[15px] font-bold text-gray-900">₦{amount.toLocaleString()}</span>
              </div>
              {unit?.isPlaceholder && (
                <p className="text-[12px] text-amber-600">
                  Per-person price is a placeholder until admin pricing is set on the event.
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between bg-[#eef2fb] rounded-lg px-4 py-3 mb-5">
              <span className="text-[14px] font-semibold text-gray-900">Amount</span>
              <span className="text-[15px] font-bold text-gray-900">₦{amount.toLocaleString()}</span>
            </div>
          )}

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
