import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Mail, Phone } from 'lucide-react'
import { useRegistration } from '../hooks/useRegistration.ts'
import { Header, AnnouncementBanner, Footer } from '../components/Layout'
import { ConsentChecks } from '../components/ConsentChecks'

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Bank-transfer fallback: the card gateway can fail on large donations, so we
// surface direct account details and a WhatsApp link for sending the receipt.
const BANK_DETAILS = {
  accountName: 'Pneuma City Development and Management LTD',
  accountNumber: '2001083704',
  bank: 'FCMB',
}
const SUPPORT_WHATSAPP = '2348161125103'
const RECEIPT_MESSAGE =
  'Hello, I have made my donation via bank transfer. Please find my payment receipt attached.'
const receiptWhatsappLink = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(RECEIPT_MESSAGE)}`

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
  const [consentOk, setConsentOk] = useState(false)

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
    if (!consentOk) errs.consent = 'Please tick all the required confirmations'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleContinue = () => {
    if (!validate()) return
    navigate(`/events/s/${slug}/donate/review`)
  }

  const canContinue = donate.firstName && donate.lastName && donate.email && donate.amount && consentOk

  return (
    <div className="min-h-screen bg-[#f5f5f3] flex flex-col">
      <Header />
      <AnnouncementBanner />

      <main className="flex-1 max-w-[760px] mx-auto w-full px-4 py-8">
        {/* Bank-transfer notice — card payments can fail on large donations */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6">
          <p className="text-[14px] font-semibold text-amber-900 mb-1">Making a large donation?</p>
          <p className="text-[13px] text-amber-800 mb-3">
            Card payments can fail for large amounts. You can transfer directly to the account below,
            then send us your receipt on WhatsApp so we can confirm your donation.
          </p>
          <div className="bg-white/70 border border-amber-200 rounded-xl px-4 py-3 mb-3 flex flex-col gap-1">
            <div className="flex justify-between gap-3 text-[13px]">
              <span className="text-amber-700">Account name</span>
              <span className="font-semibold text-amber-900 text-right">{BANK_DETAILS.accountName}</span>
            </div>
            <div className="flex justify-between gap-3 text-[13px]">
              <span className="text-amber-700">Account number</span>
              <span className="font-semibold text-amber-900 tracking-wide">{BANK_DETAILS.accountNumber}</span>
            </div>
            <div className="flex justify-between gap-3 text-[13px]">
              <span className="text-amber-700">Bank</span>
              <span className="font-semibold text-amber-900">{BANK_DETAILS.bank}</span>
            </div>
          </div>
          <a
            href={receiptWhatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#25D366] text-white text-[13px] font-semibold hover:bg-[#1eb257] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Send your receipt on WhatsApp
          </a>
        </div>

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

        {/* Consent */}
        <div className="px-1 mt-4">
          <ConsentChecks onChange={(ok) => { setConsentOk(ok); if (ok) setErrors((p) => ({ ...p, consent: '' })) }} />
          {errors.consent && <p className="text-[12px] text-red-500 mt-2">{errors.consent}</p>}
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
