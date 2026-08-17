import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { createOrder } from '../services/api'
import { useRegistration } from '../hooks/useRegistration.ts'
import { Header, AnnouncementBanner, Footer } from '../components/Layout'

type Gateway = 'paystack'

export default function ReviewPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const {
    event, mode, mealSelections, grandTotal, selectedAccommodationId, selectedTransportId,
    guest, purchaser, customAnswers, setOrder,
  } = useRegistration()

  const isSomeoneElse = mode === 'someone-else'

  const [gateway, setGateway] = useState<Gateway | null>('paystack')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If context was lost (e.g. full page reload landed here directly), send the
  // user back to the right step rather than showing an empty review.
  useEffect(() => {
    if (!event) {
      navigate(`/events/s/${slug}`)
    } else if (!guest.firstName || !guest.email) {
      navigate(`/events/s/${slug}/register`)
    }
  }, [event])

  if (!event || !guest.firstName) return null

  const editItems = () => navigate(`/events/s/${slug}/tickets`)
  const editDetails = () => navigate(`/events/s/${slug}/register`)

  const hasMeal = mealSelections.length > 0 && mealSelections.some((s) => s.meals.length > 0)
  const acc = selectedAccommodationId ? event.accommodations?.find((a) => a._id === selectedAccommodationId) : null
  const transport = selectedTransportId ? event.transport?.find((t) => t._id === selectedTransportId) : null
  const accPrice = acc?.price ?? 0
  const transportPrice = transport?.price ?? 0
  const overallTotal = (hasMeal ? grandTotal : 0) + accPrice + transportPrice

  const answeredQuestions = (event.customQuestions ?? [])
    .map((q) => ({ question: q.question, answer: customAnswers[q.question]?.trim() ?? '' }))
    .filter((a) => a.answer)

  const handleConfirm = async () => {
    if (!gateway) { setError('Please choose a payment gateway'); return }
    setLoading(true)
    setError('')
    try {
      const order = await createOrder({
        eventId: event._id ?? event.id ?? '',
        guest: {
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
          phone: guest.phone.trim(),
          whatsappNumber: guest.whatsappNumber.trim(),
          gender: guest.gender,
          nextOfKin: {
            fullName: guest.nokFullName.trim(),
            email: guest.nokEmail.trim(),
            phone: guest.nokPhone.trim(),
            whatsappNumber: guest.nokWhatsappNumber.trim(),
          },
        },
        ...(isSomeoneElse && purchaser.email ? {
          purchaser: {
            firstName: purchaser.firstName.trim(),
            lastName: purchaser.lastName.trim(),
            email: purchaser.email.trim(),
            phone: purchaser.phone.trim(),
          },
        } : {}),
        mealSelections,
        customAnswers: Object.entries(customAnswers).map(([question, answer]) => ({ question, answer })),
        ...(selectedAccommodationId ? { accommodationId: selectedAccommodationId } : {}),
        ...(selectedTransportId ? { transportId: selectedTransportId } : {}),
      })
      setOrder(order)
      const orderId = order._id ?? (order as { id?: string }).id
      navigate(`/events/s/${slug}/please-wait`, { state: { orderId } })
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

      <main className="flex-1 max-w-[1000px] mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={editDetails} className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[22px] font-bold text-[#0d1b2a]">Review your order</h1>
        </div>
        <p className="text-[14px] text-gray-500 mb-8 pl-8">
          Please confirm everything below before payment. You can edit any section.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          {/* Left: selected items + attendee details */}
          <div className="flex flex-col gap-4">

            {/* Selected items */}
            <SectionCard title="Selected items" onEdit={editItems}>
              {!hasMeal && !acc && !transport && (
                <p className="text-[13px] text-gray-400">No items selected.</p>
              )}

              {hasMeal && (
                <div className="mb-4">
                  <p className="text-[13px] font-semibold text-gray-800 mb-2">Meal ticket</p>
                  {mealSelections.map((sel) => (
                    <div key={sel.day} className="mb-2">
                      <p className="text-[11px] font-bold text-[#3b5bdb] uppercase tracking-widest mb-1">Day {sel.day}</p>
                      {sel.meals.map((meal, i) => (
                        <div key={i} className="flex justify-between text-[13px] text-gray-600 mb-0.5">
                          <span className="capitalize">{meal.slot} — {meal.optionName} ×{meal.quantity}</span>
                          <span className="whitespace-nowrap ml-3">₦{(meal.price * meal.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {acc && (
                <div className="flex justify-between text-[13px] text-gray-700 mb-2 pt-2 border-t border-gray-100">
                  <span className="font-medium">Accommodation — {acc.name}</span>
                  <span className="whitespace-nowrap ml-3">₦{accPrice.toLocaleString()}</span>
                </div>
              )}

              {transport && (
                <div className="flex justify-between text-[13px] text-gray-700 mb-1 pt-2 border-t border-gray-100">
                  <span className="font-medium">Transport — {transport.pickupLocation}</span>
                  <span className="whitespace-nowrap ml-3">₦{transportPrice.toLocaleString()}</span>
                </div>
              )}
            </SectionCard>

            {/* Payer (someone-else flow) */}
            {isSomeoneElse && (
              <SectionCard title="Payer (receipt recipient)" onEdit={editDetails}>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  <Detail label="Name" value={`${purchaser.firstName} ${purchaser.lastName}`} />
                  <Detail label="Email" value={purchaser.email} />
                  <Detail label="Phone number" value={purchaser.phone} />
                </dl>
              </SectionCard>
            )}

            {/* Attendee / recipient details */}
            <SectionCard title={isSomeoneElse ? "Attendee's details" : 'Your details'} onEdit={editDetails}>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <Detail label="Name" value={`${guest.firstName} ${guest.lastName}`} />
                <Detail label="Email" value={guest.email} />
                <Detail label="Phone number" value={guest.phone} />
                <Detail label="WhatsApp number" value={guest.whatsappNumber} />
                <Detail label="Gender" value={guest.gender} capitalize />
              </dl>
            </SectionCard>

            {/* Next of kin */}
            <SectionCard title="Next of kin" onEdit={editDetails}>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <Detail label="Full name" value={guest.nokFullName} />
                <Detail label="Email" value={guest.nokEmail} />
                <Detail label="Phone number" value={guest.nokPhone} />
                <Detail label="WhatsApp number" value={guest.nokWhatsappNumber} />
              </dl>
            </SectionCard>

            {/* Custom answers */}
            {answeredQuestions.length > 0 && (
              <SectionCard title="Additional information" onEdit={editDetails}>
                <dl className="flex flex-col gap-3">
                  {answeredQuestions.map((a) => (
                    <Detail key={a.question} label={a.question} value={a.answer} />
                  ))}
                </dl>
              </SectionCard>
            )}
          </div>

          {/* Right: totals + payment */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-[16px] font-bold text-[#3b5bdb] mb-4">Order total</h2>
              {hasMeal && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[14px] text-gray-700">Meal ticket</span>
                  <span className="text-[14px] font-medium text-gray-900">₦{grandTotal.toLocaleString()}</span>
                </div>
              )}
              {acc && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[14px] text-gray-700">Accommodation</span>
                  <span className="text-[14px] font-medium text-gray-900">₦{accPrice.toLocaleString()}</span>
                </div>
              )}
              {transport && (
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[14px] text-gray-700">Transport</span>
                  <span className="text-[14px] font-medium text-gray-900">₦{transportPrice.toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 mt-2">
                <span className="text-[14px] font-semibold text-gray-900">Grand total</span>
                <span className="text-[16px] font-bold text-gray-900">₦{overallTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-[13px] text-gray-600 mb-3">Payment Gateway</p>
              <div className="flex items-center gap-4 mb-4">
                <GatewayOption
                  selected={gateway === 'paystack'}
                  onSelect={() => { setGateway('paystack'); setError('') }}
                  logo={<PaystackLogo />}
                />
              </div>
              {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}
              <button
                onClick={handleConfirm}
                disabled={loading}
                className={`w-full py-3.5 rounded-lg text-[15px] font-semibold transition-all ${
                  loading
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-[#3b5bdb] text-white hover:bg-[#3451c7]'
                }`}>
                {loading ? 'Processing...' : `Confirm & pay ₦${overallTotal.toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionCard({ title, onEdit, children }: {
  title: string; onEdit: () => void; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-bold text-[#0d1b2a]">{title}</h2>
        <button onClick={onEdit}
          className="flex items-center gap-1.5 text-[13px] font-medium text-[#3b5bdb] hover:opacity-80 transition-opacity">
          <Pencil size={13} />
          Edit
        </button>
      </div>
      {children}
    </div>
  )
}

function Detail({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
      <dt className="text-[12px] text-gray-400 mb-0.5">{label}</dt>
      <dd className={`text-[14px] text-gray-800 break-words ${capitalize ? 'capitalize' : ''}`}>{value || '—'}</dd>
    </div>
  )
}

function GatewayOption({ selected, onSelect, logo }: {
  selected: boolean; onSelect: () => void; logo: React.ReactNode
}) {
  return (
    <button onClick={onSelect}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
        selected ? 'border-[#3b5bdb] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
        selected ? 'border-[#3b5bdb]' : 'border-gray-300'
      }`}>
        {selected && <div className="w-2.5 h-2.5 rounded-full bg-[#3b5bdb]" />}
      </div>
      {logo}
    </button>
  )
}

function PaystackLogo() {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex flex-col gap-0.5">
        {['bg-[#00c2b2]', 'bg-[#011b33]', 'bg-[#00c2b2]'].map((c, i) => (
          <div key={i} className={`h-1 w-4 rounded-sm ${c}`} />
        ))}
      </div>
      <span className="text-[14px] font-bold text-[#011b33]">paystack</span>
    </div>
  )
}
