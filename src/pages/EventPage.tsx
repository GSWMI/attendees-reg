import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, ChevronDown, ChevronUp, Minus, Plus, Users, Hash } from 'lucide-react'
import { getEventBySlug } from '../services/api'
import type { AccommodationData, TransportData } from '../services/api'
import { useRegistration } from '../hooks/useRegistration.ts'
import { Header, AnnouncementBanner, Footer } from '../components/Layout'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(s: string) {
  if (!s) return ''
  return new Date(s).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function sanitizeHtml(raw: string): string {
  if (!raw) return ''
  return raw
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Hardcoded clean descriptions for events where the admin-entered text
// has formatting issues that can't be fixed by stripping HTML alone.
// Key is the event slug.
const HARDCODED_DESCRIPTIONS: Record<string, string[]> = {
  'supernatural-retreat-2026-mohtjtc7': [
    'This is the registration portal for GSWMI Supernatural Retreat, 2026.',
    'DEPARTURE TO AWE: 27TH MAY, 2026',
    'ARRIVAL FROM AWE: 30TH MAY, 2026',
    'Carefully go through the form and fill it in appropriately.',
    'Ensure you fill in your valid email address as your tickets will be sent to your inbox.',
    'ALL room rates are FLAT rates and NOT daily rates.',
    'PREGNANT WOMEN, NURSING MOTHERS, AND CHILDREN ARE NOT ALLOWED IN PNEUMA CITY. PLEASE, WATCH ONLINE.',
  ],
}

function TicketCheckbox({ checked }: { checked: boolean }) {
  return (
    <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
      checked ? 'bg-[#3b5bdb] border-[#3b5bdb]' : 'border-gray-300 bg-white'
    }`}>
      {checked && (
        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
          <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const {
    event, setEvent,
    quantities, setQty, selectOption,
    grandTotal, mealSelections,
    selectedAccommodationId, setSelectedAccommodationId,
    selectedTransportId, setSelectedTransportId,
  } = useRegistration()

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [mealChecked, setMealChecked] = useState(false)
  const [mealOpen, setMealOpen] = useState(false)
  const [accChecked, setAccChecked] = useState(false)
  const [accOpen, setAccOpen] = useState(false)
  const [transportChecked, setTransportChecked] = useState(false)
  const [transportOpen, setTransportOpen] = useState(false)
  const [activeDay, setActiveDay] = useState(0)
  const [descExpanded, setDescExpanded] = useState(false)

  useEffect(() => {
    if (!slug) return
    async function load() {
      try {
        const data = await getEventBySlug(slug!)
        setEvent(data)
        try { localStorage.setItem('gswmi_event_slug', slug!) } catch {}
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f3]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#3b5bdb] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-[14px]">Loading event...</p>
        </div>
      </div>
    )
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f5f5f3] px-4">
        <div className="text-[48px]">🔍</div>
        <p className="text-gray-700 text-[18px] font-semibold">Event not found</p>
        <p className="text-gray-400 text-[14px] text-center">The event you're looking for doesn't exist or has been removed.</p>
        <button onClick={() => navigate('/')}
          className="mt-2 px-6 py-2.5 bg-[#3b5bdb] text-white rounded-xl text-[14px] font-medium hover:bg-[#3451c7] transition-colors">
          Go to home
        </button>
      </div>
    )
  }

  const isPast = event.endDate && new Date(event.endDate) < new Date()
  if (isPast) {
    return (
      <div className="min-h-screen bg-[#f5f5f3] flex flex-col">
        <Header />
        <AnnouncementBanner />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          {event.bannerUrl && !event.bannerUrl.startsWith('blob:') && (
            <div className="w-full max-w-[500px] h-[160px] rounded-2xl overflow-hidden mb-2 shadow-sm">
              <img src={event.bannerUrl} alt={event.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="text-[40px]">🎉</div>
          <p className="text-[20px] font-bold text-[#0d1b2a] text-center">{event.name}</p>
          <p className="text-[14px] text-gray-500 text-center max-w-[400px]">
            This event has already taken place. Registration is now closed.
          </p>
          <button onClick={() => navigate('/')}
            className="mt-2 px-6 py-2.5 bg-[#3b5bdb] text-white rounded-xl text-[14px] font-medium hover:bg-[#3451c7] transition-colors">
            See upcoming events
          </button>
        </main>
        <Footer />
      </div>
    )
  }

  const days = event.totalDays ? Array.from({ length: event.totalDays }, (_, i) => i + 1) : []
  const tabs = [...days.map((d) => `Day ${d}`), 'Total meal summary']
  const hasSelections = mealSelections.length > 0 && mealSelections.some((s) => s.meals.length > 0)
  const accommodations: AccommodationData[] = event.accommodations ?? []
  const transports: TransportData[] = event.transport ?? []
  const hasMeal = event.mealRegistrationOpen && event.mealOptions && event.mealOptions.length > 0
  const hasAccommodation = event.accommodationRegistrationOpen && accommodations.length > 0
  const hasTransport = event.transportRegistrationOpen && transports.length > 0
  const canProceed = (mealChecked && hasSelections) || (accChecked && !!selectedAccommodationId) || (transportChecked && !!selectedTransportId)

  const getMapsUrl = () => {
    if (!event.location) return 'https://maps.google.com'
    return `https://www.google.com/maps/search/${encodeURIComponent(event.location)}`
  }

  const handleMealCheck = () => { const n = !mealChecked; setMealChecked(n); setMealOpen(n) }
  const handleAccCheck = () => { const n = !accChecked; setAccChecked(n); setAccOpen(n); if (!n) setSelectedAccommodationId('') }
  const handleTransportCheck = () => { const n = !transportChecked; setTransportChecked(n); setTransportOpen(n); if (!n) setSelectedTransportId('') }

  // Use hardcoded lines for known broken slugs, otherwise sanitize from API
  const descLines: string[] = slug && HARDCODED_DESCRIPTIONS[slug]
    ? HARDCODED_DESCRIPTIONS[slug]
    : sanitizeHtml(event.description ?? '').split('\n').filter((l) => l.trim())

  // This image is a tall portrait format — use object-contain so full image shows
  const isTallImage = slug === 'supernatural-retreat-2026-mohtjtc7'

  return (
    <div className="min-h-screen bg-[#f5f5f3] flex flex-col">
      <Header />
      <AnnouncementBanner />

      <main className="flex-1 max-w-[1000px] mx-auto w-full px-4 py-8">

        {/* Event hero card */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-8">

          {/* Banner */}
          {event.bannerUrl && !event.bannerUrl.startsWith('blob:') ? (
            <div
              className={`w-full flex items-center justify-center ${isTallImage ? 'bg-black' : 'bg-[#0d1b2a]'}`}
              style={{ height: isTallImage ? undefined : undefined }}
            >
              <img
                src={event.bannerUrl}
                alt={event.name}
                className={`w-full ${
                  isTallImage
                    // Tall/portrait image: contain so full image shows, let height be natural
                    ? 'max-h-[600px] object-contain'
                    // Normal landscape banners: cover at fixed height
                    : 'h-[220px] md:h-[340px] object-cover object-top'
                }`}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          ) : (
            <div className="w-full h-[140px] bg-gradient-to-br from-[#1a2f4a] to-[#3b5bdb]" />
          )}

          {/* Info */}
          <div className="p-6 md:p-8 flex flex-col gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-[#0d1b2a] leading-tight">{event.name}</h1>

            {descLines.length > 0 && (
              <div className="text-[14px] text-gray-600 leading-relaxed">
                <div className={descExpanded ? '' : 'line-clamp-4'}>
                  {descLines.map((line, i) => (
                    <p key={i} className={i > 0 ? 'mt-1.5' : ''}>{line}</p>
                  ))}
                </div>
                {descLines.length > 4 && (
                  <button onClick={() => setDescExpanded((v) => !v)}
                    className="text-[#3b5bdb] text-[13px] hover:underline mt-2">
                    {descExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 text-[13px] text-gray-700">
              <svg className="text-[#3b5bdb] flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{formatDate(event.startDate)}{event.endDate ? ` – ${formatDate(event.endDate)}` : ''}</span>
            </div>

            {event.location && (
              <a href={getMapsUrl()} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 hover:border-[#3b5bdb] hover:bg-blue-50 transition-colors group w-fit">
                <MapPin size={14} className="text-[#3b5bdb] flex-shrink-0" />
                <span className="text-[13px] text-gray-700 font-medium">{event.location}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 group-hover:text-[#3b5bdb] transition-colors flex-shrink-0">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Guard: registration closed */}
        {!event.registrationOpen && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-5 mb-4 flex items-start gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400 flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <p className="text-[14px] font-semibold text-red-700">Registration is currently closed</p>
              <p className="text-[13px] text-red-500 mt-0.5">Ticket registration for this event is not open yet. Please check back later.</p>
            </div>
          </div>
        )}

        {event.registrationOpen && !hasMeal && !hasAccommodation && !hasTransport && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl px-6 py-5 mb-4 flex items-start gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <p className="text-[14px] font-semibold text-gray-700">No tickets available yet</p>
              <p className="text-[13px] text-gray-500 mt-0.5">Ticket options for this event haven't been set up yet. Please check back soon.</p>
            </div>
          </div>
        )}

        {/* Ticket sections */}
        <div className="flex flex-col gap-4 mb-8">

          {/* Meal ticket */}
          {hasMeal && (
            <div className="rounded-2xl border border-gray-200 overflow-hidden" style={{ backgroundColor: '#FAFCFF' }}>
              <div className="flex items-center justify-between px-5 py-4">
                <button onClick={handleMealCheck} className="flex items-center gap-3 flex-1 text-left">
                  <TicketCheckbox checked={mealChecked} />
                  <span className="text-[15px] font-semibold text-[#0d1b2a]">Meal ticket</span>
                </button>
                <button onClick={() => mealChecked && setMealOpen((v) => !v)}
                  className={`transition-opacity ${mealChecked ? 'opacity-100' : 'opacity-30'}`}>
                  {mealOpen ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                </button>
              </div>
              {mealChecked && mealOpen && (
                <div className="border-t border-gray-200">
                  <div className="flex border-b border-gray-200 overflow-x-auto bg-white">
                    {tabs.map((tab, i) => (
                      <button key={tab} onClick={() => setActiveDay(i)}
                        className={`px-4 py-3 text-[13px] font-medium transition-colors border-b-2 -mb-px whitespace-nowrap flex-shrink-0 ${
                          activeDay === i ? 'border-[#0d1b2a] text-[#0d1b2a]' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}>
                        {tab}
                      </button>
                    ))}
                  </div>
                  {activeDay < days.length ? (
                    <DayContent
                      day={days[activeDay]}
                      mealGroups={(event.mealOptions ?? []).filter((g) => g.day === days[activeDay])}
                      quantities={quantities}
                      onQty={setQty}
                      onSelect={selectOption}
                    />
                  ) : (
                    <MealSummary mealSelections={mealSelections} grandTotal={grandTotal} hasSelections={hasSelections} />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Accommodation ticket */}
          {hasAccommodation && (
            <div className="rounded-2xl border border-gray-200" style={{ backgroundColor: '#FAFCFF' }}>
              <div className="flex items-center justify-between px-5 py-4">
                <button onClick={handleAccCheck} className="flex items-center gap-3 flex-1 text-left">
                  <TicketCheckbox checked={accChecked} />
                  <span className="text-[15px] font-semibold text-[#0d1b2a]">Accommodation ticket</span>
                </button>
                <button onClick={() => accChecked && setAccOpen((v) => !v)}
                  className={`transition-opacity ${accChecked ? 'opacity-100' : 'opacity-30'}`}>
                  {accOpen ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                </button>
              </div>
              {accChecked && accOpen && (
                <div className="border-t border-gray-200 p-5 bg-white rounded-b-2xl">
                  <p className="text-[13px] font-medium text-gray-600 mb-1">Accommodation options</p>
                  <p className="text-[12px] text-gray-400 mb-3 italic">Flat rate applies to all accommodation options for the duration of the event.</p>
                  <div className="flex flex-col gap-2">
                    {accommodations.map((acc) => {
                      const isSelected = selectedAccommodationId === acc._id
                      const cleanDesc = sanitizeHtml(acc.description ?? '')
                      return (
                        <div key={acc._id}>
                          <button type="button" onClick={() => setSelectedAccommodationId(acc._id)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                              isSelected ? 'border-[#3b5bdb] bg-blue-50/60' : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'border-[#3b5bdb]' : 'border-gray-300'}`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-[#3b5bdb]" />}
                              </div>
                              <span className="text-[13px] text-gray-700">{acc.name}</span>
                            </div>
                            <span className="text-[13px] font-medium text-gray-600 whitespace-nowrap ml-3">₦{acc.price.toLocaleString()}</span>
                          </button>
                          {isSelected && (
                            <div className="mx-1 mb-1 bg-blue-50/60 border border-blue-100 border-t-0 rounded-b-xl px-4 py-3 space-y-2">
                              {cleanDesc && <p className="text-[13px] text-gray-600">{cleanDesc}</p>}
                              <div className="flex items-center gap-1.5 text-[13px] text-gray-500">
                                <Users size={14} className="flex-shrink-0" />
                                <span>Per room: {acc.peoplePerRoom} {acc.peoplePerRoom === 1 ? 'person' : 'people'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[13px] text-gray-500">
                                <Hash size={14} className="flex-shrink-0" />
                                <span>Price: ₦{acc.price.toLocaleString()}</span>
                              </div>
                              {acc.amenities && acc.amenities.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {acc.amenities.map((a) => (
                                    <span key={a} className="px-2 py-0.5 bg-white border border-blue-100 rounded-full text-[11px] text-blue-600">{a}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transportation ticket */}
          {hasTransport && (
            <div className="rounded-2xl border border-gray-200" style={{ backgroundColor: '#FAFCFF' }}>
              <div className="flex items-center justify-between px-5 py-4">
                <button onClick={handleTransportCheck} className="flex items-center gap-3 flex-1 text-left">
                  <TicketCheckbox checked={transportChecked} />
                  <span className="text-[15px] font-semibold text-[#0d1b2a]">Transportation ticket</span>
                </button>
                <button onClick={() => transportChecked && setTransportOpen((v) => !v)}
                  className={`transition-opacity ${transportChecked ? 'opacity-100' : 'opacity-30'}`}>
                  {transportOpen ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                </button>
              </div>
              {transportChecked && transportOpen && (
                <div className="border-t border-gray-200 p-5 bg-white rounded-b-2xl">
                  <p className="text-[13px] font-medium text-gray-600 mb-1">Pickup location</p>
                  <p className="text-[12px] text-gray-400 mb-3 italic">Flat rate applies to all pickup options for the duration of the event.</p>
                  <div className="flex flex-col gap-2 mb-3">
                    {transports.map((t) => {
                      const isSelected = selectedTransportId === t._id
                      const cleanDesc = sanitizeHtml(t.description ?? '')
                      return (
                        <div key={t._id}>
                          <button type="button" onClick={() => setSelectedTransportId(t._id)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                              isSelected ? 'border-[#3b5bdb] bg-blue-50/60' : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'border-[#3b5bdb]' : 'border-gray-300'}`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-[#3b5bdb]" />}
                              </div>
                              <span className="text-[13px] text-gray-700">{t.pickupLocation}</span>
                            </div>
                            <span className="text-[13px] font-medium text-gray-600 whitespace-nowrap ml-3">₦{t.price.toLocaleString()}</span>
                          </button>
                          {isSelected && cleanDesc && (
                            <div className="mx-1 mb-1 bg-gray-50 border border-gray-100 border-t-0 rounded-b-xl px-4 py-3">
                              <p className="text-[13px] text-gray-600">{cleanDesc}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="rounded-xl px-4 py-3 mt-2" style={{ backgroundColor: '#FEF0C7' }}>
                    <p className="text-[13px] text-[#92400E] leading-relaxed">
  1. Pick-Up from Iwo Road / Moniya Train Station (Morning Train) / Ace Supermarket on the 27th.<br />
  2. Drop off at Iwo Road / Moniya Train Station. <br />
  3. To and Fro Baptist for the daily programs.<br />
  Kindly note there is limited space in the buses. To this effect, if you are mobile, please drive.
</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => navigate(`/events/s/${slug}/register`)}
          disabled={!canProceed}
          className={`w-full py-3.5 rounded-xl text-[15px] font-semibold transition-all flex items-center justify-center gap-2 ${
            canProceed ? 'bg-[#3b5bdb] text-white hover:bg-[#3451c7]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Proceed to checkout
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>

      </main>
      <Footer />
    </div>
  )
}

// ── Day Content ───────────────────────────────────────────────────────────────

function DayContent({ day, mealGroups, quantities, onQty, onSelect }: {
  day: number
  mealGroups: { day: number; slot: string; options: { name: string; price: number }[] }[]
  quantities: Record<number, Record<string, { optionIndex: number; quantity: number }>>
  onQty: (day: number, slot: string, optionIndex: number, delta: number) => void
  onSelect: (day: number, slot: string, optionIndex: number) => void
}) {
  if (mealGroups.length === 0) {
    return <div className="p-8 text-center text-[13px] text-gray-400">No meal options for this day</div>
  }

  return (
    <div className="bg-white">
      <div className="hidden md:block p-5">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-[12px] text-gray-500 font-medium pb-3 w-20">Slot</th>
              <th className="text-left text-[12px] text-gray-500 font-medium pb-3">Meal option × Price</th>
              <th className="text-right text-[12px] text-gray-500 font-medium pb-3 w-40">Qty (Max. 5)</th>
            </tr>
          </thead>
          <tbody>
            {mealGroups.map((group) => {
              const selected = quantities[day]?.[group.slot]
              const qty = selected?.quantity ?? 0
              const selectedIdx = selected?.optionIndex ?? 0
              return (
                <tr key={group.slot} className="border-b border-gray-50 last:border-0">
                  <td className="py-4 text-[13px] font-medium text-gray-800 capitalize align-top">{group.slot}</td>
                  <td className="py-4 pr-4">
                    {group.options.map((opt, i) => (
                      <label key={i} className="flex items-start gap-2 mb-2 last:mb-0 cursor-pointer group">
                        <input type="radio" name={`slot-${day}-${group.slot}`}
                          checked={selected?.optionIndex === i}
                          onChange={() => onSelect(day, group.slot, i)}
                          className="accent-[#3b5bdb] w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="text-[13px] text-gray-600 group-hover:text-gray-900 transition-colors leading-snug">{opt.name}</span>
                        <span className="text-[12px] text-gray-400 flex-shrink-0">–</span>
                        <span className="text-[13px] text-gray-800 font-medium whitespace-nowrap flex-shrink-0">₦{opt.price.toLocaleString()}</span>
                      </label>
                    ))}
                  </td>
                  <td className="py-4 align-middle">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => onQty(day, group.slot, selectedIdx, -1)}
                        className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors">
                        <Minus size={12} />
                      </button>
                      <span className="text-[14px] font-medium w-4 text-center">{qty}</span>
                      <button onClick={() => onQty(day, group.slot, selectedIdx, 1)}
                        className="w-7 h-7 rounded-full border border-[#3b5bdb] text-[#3b5bdb] flex items-center justify-center hover:bg-blue-50 transition-colors">
                        <Plus size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden flex flex-col divide-y divide-gray-100">
        {mealGroups.map((group) => {
          const selected = quantities[day]?.[group.slot]
          const qty = selected?.quantity ?? 0
          const selectedIdx = selected?.optionIndex ?? 0
          return (
            <div key={group.slot} className="p-4">
              <div className="text-[12px] font-bold text-[#3b5bdb] uppercase tracking-wide mb-3 capitalize">{group.slot}</div>
              <div className="flex flex-col gap-2 mb-4">
                {group.options.map((opt, i) => (
                  <label key={i} onClick={() => onSelect(day, group.slot, i)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      selected?.optionIndex === i ? 'border-[#3b5bdb] bg-blue-50/60' : 'border-gray-200 bg-white'
                    }`}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selected?.optionIndex === i ? 'border-[#3b5bdb]' : 'border-gray-300'}`}>
                        {selected?.optionIndex === i && <div className="w-2 h-2 rounded-full bg-[#3b5bdb]" />}
                      </div>
                      <span className="text-[13px] text-gray-700">{opt.name}</span>
                    </div>
                    <span className="text-[13px] font-semibold text-gray-800 whitespace-nowrap ml-2">₦{opt.price.toLocaleString()}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-[13px] text-gray-600">Quantity <span className="text-[11px] text-gray-400">(max 5)</span></span>
                <div className="flex items-center gap-4">
                  <button onClick={() => onQty(day, group.slot, selectedIdx, -1)}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <Minus size={13} />
                  </button>
                  <span className="text-[16px] font-semibold text-gray-900 w-5 text-center">{qty}</span>
                  <button onClick={() => onQty(day, group.slot, selectedIdx, 1)}
                    className="w-8 h-8 rounded-full border border-[#3b5bdb] text-[#3b5bdb] flex items-center justify-center hover:bg-blue-50 transition-colors">
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Meal Summary ──────────────────────────────────────────────────────────────

function MealSummary({ mealSelections, grandTotal, hasSelections }: {
  mealSelections: { day: number; meals: { slot: string; optionName: string; price: number; quantity: number }[] }[]
  grandTotal: number
  hasSelections: boolean
}) {
  return (
    <div className="p-5 bg-white">
      {!hasSelections ? (
        <p className="text-[13px] text-gray-400 text-center py-8">No items selected yet. Go back to Day tabs to select your meals.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] mb-4">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[12px] text-gray-500 font-medium pb-3">Day × Slot</th>
                  <th className="text-left text-[12px] text-gray-500 font-medium pb-3">Meal option</th>
                  <th className="text-left text-[12px] text-gray-500 font-medium pb-3">Qty</th>
                  <th className="text-left text-[12px] text-gray-500 font-medium pb-3">Price per meal</th>
                  <th className="text-right text-[12px] text-gray-500 font-medium pb-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {mealSelections.map((sel) => (
                  <>
                    <tr key={`day-${sel.day}`}>
                      <td colSpan={5} className="pt-4 pb-1">
                        <span className="text-[11px] font-bold text-[#3b5bdb] uppercase tracking-widest">Day {sel.day}</span>
                      </td>
                    </tr>
                    {sel.meals.map((meal, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2 text-[13px] text-gray-700 capitalize">{meal.slot}</td>
                        <td className="py-2 text-[13px] text-gray-700">{meal.optionName}</td>
                        <td className="py-2 text-[13px] text-gray-700">{meal.quantity}</td>
                        <td className="py-2 text-[13px] text-gray-700">₦{meal.price.toLocaleString()}</td>
                        <td className="py-2 text-[13px] text-gray-700 text-right">₦{(meal.price * meal.quantity).toLocaleString()}</td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 pt-3">
            <span className="text-[15px] font-semibold text-gray-900">Meal total</span>
            <span className="text-[16px] font-bold text-gray-900">₦{grandTotal.toLocaleString()}</span>
          </div>
        </>
      )}
    </div>
  )
}