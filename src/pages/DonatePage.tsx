import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Mail, Phone } from 'lucide-react'
import { useRegistration } from '../hooks/useRegistration.ts'
import { Header, AnnouncementBanner, Footer } from '../components/Layout'

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidPhone(raw: string): boolean {
  const value = raw.trim()
  if (!/^\+?[\d\s()-]+$/.test(value)) return false
  const digits = value.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15
}

export default function DonatePage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { event, donate, setDonate } = useRegistration()
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!event) navigate(`/events/s/${slug}`)
  }, [event])

  if (!event) return null

  const update = (field: keyof typeof donate, value: string) => {
    setDonate((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!donate.firstName.trim()) errs.firstName = 'Required'
    if (!donate.lastName.trim()) errs.lastName = 'Required'
    if (!donate.email.trim()) errs.email = 'Required'
    else if (!emailRe.test(donate.email)) errs.email = 'Invalid email'
    if (donate.phone.trim() && !isValidPhone(donate.phone)) errs.phone = 'Invalid phone number'
    const amt = Number(donate.amount)
    if (!donate.amount.trim()) errs.amount = 'Required'
    else if (!Number.isFinite(amt) || amt <= 0) errs.amount = 'Enter a valid amount'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleContinue = () => {
    if (!validate()) return
    navigate(`/events/s/${slug}/donate/review`)
  }

  const canContinue = donate.firstName && donate.lastName && donate.email && donate.amount

  return (
    <div className="min-h-screen bg-[#f5f5f3] flex flex-col">
      <Header />
      <AnnouncementBanner />

      <main className="flex-1 max-w-[760px] mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(`/events/s/${slug}`)} className="text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[22px] font-bold text-[#0d1b2a]">Provide your details and the amount you want to donate</h1>
        </div>

        <div className="bg-[#f7f7f5] rounded-2xl p-5 md:p-6 flex flex-col gap-4">
          <p className="text-[14px] font-medium text-gray-800">A receipt of payment will be sent to your email address</p>
          <Field label="First name" required error={errors.firstName} icon={<User size={15} className="text-gray-400" />}>
            <input value={donate.firstName} onChange={(e) => update('firstName', e.target.value)}
              placeholder="First name" className={inputClass(!!errors.firstName)} />
          </Field>
          <Field label="Last name" required error={errors.lastName} icon={<User size={15} className="text-gray-400" />}>
            <input value={donate.lastName} onChange={(e) => update('lastName', e.target.value)}
              placeholder="Last name" className={inputClass(!!errors.lastName)} />
          </Field>
          <Field label="Email address" required error={errors.email} icon={<Mail size={15} className="text-gray-400" />}>
            <input type="email" value={donate.email} onChange={(e) => update('email', e.target.value)}
              placeholder="Email address" className={inputClass(!!errors.email)} />
          </Field>
          <Field label="Phone number" error={errors.phone} icon={<Phone size={15} className="text-gray-400" />}>
            <input type="tel" value={donate.phone} onChange={(e) => update('phone', e.target.value)}
              placeholder="Phone number" className={inputClass(!!errors.phone)} />
          </Field>
          <Field label="Enter amount" required error={errors.amount}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[14px] z-10">₦</span>
              <input inputMode="numeric"
                value={donate.amount ? Number(donate.amount).toLocaleString() : ''}
                onChange={(e) => update('amount', e.target.value.replace(/[^\d]/g, ''))}
                placeholder="50,000"
                className={`w-full border rounded-lg pl-8 pr-4 py-3 text-[14px] bg-white placeholder:text-gray-400 outline-none transition-all ${
                  errors.amount ? 'border-red-400 focus:ring-1 focus:ring-red-100' : 'border-gray-300 focus:border-[#3b5bdb] focus:ring-1 focus:ring-[#3b5bdb]/20'
                }`} />
            </div>
          </Field>

          <button type="button" onClick={() => setDonate((p) => ({ ...p, isAnonymous: !p.isAnonymous }))}
            className="flex items-center gap-2.5 mt-1">
            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${donate.isAnonymous ? 'bg-[#3b5bdb] border-[#3b5bdb]' : 'border-gray-300 bg-white'}`}>
              {donate.isAnonymous && <svg width="9" height="7" viewBox="0 0 11 9" fill="none"><path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </span>
            <span className="text-[14px] text-gray-700">Keep me anonymous</span>
          </button>
        </div>

        <div className="mt-4">
          <button onClick={handleContinue} disabled={!canContinue}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg text-[15px] font-semibold transition-all ${
              canContinue ? 'bg-[#3b5bdb] text-white hover:bg-[#3451c7]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}>
            Continue
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </div>
      </main>

      <Footer />
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
