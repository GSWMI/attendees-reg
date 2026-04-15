import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, ChevronDown, ChevronUp, Minus, Plus, Users, Hash } from 'lucide-react'
import { getEventBySlug } from '../services/api'
import type { AccommodationData, TransportData } from '../services/api'
import { useRegistration } from '../hooks/useRegistration.ts'
import { Header, AnnouncementBanner, Footer } from '../components/Layout'

function formatDate(s: string) {
  if (!s) return ''
  return new Date(s).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f5f5f3]">
        <p className="text-gray-700 text-[18px] font-semibold">Event not found</p>
        <p className="text-gray-400 text-[14px]">The event you're looking for doesn't exist or has been removed.</p>
      </div>
    )
  }

  const days = event.totalDays ? Array.from({ length: event.totalDays }, (_, i) => i + 1) : []
  const tabs = [...days.map((d) => `Day ${d}`), 'Total meal summary']
  const hasSelections = mealSelections.length > 0 && mealSelections.some((s) => s.meals.length > 0)
  const accommodations: AccommodationData[] = event.accommodations ?? []
  const transports: TransportData[] = event.transport ?? []
  const selectedAcc = accommodations.find((a) => a._id === selectedAccommodationId)
  const selectedTransport = transports.find((t) => t._id === selectedTransportId)
  const hasMeal = event.mealRegistrationOpen && event.mealOptions && event.mealOptions.length > 0
  const hasAccommodation = event.accommodationRegistrationOpen && accommodations.length > 0
  const hasTransport = event.transportRegistrationOpen && transports.length > 0
  const canProceed = (mealChecked && hasSelections) || (accChecked && !!selectedAccommodationId) || (transportChecked && !!selectedTransportId)

  const getMapsUrl = () => {
    if (!event.location) return 'https://maps.google.com'
    return `https://www.google.com/maps/search/${encodeURIComponent(event.location)}`
  }

  const handleMealCheck = () => {
    const next = !mealChecked
    setMealChecked(next)
    setMealOpen(next)
  }

  const handleAccCheck = () => {
    const next = !accChecked
    setAccChecked(next)
    setAccOpen(next)
    if (!next) setSelectedAccommodationId('')
  }

  const handleTransportCheck = () => {
    const next = !transportChecked
    setTransportChecked(next)
    setTransportOpen(next)
    if (!next) setSelectedTransportId('')
  }

  return (
    <div className="min-h-screen bg-[#f5f5f3] flex flex-col">
      <Header />
      <AnnouncementBanner />

      <main className="flex-1 max-w-[1000px] mx-auto w-full px-4 py-8">

        {/* Event hero card */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="overflow-hidden h-[220px] md:h-[280px] flex-shrink-0">
              {event.bannerUrl && !event.bannerUrl.startsWith('blob:') ? (
                <img src={event.bannerUrl} alt={event.name} className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1a2f4a] to-[#3b5bdb] min-h-[220px]" />
              )}
            </div>
            <div className="p-6 md:p-8 flex flex-col justify-center gap-4 md:h-[280px] overflow-y-auto">
              <h1 className="text-3xl md:text-4xl font-bold text-[#0d1b2a] leading-tight">{event.name}</h1>
              {event.description && (
                <div className="text-[14px] text-gray-600 leading-relaxed">
                  <p className={descExpanded ? '' : 'line-clamp-4'}>{event.description}</p>
                  {event.description.length > 200 && (
                    <button onClick={() => setDescExpanded((v) => !v)}
                      className="text-[#3b5bdb] text-[13px] hover:underline mt-1">
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
                  className="flex items-center gap-2 rounded-lg border border-gray-200 overflow-hidden hover:border-[#3b5bdb] transition-colors group">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 group-hover:bg-blue-50 transition-colors">
                    <MapPin size={13} className="text-[#3b5bdb] flex-shrink-0" />
                    <span className="text-[13px] text-gray-700 font-medium">{event.location}</span>
                  </div>
                  <div className="flex-1 h-10 bg-[#e8eef4] hidden sm:flex items-center justify-center">
                    <span className="text-[10px] text-gray-400">View on Maps</span>
                  </div>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Ticket sections */}
        <div className="flex flex-col gap-4 mb-8">

          {/* ── Meal ticket ── */}
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
                    <MealSummary
                      mealSelections={mealSelections}
                      grandTotal={grandTotal}
                      hasSelections={hasSelections}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Accommodation ticket ── */}
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
                  <p className="text-[13px] font-medium text-gray-600 mb-3">Accommodation options</p>

                  {/* Inline radio options — no dropdown clipping issues */}
                  <div className="flex flex-col gap-2 mb-3">
                    {accommodations.map((acc) => (
                      <button key={acc._id} type="button"
                        onClick={() => setSelectedAccommodationId(acc._id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                          selectedAccommodationId === acc._id
                            ? 'border-[#3b5bdb] bg-blue-50/60'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            selectedAccommodationId === acc._id ? 'border-[#3b5bdb]' : 'border-gray-300'
                          }`}>
                            {selectedAccommodationId === acc._id && (
                              <div className="w-2 h-2 rounded-full bg-[#3b5bdb]" />
                            )}
                          </div>
                          <span className="text-[13px] text-gray-700">{acc.name}</span>
                        </div>
                        <span className="text-[13px] font-medium text-gray-600">₦{acc.price.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>

                  {/* Selected option details */}
                  {selectedAcc && (
                    <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3 space-y-2">
                      {selectedAcc.description && <p className="text-[13px] text-gray-600">{selectedAcc.description}</p>}
                      <div className="flex items-center gap-1.5 text-[13px] text-gray-500">
                        <Users size={14} className="flex-shrink-0" />
                        <span>Per room: {selectedAcc.peoplePerRoom} {selectedAcc.peoplePerRoom === 1 ? 'person' : 'people'}</span>
                      </div>
                      {selectedAcc.totalCapacity > 0 && (
                        <div className="flex items-center gap-1.5 text-[13px] text-gray-500">
                          <Users size={14} className="flex-shrink-0" />
                          <span>Total capacity: {selectedAcc.totalCapacity} {selectedAcc.totalCapacity === 1 ? 'person' : 'people'}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-[13px] text-gray-500">
                        <Hash size={14} className="flex-shrink-0" />
                        <span>Price: ₦{selectedAcc.price.toLocaleString()}</span>
                      </div>
                      {selectedAcc.amenities && selectedAcc.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {selectedAcc.amenities.map((a) => (
                            <span key={a} className="px-2 py-0.5 bg-white border border-blue-100 rounded-full text-[11px] text-blue-600">{a}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Transportation ticket ── */}
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
                  <p className="text-[13px] font-medium text-gray-600 mb-3">Pickup location</p>

                  {/* Inline radio options */}
                  <div className="flex flex-col gap-2 mb-3">
                    {transports.map((t) => (
                      <button key={t._id} type="button"
                        onClick={() => setSelectedTransportId(t._id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                          selectedTransportId === t._id
                            ? 'border-[#3b5bdb] bg-blue-50/60'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            selectedTransportId === t._id ? 'border-[#3b5bdb]' : 'border-gray-300'
                          }`}>
                            {selectedTransportId === t._id && (
                              <div className="w-2 h-2 rounded-full bg-[#3b5bdb]" />
                            )}
                          </div>
                          <span className="text-[13px] text-gray-700">{t.pickupLocation}</span>
                        </div>
                        <span className="text-[13px] font-medium text-gray-600">₦{t.price.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>

                  {/* Selected pickup details */}
                  {selectedTransport && (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-gray-800">{selectedTransport.pickupLocation}</p>
                        {selectedTransport.dropoffLocation && (
                          <p className="text-[12px] text-gray-400 mt-0.5">Drop-off: {selectedTransport.dropoffLocation}</p>
                        )}
                      </div>
                      <span className="text-[14px] font-semibold text-gray-800">₦{selectedTransport.price.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Single Proceed to checkout button */}
        <button
          onClick={() => navigate(`/events/s/${slug}/register`)}
          disabled={!canProceed}
          className={`w-full py-3.5 rounded-xl text-[15px] font-semibold transition-all flex items-center justify-center gap-2 ${
            canProceed
              ? 'bg-[#3b5bdb] text-white hover:bg-[#3451c7]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
    <div className="p-5 overflow-x-auto bg-white">
      <table className="w-full min-w-[500px]">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-[12px] text-gray-500 font-medium pb-3 w-24">Slot</th>
            <th className="text-left text-[12px] text-gray-500 font-medium pb-3">Meal option × Price</th>
            <th className="text-right text-[12px] text-gray-500 font-medium pb-3 whitespace-nowrap">Quantity (Max. 5 packs)</th>
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
                <td className="py-4">
                  {group.options.map((opt, i) => (
                    <label key={i} className="flex items-center gap-2 mb-2 last:mb-0 cursor-pointer group">
                      <input type="radio" name={`slot-${day}-${group.slot}`}
                        checked={selected?.optionIndex === i}
                        onChange={() => onSelect(day, group.slot, i)}
                        className="accent-[#3b5bdb] w-4 h-4 flex-shrink-0" />
                      <span className="text-[13px] text-gray-600 truncate max-w-[200px] group-hover:text-gray-900 transition-colors">{opt.name}</span>
                      <span className="text-[12px] text-gray-400">–</span>
                      <span className="text-[13px] text-gray-800 font-medium whitespace-nowrap">₦{opt.price.toLocaleString()}</span>
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
                    <span className="text-[12px] text-gray-400">packs</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
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
                        <td className="py-2 text-[13px] text-gray-700 max-w-[160px] truncate">{meal.optionName}</td>
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