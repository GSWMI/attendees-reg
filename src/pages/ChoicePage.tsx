import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Users, DollarSign } from 'lucide-react'
import { getEventBySlug } from '../services/api'
import { useRegistration } from '../hooks/useRegistration.ts'
import type { RegMode } from '../hooks/registrationContext'
import { Header, AnnouncementBanner, Footer } from '../components/Layout'

export default function ChoicePage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { event, setEvent, setMode } = useRegistration()
  const [loading, setLoading] = useState(!event)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    getEventBySlug(slug)
      .then((e) => {
        setEvent(e)
        try { localStorage.setItem('gswmi_event_slug', slug) } catch { /* ignore */ }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  const choose = (mode: RegMode) => {
    setMode(mode)
    navigate(mode === 'sponsor' ? `/events/s/${slug}/sponsor` : `/events/s/${slug}/tickets`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f3]">
        <div className="w-8 h-8 border-2 border-[#3b5bdb] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f5f5f3] px-4">
        <div className="text-[48px]">🔍</div>
        <p className="text-gray-700 text-[18px] font-semibold">Event not found</p>
        <button onClick={() => navigate('/')}
          className="mt-2 px-6 py-2.5 bg-[#3b5bdb] text-white rounded-xl text-[14px] font-medium hover:bg-[#3451c7] transition-colors">
          Go to home
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <AnnouncementBanner />

      {event.bannerUrl && !event.bannerUrl.startsWith('blob:') && (
        <div className="w-full h-[220px] md:h-[300px] bg-[#0d1b2a] overflow-hidden">
          <img src={event.bannerUrl} alt={event.name} className="w-full h-full object-cover object-top"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
      )}

      <main className="flex-1 max-w-[1120px] mx-auto w-full px-4 py-8">
        <button onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[14px] text-gray-700 hover:text-gray-900 transition-colors mb-6">
          <ArrowLeft size={18} /> Back
        </button>

        <p className="text-[15px] text-gray-700 mb-6">Choose any of the options below to continue</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <ChoiceCard
            onClick={() => choose('myself')}
            icon={<User size={30} className="text-[#3b5bdb]" strokeWidth={1.5} />}
            title="I am registering for myself"
            bg="bg-[#eef2fb]" titleColor="text-[#3b5bdb]"
          />
          <ChoiceCard
            onClick={() => choose('someone-else')}
            icon={<Users size={30} className="text-[#7c3aed]" strokeWidth={1.5} />}
            title="I am registering for someone else"
            bg="bg-[#f4effb]" titleColor="text-[#7c3aed]"
          />
          <ChoiceCard
            onClick={() => choose('sponsor')}
            icon={<DollarSign size={30} className="text-[#0f9d7a]" strokeWidth={1.5} />}
            title="I want to sponsor this event"
            bg="bg-[#e9f7f1]" titleColor="text-[#0f9d7a]"
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}

function ChoiceCard({ onClick, icon, title, bg, titleColor }: {
  onClick: () => void; icon: React.ReactNode; title: string; bg: string; titleColor: string
}) {
  return (
    <button onClick={onClick}
      className={`${bg} rounded-2xl p-6 min-h-[180px] flex flex-col justify-between text-left hover:shadow-md hover:-translate-y-0.5 transition-all`}>
      <span>{icon}</span>
      <span className={`text-[19px] font-bold leading-snug ${titleColor}`}>{title}</span>
    </button>
  )
}
