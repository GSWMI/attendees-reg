import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Mail, Phone, X, Minus, Plus, ChevronDown } from 'lucide-react'
import { useRegistration } from '../hooks/useRegistration.ts'
import type { SponsorshipCategoryKey } from '../hooks/registrationContext'
import {
  sponsorshipMealPrice, sponsorshipTransportPrice, accommodationSponsorItems,
  sponsorshipConfigured, type SponsorAccItem,
} from '../lib/sponsorship'
import { Header, AnnouncementBanner, Footer } from '../components/Layout'
import { ConsentChecks } from '../components/ConsentChecks'

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidPhone(raw: string): boolean {
  const value = raw.trim()
  if (!/^\+?[\d\s()-]+$/.test(value)) return false
  const digits = value.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15
}

const CATEGORY_LABELS: Record<SponsorshipCategoryKey, string> = {
  meal: 'Meal', transport: 'Transport', accommodation: 'Accommodation',
}

export default function SponsorPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { event, sponsor, setSponsor } = useRegistration()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [consentOk, setConsentOk] = useState(false)

  useEffect(() => {
    if (!event) navigate(`/events/s/${slug}`)
  }, [event])

  if (!event) return null

  const mealPrice = sponsorshipMealPrice(event)
  const transportPrice = sponsorshipTransportPrice(event)
  const accommodations = accommodationSponsorItems(event)
  const configured = sponsorshipConfigured(event)

  // Only categories with configured sponsorship pricing.
  const available: SponsorshipCategoryKey[] = [
    ...(mealPrice != null ? (['meal'] as const) : []),
    ...(transportPrice != null ? (['transport'] as const) : []),
    ...(accommodations.length ? (['accommodation'] as const) : []),
  ]
  const unselected = available.filter((c) => !sponsor.categories.includes(c))

  const update = (field: keyof typeof sponsor, value: string) => {
    setSponsor((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  const addCategory = (c: SponsorshipCategoryKey) => {
    if (!c || sponsor.categories.includes(c)) return
    setSponsor((p) => ({ ...p, categories: [...p.categories, c] }))
    setErrors((p) => ({ ...p, categories: '' }))
  }
  const removeCategory = (c: SponsorshipCategoryKey) => {
    setSponsor((p) => {
      const next = { ...p, categories: p.categories.filter((x) => x !== c) }
      if (c === 'meal') next.mealPersons = 0
      if (c === 'transport') next.transportPersons = 0
      if (c === 'accommodation') next.accommodationPersons = {}
      return next
    })
  }

  const setMealPersons = (delta: number) => setSponsor((p) => ({ ...p, mealPersons: Math.max(0, p.mealPersons + delta) }))
  const setTransportPersons = (delta: number) => setSponsor((p) => ({ ...p, transportPersons: Math.max(0, p.transportPersons + delta) }))
  const setAccPersons = (id: string, delta: number) => setSponsor((p) => {
    const cur = p.accommodationPersons[id] ?? 0
    const nv = Math.max(0, cur + delta)
    const a = { ...p.accommodationPersons }
    if (nv === 0) delete a[id]; else a[id] = nv
    return { ...p, accommodationPersons: a }
  })

  const totalSelectedPersons =
    sponsor.mealPersons + sponsor.transportPersons +
    Object.values(sponsor.accommodationPersons).reduce((a, b) => a + b, 0)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!sponsor.firstName.trim()) errs.firstName = 'Required'
    if (!sponsor.lastName.trim()) errs.lastName = 'Required'
    if (!sponsor.email.trim()) errs.email = 'Required'
    else if (!emailRe.test(sponsor.email)) errs.email = 'Invalid email'
    if (sponsor.phone.trim() && !isValidPhone(sponsor.phone)) errs.phone = 'Invalid phone number'
    if (sponsor.categories.length === 0) errs.categories = 'Select at least one category'
    else if (totalSelectedPersons === 0) errs.categories = 'Enter the number of persons for at least one category'
    if (!consentOk) errs.consent = 'Please tick all the required confirmations'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleContinue = () => {
    if (!validate()) return
    navigate(`/events/s/${slug}/sponsor/review`)
  }

  return (
    <div className="min-h-screen bg-[#f5f5f3] flex flex-col">
      <Header />
      <AnnouncementBanner />

      <main className="flex-1 max-w-[760px] mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(`/events/s/${slug}`)} className="text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[22px] font-bold text-[#0d1b2a]">Choose how you want to sponsor</h1>
        </div>

        {!configured ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-5">
            <p className="text-[14px] font-semibold text-amber-800 mb-1">Sponsorship isn't available for this event yet</p>
            <p className="text-[13px] text-amber-700">
              The organiser hasn't set up sponsorship pricing for this event. Please check back later,
              or you can still support the event by making a donation.
            </p>
            <button onClick={() => navigate(`/events/s/${slug}/donate`)}
              className="mt-3 px-5 py-2.5 bg-[#3b5bdb] text-white rounded-lg text-[14px] font-medium hover:bg-[#3451c7] transition-colors">
              Donate instead
            </button>
          </div>
        ) : (
        <div className="flex flex-col gap-4">
          {/* Sponsor details */}
          <div className="bg-[#f7f7f5] rounded-2xl p-5 md:p-6 flex flex-col gap-4">
            <p className="text-[14px] font-medium text-gray-800">A receipt of payment will be sent to your email address</p>
            <Field label="First name" required error={errors.firstName} icon={<User size={15} className="text-gray-400" />}>
              <input value={sponsor.firstName} onChange={(e) => update('firstName', e.target.value)}
                placeholder="First name" className={inputClass(!!errors.firstName)} />
            </Field>
            <Field label="Last name" required error={errors.lastName} icon={<User size={15} className="text-gray-400" />}>
              <input value={sponsor.lastName} onChange={(e) => update('lastName', e.target.value)}
                placeholder="Last name" className={inputClass(!!errors.lastName)} />
            </Field>
            <Field label="Email address" required error={errors.email} icon={<Mail size={15} className="text-gray-400" />}>
              <input type="email" value={sponsor.email} onChange={(e) => update('email', e.target.value)}
                placeholder="Email address" className={inputClass(!!errors.email)} />
            </Field>
            <Field label="Phone number" error={errors.phone} icon={<Phone size={15} className="text-gray-400" />}>
              <input type="tel" value={sponsor.phone} onChange={(e) => update('phone', e.target.value)}
                placeholder="Phone number" className={inputClass(!!errors.phone)} />
            </Field>
          </div>

          {/* Category multi-select + per-category steppers */}
          <div className="bg-[#f7f7f5] rounded-2xl p-5 md:p-6 flex flex-col gap-4">
            <Field label="Category" required error={errors.categories}>
              <div className="relative">
                <select value=""
                  onChange={(e) => { addCategory(e.target.value as SponsorshipCategoryKey); e.target.value = '' }}
                  disabled={unselected.length === 0}
                  className={selectClass(!!errors.categories)}>
                  <option value="" disabled>{unselected.length ? 'Choose from list' : 'All categories added'}</option>
                  {unselected.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </Field>

            {sponsor.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 -mt-1">
                {sponsor.categories.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5 bg-gray-200 text-gray-700 text-[13px] rounded-full pl-3 pr-1.5 py-1">
                    {CATEGORY_LABELS[c]}
                    <button onClick={() => removeCategory(c)} className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Meal — single price */}
            {sponsor.categories.includes('meal') && mealPrice != null && (
              <div className="border-t border-gray-200 pt-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-gray-800">Meal</p>
                  <p className="text-[12px] text-gray-500">₦{mealPrice.toLocaleString()} per pack</p>
                </div>
                <Stepper count={sponsor.mealPersons} onDec={() => setMealPersons(-1)} onInc={() => setMealPersons(1)} />
              </div>
            )}

            {/* Transport — single flat price */}
            {sponsor.categories.includes('transport') && transportPrice != null && (
              <div className="border-t border-gray-200 pt-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-gray-800">Transport</p>
                  <p className="text-[12px] text-gray-500">₦{transportPrice.toLocaleString()} flat fee per person</p>
                </div>
                <Stepper count={sponsor.transportPersons} onDec={() => setTransportPersons(-1)} onInc={() => setTransportPersons(1)} />
              </div>
            )}

            {/* Accommodation — sub-options */}
            {sponsor.categories.includes('accommodation') && accommodations.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <p className="text-[14px] font-semibold text-gray-800 mb-2">Accommodation</p>
                <div className="flex flex-col gap-3">
                  {accommodations.map((a) => (
                    <AccRow key={a.identifier} item={a} count={sponsor.accommodationPersons[a.identifier] ?? 0}
                      onDec={() => setAccPersons(a.identifier, -1)} onInc={() => setAccPersons(a.identifier, 1)} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Consent */}
          <div className="px-1">
            <ConsentChecks onChange={(ok) => { setConsentOk(ok); if (ok) setErrors((p) => ({ ...p, consent: '' })) }} />
            {errors.consent && <p className="text-[12px] text-red-500 mt-2">{errors.consent}</p>}
          </div>

          <div>
            <button onClick={handleContinue}
              disabled={sponsor.categories.length === 0 || totalSelectedPersons === 0 || !consentOk}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg text-[15px] font-semibold transition-all ${
                sponsor.categories.length > 0 && totalSelectedPersons > 0 && consentOk
                  ? 'bg-[#3b5bdb] text-white hover:bg-[#3451c7]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
              Continue
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
          </div>
        </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function AccRow({ item, count, onDec, onInc }: { item: SponsorAccItem; count: number; onDec: () => void; onInc: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <span className={`mt-1 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${count > 0 ? 'bg-[#3b5bdb] border-[#3b5bdb]' : 'border-gray-300 bg-white'}`}>
          {count > 0 && <svg width="9" height="7" viewBox="0 0 11 9" fill="none"><path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </span>
        <div className="min-w-0">
          <p className="text-[14px] text-gray-800">{item.name}</p>
          <p className="text-[12px] text-gray-500">₦{item.price.toLocaleString()} per person</p>
        </div>
      </div>
      <Stepper count={count} onDec={onDec} onInc={onInc} />
    </div>
  )
}

function Stepper({ count, onDec, onInc }: { count: number; onDec: () => void; onInc: () => void }) {
  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <button onClick={onDec} className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors">
        <Minus size={12} />
      </button>
      <span className="text-[14px] font-medium w-4 text-center">{count}</span>
      <button onClick={onInc} className="w-7 h-7 rounded-full border border-[#3b5bdb] text-[#3b5bdb] flex items-center justify-center hover:bg-blue-50 transition-colors">
        <Plus size={12} />
      </button>
      <span className="text-[12px] text-gray-400 w-12">persons</span>
    </div>
  )
}

function Field({ label, required, error, icon, children }: {
  label: string; required?: boolean; error?: string; icon?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[14px] font-medium text-gray-800">
        {label}{required && <span className="text-[#3b5bdb] ml-1">*</span>}
      </label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 z-10">{icon}</span>}
        {children}
      </div>
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return `w-full border rounded-lg pl-9 pr-4 py-3 text-[14px] bg-white placeholder:text-gray-400 outline-none transition-all ${
    hasError ? 'border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-100'
             : 'border-gray-300 focus:border-[#3b5bdb] focus:ring-1 focus:ring-[#3b5bdb]/20'
  }`
}

function selectClass(hasError: boolean) {
  return `w-full border rounded-lg px-4 py-3 pr-10 text-[14px] bg-white outline-none transition-all appearance-none text-gray-500 ${
    hasError ? 'border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-100'
             : 'border-gray-300 focus:border-[#3b5bdb] focus:ring-1 focus:ring-[#3b5bdb]/20'
  }`
}
