import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Mail, Phone } from 'lucide-react'
import { useRegistration } from '../hooks/useRegistration.ts'
import type { SponsorshipCategory } from '../services/api'
import { getUnitPrice } from '../lib/sponsorship'
import { Header, AnnouncementBanner, Footer } from '../components/Layout'

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidPhone(raw: string): boolean {
  const value = raw.trim()
  if (!/^\+?[\d\s()-]+$/.test(value)) return false
  const digits = value.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15
}

export default function SponsorPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { event, sponsor, setSponsor } = useRegistration()
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!event) navigate(`/events/s/${slug}`)
  }, [event])

  if (!event) return null

  const update = (field: keyof typeof sponsor, value: string) => {
    setSponsor((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  const isSpecific = sponsor.sponsorshipType === 'specific'
  const isGeneral = sponsor.sponsorshipType === 'general'

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!sponsor.firstName.trim()) errs.firstName = 'Required'
    if (!sponsor.lastName.trim()) errs.lastName = 'Required'
    if (!sponsor.email.trim()) errs.email = 'Required'
    else if (!emailRe.test(sponsor.email)) errs.email = 'Invalid email'
    if (sponsor.phone.trim() && !isValidPhone(sponsor.phone)) errs.phone = 'Invalid phone number'
    if (!sponsor.sponsorshipType) errs.sponsorshipType = 'Required'

    if (isGeneral) {
      const amt = Number(sponsor.amount)
      if (!sponsor.amount.trim()) errs.amount = 'Required'
      else if (!Number.isFinite(amt) || amt <= 0) errs.amount = 'Enter a valid amount'
    }
    if (isSpecific) {
      if (!sponsor.category) errs.category = 'Required'
      const n = Number(sponsor.numberOfPersons)
      if (!sponsor.numberOfPersons.trim()) errs.numberOfPersons = 'Required'
      else if (!Number.isInteger(n) || n < 1) errs.numberOfPersons = 'Enter a whole number (1 or more)'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleContinue = () => {
    if (!validate()) return
    navigate(`/events/s/${slug}/sponsor/review`)
  }

  const unit = isSpecific && sponsor.category
    ? getUnitPrice(event, sponsor.category as SponsorshipCategory)
    : null

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

          {/* Sponsorship type + details */}
          <div className="bg-[#f7f7f5] rounded-2xl p-5 md:p-6 flex flex-col gap-4">
            <Field label="Sponsorship type" required error={errors.sponsorshipType}>
              <select value={sponsor.sponsorshipType}
                onChange={(e) => update('sponsorshipType', e.target.value)}
                className={selectClass(!!errors.sponsorshipType, !sponsor.sponsorshipType)}>
                <option value="" disabled>Choose an option</option>
                <option value="general">General sponsorship (open amount)</option>
                <option value="specific">Specific sponsorship</option>
              </select>
            </Field>

            {isGeneral && (
              <Field label="Enter amount" required error={errors.amount}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[14px] z-10">₦</span>
                  <input inputMode="numeric"
                    value={sponsor.amount ? Number(sponsor.amount).toLocaleString() : ''}
                    onChange={(e) => update('amount', e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="50,000" className={amountInputClass(!!errors.amount)} />
                </div>
              </Field>
            )}

            {isSpecific && (
              <>
                <Field label="Category" required error={errors.category}>
                  <select value={sponsor.category}
                    onChange={(e) => update('category', e.target.value)}
                    className={selectClass(!!errors.category, !sponsor.category)}>
                    <option value="" disabled>Choose an option</option>
                    <option value="meal">Meal</option>
                    <option value="accommodation">Accommodation</option>
                    <option value="transport">Transport</option>
                  </select>
                </Field>
                <Field label="No. of persons you want to sponsor" required error={errors.numberOfPersons}>
                  <input inputMode="numeric" value={sponsor.numberOfPersons}
                    onChange={(e) => update('numberOfPersons', e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="1" className={inputClass(!!errors.numberOfPersons)} />
                </Field>
                {unit && (
                  <p className="text-[12px] text-gray-500">
                    Cost per person: <span className="font-medium text-gray-700">₦{unit.price.toLocaleString()}</span>
                    {unit.isPlaceholder && <span className="text-amber-600"> (placeholder — pending admin pricing)</span>}
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <button onClick={handleContinue}
              disabled={!sponsor.sponsorshipType}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg text-[15px] font-semibold transition-all ${
                sponsor.sponsorshipType ? 'bg-[#3b5bdb] text-white hover:bg-[#3451c7]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
              Continue
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    hasError
      ? 'border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-100'
      : 'border-gray-300 focus:border-[#3b5bdb] focus:ring-1 focus:ring-[#3b5bdb]/20'
  }`
}

function amountInputClass(hasError: boolean) {
  return `w-full border rounded-lg pl-8 pr-4 py-3 text-[14px] bg-white placeholder:text-gray-400 outline-none transition-all ${
    hasError
      ? 'border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-100'
      : 'border-gray-300 focus:border-[#3b5bdb] focus:ring-1 focus:ring-[#3b5bdb]/20'
  }`
}

function selectClass(hasError: boolean, placeholder: boolean) {
  return `w-full border rounded-lg px-4 py-3 text-[14px] bg-white outline-none transition-all appearance-none ${
    placeholder ? 'text-gray-400' : 'text-gray-800'
  } ${
    hasError
      ? 'border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-100'
      : 'border-gray-300 focus:border-[#3b5bdb] focus:ring-1 focus:ring-[#3b5bdb]/20'
  }`
}
