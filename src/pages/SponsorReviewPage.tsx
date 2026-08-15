import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { createSponsorship, initiatePayment } from '../services/api'
import type { SponsorshipCategories } from '../services/api'
import { useRegistration } from '../hooks/useRegistration.ts'
import { sponsorshipMealPrice, sponsorshipTransportPrice, accommodationSponsorItems } from '../lib/sponsorship'
import { Header, AnnouncementBanner, Footer } from '../components/Layout'

export default function SponsorReviewPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { event, sponsor, setSponsorship } = useRegistration()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hasSelection =
    sponsor.mealPersons > 0 ||
    sponsor.transportPersons > 0 ||
    Object.values(sponsor.accommodationPersons).some((n) => n > 0)

  useEffect(() => {
    if (!event) navigate(`/events/s/${slug}`)
    else if (!sponsor.email || !hasSelection) navigate(`/events/s/${slug}/sponsor`)
  }, [event])

  if (!event || !hasSelection) return null

  const mealPrice = sponsorshipMealPrice(event) ?? 0
  const transportPrice = sponsorshipTransportPrice(event) ?? 0
  const accItems = accommodationSponsorItems(event)

  // Per-category breakdown from the configured sponsorship prices.
  const accLines = accItems
    .filter((a) => (sponsor.accommodationPersons[a.identifier] ?? 0) > 0)
    .map((a) => ({ name: a.name, persons: sponsor.accommodationPersons[a.identifier], amount: a.price * sponsor.accommodationPersons[a.identifier] }))

  const mealTotal = mealPrice * sponsor.mealPersons
  const accPersons = accLines.reduce((n, l) => n + l.persons, 0)
  const accTotal = accLines.reduce((n, l) => n + l.amount, 0)
  const transportTotal = transportPrice * sponsor.transportPersons
  const grandTotal = mealTotal + transportTotal + accTotal

  const handleCheckout = async () => {
    setLoading(true)
    setError('')
    try {
      const categories: SponsorshipCategories = {}
      if (sponsor.mealPersons > 0) categories.meal = sponsor.mealPersons
      if (sponsor.transportPersons > 0) categories.transport = sponsor.transportPersons
      const accSel = accItems
        .filter((a) => (sponsor.accommodationPersons[a.identifier] ?? 0) > 0)
        .map((a) => ({ identifier: a.identifier, numberOfPersons: sponsor.accommodationPersons[a.identifier] }))
      if (accSel.length) categories.accommodation = accSel

      const sp = await createSponsorship({
        eventId: event._id ?? event.id ?? '',
        sponsor: {
          name: `${sponsor.firstName} ${sponsor.lastName}`.trim(),
          email: sponsor.email.trim(),
          phone: sponsor.phone.trim(),
        },
        categories,
      })
      setSponsorship(sp)
      const id = sp._id ?? sp.id ?? ''
      const payment = await initiatePayment('sponsorship', id)
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

        <div className="max-w-[460px] bg-[#fafbff] border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[16px] font-bold text-[#3b5bdb]">Sponsorship</h2>
            <button onClick={() => navigate(`/events/s/${slug}/sponsor`)} className="text-[#e8863b] hover:opacity-80 transition-opacity">
              <Pencil size={17} />
            </button>
          </div>

          <div className="flex flex-col gap-3 mb-5">
            {mealTotal > 0 && (
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-gray-700">Meal total for {sponsor.mealPersons} person{sponsor.mealPersons > 1 ? 's' : ''}</span>
                <span className="text-gray-900">₦{mealTotal.toLocaleString()}</span>
              </div>
            )}
            {transportTotal > 0 && (
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-gray-700">Transport total for {sponsor.transportPersons} person{sponsor.transportPersons > 1 ? 's' : ''}</span>
                <span className="text-gray-900">₦{transportTotal.toLocaleString()}</span>
              </div>
            )}
            {accTotal > 0 && (
              <div>
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-gray-700">Accommodation total for {accPersons} person{accPersons > 1 ? 's' : ''}</span>
                  <span className="text-gray-900">₦{accTotal.toLocaleString()}</span>
                </div>
                {accLines.map((l, i) => (
                  <div key={i} className="flex items-center justify-between text-[12px] text-gray-500 pl-3">
                    <span>{l.name} × {l.persons}</span><span>₦{l.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between bg-[#eef2fb] rounded-lg px-4 py-3 mb-5">
            <span className="text-[14px] font-semibold text-gray-900">Total amount</span>
            <span className="text-[15px] font-bold text-gray-900">₦{grandTotal.toLocaleString()}</span>
          </div>

          {error && <p className="text-[13px] text-red-500 mb-3">{error}</p>}

          <button onClick={handleCheckout} disabled={loading}
            className={`w-full py-3.5 rounded-lg text-[15px] font-semibold transition-all ${
              loading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#3b5bdb] text-white hover:bg-[#3451c7]'
            }`}>
            {loading ? 'Processing...' : 'Checkout'}
          </button>
          <p className="text-[11px] text-gray-400 text-center mt-2">Final amount is confirmed by our server before payment.</p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
