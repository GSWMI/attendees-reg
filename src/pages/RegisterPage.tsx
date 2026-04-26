import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Mail, Phone, ChevronDown, ChevronUp } from 'lucide-react'
import { createOrder } from '../services/api'
import { useRegistration } from '../hooks/useRegistration.ts'
import { Header, AnnouncementBanner, Footer } from '../components/Layout'

type Gateway = 'paystack' 

export default function RegisterPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { event, mealSelections, grandTotal, selectedAccommodationId, selectedTransportId, setOrder } = useRegistration()

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    gender: '' as 'male' | 'female' | '',
    nokFullName: '', nokEmail: '',
  })
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({})
  const [consent, setConsent] = useState(false)
  const [gateway, setGateway] = useState<Gateway | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Redirect if no event or no selections
  useEffect(() => {
    if (!event) navigate(`/events/s/${slug}`)
  }, [event])

  const update = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.firstName.trim()) errs.firstName = 'Required'
    if (!form.lastName.trim()) errs.lastName = 'Required'
    if (!form.email.trim()) errs.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email'
    if (!form.phone.trim()) errs.phone = 'Required'
    if (!form.gender) errs.gender = 'Required'
    if (!form.nokFullName.trim()) errs.nokFullName = 'Required'
    if (!form.nokEmail.trim()) errs.nokEmail = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.nokEmail)) errs.nokEmail = 'Invalid email'
    if (!consent) errs.consent = 'You must agree to the terms'
    if (!gateway) errs.gateway = 'Please choose a payment gateway'
    event?.customQuestions?.forEach((q) => {
      if (q.required && !customAnswers[q.question]?.trim()) {
        errs[q.question] = 'Required'
      }
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleCheckout = async () => {
    if (!validate() || !event) return
    setLoading(true)
    try {
      const order = await createOrder({
        eventId: event._id ?? event.id ?? "",
        guest: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
            gender: form.gender,
            nextOfKin: {
              fullName: form.nokFullName.trim(),
              email: form.nokEmail.trim(),
            },
          },
        mealSelections,
        customAnswers: Object.entries(customAnswers).map(([question, answer]) => ({ question, answer })),
        ...(selectedAccommodationId ? { accommodationId: selectedAccommodationId } : {}),
        ...(selectedTransportId ? { transportId: selectedTransportId } : {}),
      })
      setOrder(order)

      // Navigate to please-wait — that page handles payment initiation
      const orderId = order._id ?? (order as { id?: string }).id
      navigate(`/events/s/${slug}/please-wait`, { state: { orderId } })
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to process. Please try again.'
      setErrors({ submit: msg })
      setLoading(false)
    }
  }

  if (!event) return null

  const canCheckout = form.firstName && form.lastName && form.email && form.phone && form.gender && form.nokFullName && form.nokEmail && consent && gateway

  return (
    <div className="min-h-screen bg-[#f5f5f3] flex flex-col">
      <Header />
      <AnnouncementBanner />

      <main className="flex-1 max-w-[1000px] mx-auto w-full px-4 py-8">
        {/* Page title */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(`/events/s/${slug}`)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[22px] font-bold text-[#0d1b2a]">Register & make payment</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          {/* Left: Form */}
          <div className="flex flex-col gap-5">
            {/* Personal info */}
            <FormField
              label="First name" required
              error={errors.firstName}
              icon={<User size={15} className="text-gray-400" />}
            >
              <input
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
                placeholder="First name"
                className={inputClass(!!errors.firstName)}
              />
            </FormField>

            <FormField label="Last name" required error={errors.lastName}
              icon={<User size={15} className="text-gray-400" />}>
              <input
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
                placeholder="Last name"
                className={inputClass(!!errors.lastName)}
              />
            </FormField>

            <FormField label="Email address" required error={errors.email}
              icon={<Mail size={15} className="text-gray-400" />}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="Email address"
                className={inputClass(!!errors.email)}
              />
            </FormField>

            <FormField label="WhatsApp phone number" required error={errors.phone}
              icon={<Phone size={15} className="text-gray-400" />}>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="Phone number"
                className={inputClass(!!errors.phone)}
              />
            </FormField>

            {/* Gender */}
            <FormField label="Gender" required error={errors.gender}>
              <div className="flex gap-3">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => { update('gender', g); setErrors((p) => ({ ...p, gender: '' })) }}
                    className={`flex-1 py-3 rounded-lg border text-[14px] font-medium capitalize transition-all ${
                      form.gender === g
                        ? 'border-[#3b5bdb] bg-blue-50/60 text-[#3b5bdb]'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </FormField>

            {/* Next of kin */}
            <div className="rounded-xl border border-gray-200 p-4 flex flex-col gap-4">
              <p className="text-[14px] font-semibold text-gray-800">Next of kin <span className="text-[#3b5bdb] ml-1">*</span></p>
              <FormField label="Full name" required error={errors.nokFullName}
                icon={<User size={15} className="text-gray-400" />}>
                <input
                  value={form.nokFullName}
                  onChange={(e) => update('nokFullName', e.target.value)}
                  placeholder="Full name"
                  className={inputClass(!!errors.nokFullName)}
                />
              </FormField>
              <FormField label="Email address" required error={errors.nokEmail}
                icon={<Mail size={15} className="text-gray-400" />}>
                <input
                  type="email"
                  value={form.nokEmail}
                  onChange={(e) => update('nokEmail', e.target.value)}
                  placeholder="Email address"
                  className={inputClass(!!errors.nokEmail)}
                />
              </FormField>
            </div>

            {/* Custom questions */}
            {event.customQuestions?.map((q) => (
              <div key={q.question} className="flex flex-col gap-1.5">
                <label className="text-[14px] font-medium text-gray-800">
                  {q.question}
                  {q.required && <span className="text-[#3b5bdb] ml-1">*</span>}
                </label>
                <textarea
                  value={customAnswers[q.question] ?? ''}
                  onChange={(e) => {
                    setCustomAnswers((p) => ({ ...p, [q.question]: e.target.value }))
                    setErrors((p) => ({ ...p, [q.question]: '' }))
                  }}
                  placeholder="Type your answer"
                  rows={2}
                  className={`w-full border rounded-lg px-4 py-3 text-[14px] placeholder:text-gray-400 outline-none resize-none transition-all ${
                    errors[q.question]
                      ? 'border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-100'
                      : 'border-gray-300 focus:border-[#3b5bdb] focus:ring-1 focus:ring-[#3b5bdb]/20'
                  }`}
                />
                {errors[q.question] && <p className="text-[12px] text-red-500">{errors[q.question]}</p>}
              </div>
            ))}

            {/* Consent */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="consent"
                checked={consent}
                onChange={(e) => { setConsent(e.target.checked); setErrors((p) => ({ ...p, consent: '' })) }}
                className="mt-1 w-4 h-4 accent-[#3b5bdb] flex-shrink-0"
              />
              <div>
                <label htmlFor="consent" className="text-[14px] text-gray-700 cursor-pointer leading-relaxed">
                  {event.consentText || 'I confirm that the information provided is accurate and I consent to the use of my details for event coordination and logistics purposes.'}
                </label>
                <span className="text-[#3b5bdb] ml-1">*</span>
                {errors.consent && <p className="text-[12px] text-red-500 mt-1">{errors.consent}</p>}
              </div>
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-[13px] text-red-600">
                {errors.submit}
              </div>
            )}
          </div>

          {/* Right: Order summary + Payment */}
          <div className="flex flex-col gap-4">
            {/* Order summary card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-[16px] font-bold text-[#3b5bdb] mb-4">Order summary</h2>

              {/* Compute line items */}
              {(() => {
                const hasMeal = mealSelections.length > 0 && mealSelections.some((s) => s.meals.length > 0)
                const acc = selectedAccommodationId ? event?.accommodations?.find((a) => a._id === selectedAccommodationId) : null
                const transport = selectedTransportId ? event?.transport?.find((t) => t._id === selectedTransportId) : null
                const accPrice = acc?.price ?? 0
                const transportPrice = transport?.price ?? 0
                const overallTotal = (hasMeal ? grandTotal : 0) + accPrice + transportPrice

                return (
                  <>
                    {/* Meal line item — only if meal was selected */}
                    {hasMeal && (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[14px] text-gray-700">Meal ticket</span>
                          <span className="text-[14px] font-medium text-gray-900">₦{grandTotal.toLocaleString()}</span>
                        </div>

                        {/* Toggle details */}
                        <button
                          onClick={() => setShowDetails((v) => !v)}
                          className="flex items-center gap-1 text-[13px] text-[#3b5bdb] hover:opacity-80 transition-opacity mb-3"
                        >
                          {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {showDetails ? 'Hide meal details' : 'Show meal details'}
                        </button>

                        {showDetails && (
                          <div className="mb-3 pl-2 border-l-2 border-gray-100">
                            {mealSelections.map((sel) => (
                              <div key={sel.day} className="mb-2">
                                <p className="text-[11px] font-bold text-[#3b5bdb] uppercase tracking-widest mb-1">Day {sel.day}</p>
                                {sel.meals.map((meal, i) => (
                                  <div key={i} className="flex justify-between text-[12px] text-gray-600 mb-0.5">
                                    <span className="capitalize">{meal.slot} ×{meal.quantity}</span>
                                    <span>₦{(meal.price * meal.quantity).toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* Accommodation line item */}
                    {acc && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[14px] text-gray-700">Accommodation — {acc.name}</span>
                        <span className="text-[14px] font-medium text-gray-900">₦{accPrice.toLocaleString()}</span>
                      </div>
                    )}

                    {/* Transport line item */}
                    {transport && (
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[14px] text-gray-700">Transport — {transport.pickupLocation}</span>
                        <span className="text-[14px] font-medium text-gray-900">₦{transportPrice.toLocaleString()}</span>
                      </div>
                    )}

                    {/* Grand total */}
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                      <span className="text-[14px] font-semibold text-gray-900">Grand total</span>
                      <span className="text-[16px] font-bold text-gray-900">₦{overallTotal.toLocaleString()}</span>
                    </div>
                  </>
                )
              })()}
            </div>F

            {/* Payment gateway */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-[13px] text-gray-600 mb-3">Choose a payment gateway</p>
              <div className="flex items-center gap-4 mb-4">
                <GatewayOption
                  selected={gateway === 'paystack'}
                  onSelect={() => { setGateway('paystack'); setErrors((p) => ({ ...p, gateway: '' })) }}
                  logo={<PaystackLogo />}
                />
                {/* <GatewayOption
                  selected={gateway === 'flutterwave'}
                  onSelect={() => { setGateway('flutterwave'); setErrors((p) => ({ ...p, gateway: '' })) }}
                  logo={<FlutterwaveLogo />}
                /> */}
              </div>
              {errors.gateway && <p className="text-[12px] text-red-500 mb-3">{errors.gateway}</p>}

              <button
                onClick={handleCheckout}
                disabled={!canCheckout || loading}
                className={`w-full py-3.5 rounded-lg text-[15px] font-semibold transition-all ${
                  canCheckout && !loading
                    ? 'bg-[#3b5bdb] text-white hover:bg-[#3451c7]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {loading ? 'Processing...' : 'Checkout'}
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function FormField({ label, required, error, icon, children }: {
  label: string; required?: boolean; error?: string; icon?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[14px] font-medium text-gray-800">
        {label}{required && <span className="text-[#3b5bdb] ml-1">*</span>}
      </label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>}
        {children}
      </div>
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return `w-full border rounded-lg pl-9 pr-4 py-3 text-[14px] placeholder:text-gray-400 outline-none transition-all ${
    hasError
      ? 'border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-100'
      : 'border-gray-300 focus:border-[#3b5bdb] focus:ring-1 focus:ring-[#3b5bdb]/20'
  }`
}

function GatewayOption({ selected, onSelect, logo }: {
  selected: boolean; onSelect: () => void; logo: React.ReactNode
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
        selected ? 'border-[#3b5bdb] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
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

// function FlutterwaveLogo() {
//   return (
//     <div className="flex items-center gap-1.5">
//       <div className="w-5 h-5 bg-gradient-to-br from-[#f5a623] to-[#e55] rounded-full flex items-center justify-center">
//         <span className="text-white text-[8px] font-bold">F</span>
//       </div>
//       <span className="text-[14px] font-bold text-gray-800">flutterwave</span>
//     </div>
//   )
// }