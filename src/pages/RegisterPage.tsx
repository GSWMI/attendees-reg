import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Mail, Phone, ChevronDown, ChevronUp } from 'lucide-react'
import { useRegistration } from '../hooks/useRegistration.ts'
import { Header, AnnouncementBanner, Footer } from '../components/Layout'
import { ConsentChecks } from '../components/ConsentChecks'

// Validate a phone number. Accepts Nigerian local format (e.g. 08012345678)
// or international format (e.g. +2348012345678); allows spaces, dashes and
// parentheses as separators. Requires 10–15 digits.
function isValidPhone(raw: string): boolean {
  const value = raw.trim()
  if (!/^\+?[\d\s()-]+$/.test(value)) return false
  const digits = value.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const {
    event, mode,
    guest, setGuest, purchaser, setPurchaser,
    customAnswers, setCustomAnswers,
  } = useRegistration()

  const isSomeoneElse = mode === 'someone-else'

  const [personalOpen, setPersonalOpen] = useState(true)
  const [nokOpen, setNokOpen] = useState(false)
  const [consentOk, setConsentOk] = useState(false)
  // "Same as call number" toggles — inferred from existing values on return.
  const [guestPhoneSame, setGuestPhoneSame] = useState(() => !!guest.phone && guest.phone === guest.whatsappNumber)
  const [nokPhoneSame, setNokPhoneSame] = useState(() => !!guest.nokPhone && guest.nokPhone === guest.nokWhatsappNumber)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!event) navigate(`/events/s/${slug}`)
  }, [event])

  const updateGuest = (field: keyof typeof guest, value: string) => {
    setGuest((p) => {
      const next = { ...p, [field]: value }
      if (field === 'whatsappNumber' && guestPhoneSame) next.phone = value
      if (field === 'nokWhatsappNumber' && nokPhoneSame) next.nokPhone = value
      return next
    })
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  const updatePurchaser = (field: keyof typeof purchaser, value: string) => {
    setPurchaser((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [`p_${field}`]: '' }))
  }

  const toggleGuestSame = () => {
    const on = !guestPhoneSame
    setGuestPhoneSame(on)
    if (on) { setGuest((p) => ({ ...p, phone: p.whatsappNumber })); setErrors((e) => ({ ...e, phone: '' })) }
  }

  const toggleNokSame = () => {
    const on = !nokPhoneSame
    setNokPhoneSame(on)
    if (on) { setGuest((p) => ({ ...p, nokPhone: p.nokWhatsappNumber })); setErrors((e) => ({ ...e, nokPhone: '' })) }
  }

  const validate = () => {
    const errs: Record<string, string> = {}

    if (isSomeoneElse) {
      if (!purchaser.firstName.trim()) errs.p_firstName = 'Required'
      if (!purchaser.lastName.trim()) errs.p_lastName = 'Required'
      if (!purchaser.email.trim()) errs.p_email = 'Required'
      else if (!emailRe.test(purchaser.email)) errs.p_email = 'Invalid email'
      if (purchaser.phone.trim() && !isValidPhone(purchaser.phone)) errs.p_phone = 'Invalid phone number'
    }

    if (!guest.firstName.trim()) errs.firstName = 'Required'
    if (!guest.lastName.trim()) errs.lastName = 'Required'
    if (!guest.email.trim()) errs.email = 'Required'
    else if (!emailRe.test(guest.email)) errs.email = 'Invalid email'
    if (!guest.whatsappNumber.trim()) errs.whatsappNumber = 'Required'
    else if (!isValidPhone(guest.whatsappNumber)) errs.whatsappNumber = 'Invalid phone number'
    if (!guestPhoneSame) {
      if (!guest.phone.trim()) errs.phone = 'Required'
      else if (!isValidPhone(guest.phone)) errs.phone = 'Invalid phone number'
    }
    if (!guest.gender) errs.gender = 'Required'

    if (!guest.nokFullName.trim()) errs.nokFullName = 'Required'
    if (!guest.nokEmail.trim()) errs.nokEmail = 'Required'
    else if (!emailRe.test(guest.nokEmail)) errs.nokEmail = 'Invalid email'
    if (!guest.nokWhatsappNumber.trim()) errs.nokWhatsappNumber = 'Required'
    else if (!isValidPhone(guest.nokWhatsappNumber)) errs.nokWhatsappNumber = 'Invalid phone number'
    if (!nokPhoneSame) {
      if (!guest.nokPhone.trim()) errs.nokPhone = 'Required'
      else if (!isValidPhone(guest.nokPhone)) errs.nokPhone = 'Invalid phone number'
    }

    if (!consentOk) errs.consent = 'Please tick all the required confirmations'
    event?.customQuestions?.forEach((q) => {
      if (q.required && !customAnswers[q.question]?.trim()) errs[q.question] = 'Required'
    })

    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      // Open whichever section holds the first error so it's visible.
      if (Object.keys(errs).some((k) => k.startsWith('nok'))) setNokOpen(true)
      if (Object.keys(errs).some((k) => !k.startsWith('nok'))) setPersonalOpen(true)
      return false
    }
    return true
  }

  const handleContinue = () => {
    if (!validate() || !event) return
    navigate(`/events/s/${slug}/review`)
  }

  if (!event) return null

  const personalTitle = isSomeoneElse ? 'Provide the details of the person you are registering for' : 'Your personal details'
  const nokTitle = isSomeoneElse ? "Provide the details of the person's next of kin" : 'Your next of kin details'

  return (
    <div className="min-h-screen bg-[#f5f5f3] flex flex-col">
      <Header />
      <AnnouncementBanner />

      <main className="flex-1 max-w-[760px] mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(`/events/s/${slug}/tickets`)} className="text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[22px] font-bold text-[#0d1b2a]">Register &amp; make payment</h1>
        </div>

        <div className="flex flex-col gap-4">
          {/* Purchaser (someone else only) */}
          {isSomeoneElse && (
            <div className="bg-[#f7f7f5] rounded-2xl p-5 md:p-6 flex flex-col gap-4">
              <p className="text-[14px] font-medium text-gray-800">A receipt of payment will be sent to your email address</p>
              <FormField label="First name" required error={errors.p_firstName} icon={<User size={15} className="text-gray-400" />}>
                <input value={purchaser.firstName} onChange={(e) => updatePurchaser('firstName', e.target.value)}
                  placeholder="First name" className={inputClass(!!errors.p_firstName)} />
              </FormField>
              <FormField label="Last name" required error={errors.p_lastName} icon={<User size={15} className="text-gray-400" />}>
                <input value={purchaser.lastName} onChange={(e) => updatePurchaser('lastName', e.target.value)}
                  placeholder="Last name" className={inputClass(!!errors.p_lastName)} />
              </FormField>
              <FormField label="Email address" required error={errors.p_email} icon={<Mail size={15} className="text-gray-400" />}>
                <input type="email" value={purchaser.email} onChange={(e) => updatePurchaser('email', e.target.value)}
                  placeholder="Email address" className={inputClass(!!errors.p_email)} />
              </FormField>
              <FormField label="Phone number" error={errors.p_phone} icon={<Phone size={15} className="text-gray-400" />}>
                <input type="tel" value={purchaser.phone} onChange={(e) => updatePurchaser('phone', e.target.value)}
                  placeholder="Phone number" className={inputClass(!!errors.p_phone)} />
              </FormField>
            </div>
          )}

          {/* Personal / recipient details */}
          <Accordion title={personalTitle} open={personalOpen} onToggle={() => setPersonalOpen((v) => !v)}>
            <FormField label="First name" required error={errors.firstName} icon={<User size={15} className="text-gray-400" />}>
              <input value={guest.firstName} onChange={(e) => updateGuest('firstName', e.target.value)}
                placeholder="First name" className={inputClass(!!errors.firstName)} />
            </FormField>
            <FormField label="Last name" required error={errors.lastName} icon={<User size={15} className="text-gray-400" />}>
              <input value={guest.lastName} onChange={(e) => updateGuest('lastName', e.target.value)}
                placeholder="Last name" className={inputClass(!!errors.lastName)} />
            </FormField>
            <FormField label="Email address" required error={errors.email} icon={<Mail size={15} className="text-gray-400" />}>
              <input type="email" value={guest.email} onChange={(e) => updateGuest('email', e.target.value)}
                placeholder="Email address" className={inputClass(!!errors.email)} />
            </FormField>
            <FormField label="Whatsapp number" required error={errors.whatsappNumber} icon={<Phone size={15} className="text-gray-400" />}>
              <input type="tel" value={guest.whatsappNumber} onChange={(e) => updateGuest('whatsappNumber', e.target.value)}
                placeholder="Whatsapp number" className={inputClass(!!errors.whatsappNumber)} />
            </FormField>
            <SameAsToggle checked={guestPhoneSame} onToggle={toggleGuestSame} />
            {!guestPhoneSame && (
              <FormField label="Call number" required error={errors.phone} icon={<Phone size={15} className="text-gray-400" />}>
                <input type="tel" value={guest.phone} onChange={(e) => updateGuest('phone', e.target.value)}
                  placeholder="Call number" className={inputClass(!!errors.phone)} />
              </FormField>
            )}
            <FormField label="Gender" required error={errors.gender}>
              <select value={guest.gender}
                onChange={(e) => updateGuest('gender', e.target.value)}
                className={selectClass(!!errors.gender, !guest.gender)}>
                <option value="" disabled>Choose an option</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </FormField>

            {event.customQuestions?.map((q) => (
              <div key={q.question} className="flex flex-col gap-1.5">
                <label className="text-[14px] font-medium text-gray-800">
                  {q.question}{q.required && <span className="text-[#3b5bdb] ml-1">*</span>}
                </label>
                <textarea
                  value={customAnswers[q.question] ?? ''}
                  onChange={(e) => {
                    setCustomAnswers((p) => ({ ...p, [q.question]: e.target.value }))
                    setErrors((p) => ({ ...p, [q.question]: '' }))
                  }}
                  placeholder="Type your answer" rows={2}
                  className={`w-full border rounded-lg px-4 py-3 text-[14px] placeholder:text-gray-400 outline-none resize-none transition-all ${
                    errors[q.question]
                      ? 'border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-100'
                      : 'border-gray-300 focus:border-[#3b5bdb] focus:ring-1 focus:ring-[#3b5bdb]/20'
                  }`}
                />
                {errors[q.question] && <p className="text-[12px] text-red-500">{errors[q.question]}</p>}
              </div>
            ))}
          </Accordion>

          {/* Next of kin */}
          <Accordion title={nokTitle} open={nokOpen} onToggle={() => setNokOpen((v) => !v)}>
            <FormField label="Full name" required error={errors.nokFullName} icon={<User size={15} className="text-gray-400" />}>
              <input value={guest.nokFullName} onChange={(e) => updateGuest('nokFullName', e.target.value)}
                placeholder="Full name" className={inputClass(!!errors.nokFullName)} />
            </FormField>
            <FormField label="Email address" required error={errors.nokEmail} icon={<Mail size={15} className="text-gray-400" />}>
              <input type="email" value={guest.nokEmail} onChange={(e) => updateGuest('nokEmail', e.target.value)}
                placeholder="Email address" className={inputClass(!!errors.nokEmail)} />
            </FormField>
            <FormField label="Whatsapp number" required error={errors.nokWhatsappNumber} icon={<Phone size={15} className="text-gray-400" />}>
              <input type="tel" value={guest.nokWhatsappNumber} onChange={(e) => updateGuest('nokWhatsappNumber', e.target.value)}
                placeholder="Whatsapp number" className={inputClass(!!errors.nokWhatsappNumber)} />
            </FormField>
            <SameAsToggle checked={nokPhoneSame} onToggle={toggleNokSame} />
            {!nokPhoneSame && (
              <FormField label="Call number" required error={errors.nokPhone} icon={<Phone size={15} className="text-gray-400" />}>
                <input type="tel" value={guest.nokPhone} onChange={(e) => updateGuest('nokPhone', e.target.value)}
                  placeholder="Call number" className={inputClass(!!errors.nokPhone)} />
              </FormField>
            )}
          </Accordion>

          {/* Consent */}
          <div className="px-1">
            <ConsentChecks showAuthority={isSomeoneElse}
              onChange={(ok) => { setConsentOk(ok); if (ok) setErrors((p) => ({ ...p, consent: '' })) }} />
            {errors.consent && <p className="text-[12px] text-red-500 mt-2">{errors.consent}</p>}
          </div>

          <div>
            <button onClick={handleContinue}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-[15px] font-semibold bg-[#3b5bdb] text-white hover:bg-[#3451c7] transition-all">
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

function Accordion({ title, open, onToggle, children }: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="bg-[#f7f7f5] rounded-2xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 md:px-6 py-4 text-left">
        <span className="text-[15px] font-semibold text-[#0d1b2a] pr-3">{title}</span>
        {open ? <ChevronUp size={18} className="text-gray-500 shrink-0" /> : <ChevronDown size={18} className="text-gray-500 shrink-0" />}
      </button>
      {open && <div className="px-5 md:px-6 pb-6 flex flex-col gap-4">{children}</div>}
    </div>
  )
}

function SameAsToggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="flex items-center gap-2.5 -mt-1">
      <span className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${checked ? 'bg-[#3b5bdb]' : 'bg-gray-300'}`}>
        <span className={`w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </span>
      <span className="text-[13px] text-gray-600">Same as call number</span>
    </button>
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
  return `w-full border rounded-lg pl-9 pr-4 py-3 text-[14px] bg-white placeholder:text-gray-400 outline-none transition-all ${
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
