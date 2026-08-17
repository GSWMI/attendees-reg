import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Header, Footer } from '../components/Layout'

const PARAGRAPHS = [
  'GSWMI Logistics respects your privacy and is committed to protecting the personal information you provide. The information collected through this registration form will be used primarily for event administration, coordination, logistics, communication, attendance management and delivery of event-related materials such as tickets and updates.',
  'Your information may be stored securely on cloud-based systems and may be accessed by authorised personnel or service providers who assist with the administration of the event. Appropriate measures will be taken to protect your information against unauthorised access, loss, misuse or disclosure.',
  'Your information will be retained only for as long as reasonably necessary for the purposes for which it was collected, or as required by applicable law and the GSWMI’s records-retention requirements.',
  'You may contact GSWMI regarding questions about your personal information or how it is being processed.',
  'By completing this registration, you acknowledge that you have read and understood this notice and agree to the processing of your information for the purposes stated above.',
]

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#f5f5f3] flex flex-col">
      <Header />

      <main className="flex-1 max-w-[760px] mx-auto w-full px-4 py-10">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[14px] text-gray-600 hover:text-gray-900 transition-colors mb-6">
          <ArrowLeft size={18} /> Back
        </button>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
          <h1 className="text-[26px] font-bold text-[#0d1b2a] mb-1">Privacy Notice</h1>
          <div className="w-12 h-1 bg-[#3b5bdb] rounded-full mb-6" />

          <div className="flex flex-col gap-4">
            {PARAGRAPHS.map((p, i) => (
              <p key={i} className="text-[15px] text-gray-700 leading-relaxed">{p}</p>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
