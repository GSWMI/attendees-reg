import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Calendar } from 'lucide-react'
import { getAllEvents } from '../services/api'
import type { EventData } from '../services/api'
import { Header, AnnouncementBanner, Footer } from '../components/Layout'

function formatDate(s: string) {
  if (!s) return ''
  return new Date(s).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isUpcoming(event: EventData) {
  return new Date(event.endDate) >= new Date()
}

export default function HomePage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    getAllEvents()
      .then((data) => setEvents(data.filter(isUpcoming)))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#f5f5f3] flex flex-col">
      <Header />
      <AnnouncementBanner />

      <main className="flex-1 max-w-[1000px] mx-auto w-full px-4 py-10">
        <h1 className="text-[24px] font-bold text-[#0d1b2a] mb-2">Upcoming Events</h1>
        <p className="text-[14px] text-gray-500 mb-8">Select an event below to register and get your tickets.</p>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-2 border-[#3b5bdb] border-t-transparent rounded-full animate-spin" />
            <p className="text-[14px] text-gray-400">Loading events...</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-[15px] text-gray-600">Could not load events. Please try again later.</p>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="text-[48px]">📅</div>
            <p className="text-[16px] font-semibold text-[#0d1b2a]">No upcoming events</p>
            <p className="text-[14px] text-gray-400">Check back soon for new events.</p>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="flex flex-col gap-4">
            {events.map((event) => (
              <button
                key={event._id}
                onClick={() => navigate(`/events/s/${event.slug ?? event._id}`)}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-[#3b5bdb] hover:shadow-md transition-all text-left w-full"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Banner */}
                  <div className="w-full sm:w-[180px] h-[180px] sm:h-[130px] flex-shrink-0 bg-gradient-to-br from-[#1a2f4a] to-[#3b5bdb]">
                    {event.bannerUrl && !event.bannerUrl.startsWith('blob:') && (
                      <img
                        src={event.bannerUrl}
                        alt={event.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-5 flex flex-col justify-center gap-2">
                    <h2 className="text-[16px] font-semibold text-[#0d1b2a]">{event.name}</h2>

                    {event.description && (
                      <p className="text-[13px] text-gray-500 line-clamp-2">{event.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 mt-1">
                      <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                        <Calendar size={13} className="text-[#3b5bdb] flex-shrink-0" />
                        <span>{formatDate(event.startDate)}{event.endDate ? ` – ${formatDate(event.endDate)}` : ''}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1.5 text-[12px] text-[#3b5bdb]">
                          <MapPin size={13} className="flex-shrink-0" />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="hidden sm:flex items-center pr-5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300">
                      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}