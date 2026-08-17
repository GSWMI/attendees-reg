import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

// Hardcoded consent affirmations required before a user can proceed to pay.
// The "authority" affirmation only applies when registering someone else.
const ACCURACY_TEXT =
  'I confirm and affirm that the information provided in this form is true, accurate, and complete to the best of my knowledge.'
const AUTHORITY_TEXT =
  'I confirm that I have the appropriate permission or authority to provide their details for the purpose of registering them for the event. I understand that the information provided may be used by the event organisers solely for purposes relating to event registration, communication, coordination, planning, and logistics. I also confirm that the individual’s details have been provided in good faith and with their knowledge or authorisation, where applicable.'

export function ConsentChecks({
  showAuthority = false,
  onChange,
}: {
  showAuthority?: boolean
  onChange: (allChecked: boolean) => void
}) {
  const [accuracy, setAccuracy] = useState(false)
  const [authority, setAuthority] = useState(false)
  const [privacy, setPrivacy] = useState(false)

  useEffect(() => {
    onChange(accuracy && privacy && (!showAuthority || authority))
    // onChange intentionally omitted — parent passes a stable setter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accuracy, authority, privacy, showAuthority])

  return (
    <div className="flex flex-col gap-3">
      <Row checked={accuracy} onToggle={() => setAccuracy((v) => !v)}>
        {ACCURACY_TEXT}
      </Row>

      {showAuthority && (
        <Row checked={authority} onToggle={() => setAuthority((v) => !v)}>
          {AUTHORITY_TEXT}
        </Row>
      )}

      <Row checked={privacy} onToggle={() => setPrivacy((v) => !v)}>
        I agree to our{' '}
        <Link to="/privacy" target="_blank" className="text-[#3b5bdb] underline underline-offset-2 hover:opacity-80">
          Privacy Notice
        </Link>
        .
      </Row>
    </div>
  )
}

function Row({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onToggle}
        className="mt-1 w-4 h-4 accent-[#3b5bdb] shrink-0" />
      <span className="text-[13px] text-gray-700 leading-relaxed">
        {children}<span className="text-[#3b5bdb] ml-1">*</span>
      </span>
    </label>
  )
}
