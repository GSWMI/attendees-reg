import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RegistrationProvider } from './hooks/useRegistration.tsx'
import HomePage from './pages/HomePage.tsx'
import EventPage from './pages/EventPage'
import RegisterPage from './pages/RegisterPage'
import {
  PleaseWaitPage,
  PaymentFailedPage,
  PaymentVerifyPage,
  PaymentCallbackPage,
  SuccessPage,
} from './pages/StatusPages'
import { useNavigate } from 'react-router-dom'

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f5f5f3] px-4">
      <div className="text-[56px]">😕</div>
      <h1 className="text-[28px] font-bold text-[#0d1b2a]">Page not found</h1>
      <p className="text-[14px] text-gray-500 text-center max-w-[340px]">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <button
        onClick={() => navigate('/')}
        className="mt-2 px-6 py-2.5 bg-[#3b5bdb] text-white rounded-xl text-[14px] font-medium hover:bg-[#3451c7] transition-colors"
      >
        Go to home
      </button>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <RegistrationProvider>
        <Routes>
          {/* Home — upcoming events list */}
          <Route path="/" element={<HomePage />} />

          {/* Event landing page */}
          <Route path="/events/s/:slug" element={<EventPage />} />

          {/* Registration + checkout */}
          <Route path="/events/s/:slug/register" element={<RegisterPage />} />

          {/* Payment states */}
          <Route path="/events/s/:slug/please-wait" element={<PleaseWaitPage />} />
          <Route path="/events/s/:slug/verify" element={<PaymentVerifyPage />} />
          <Route path="/events/s/:slug/success" element={<SuccessPage />} />
          <Route path="/events/s/:slug/failed" element={<PaymentFailedPage />} />

          {/* Paystack dashboard callback (slug-less) */}
          <Route path="/payment/callback" element={<PaymentCallbackPage />} />
          <Route path="/payment/success" element={<SuccessPage />} />
          <Route path="/payment/failed" element={<PaymentFailedPage />} />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </RegistrationProvider>
    </BrowserRouter>
  )
}