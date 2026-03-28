import { BrowserRouter, Routes, Route, } from 'react-router-dom'
import { RegistrationProvider } from './hooks/useRegistration'
import EventPage from './pages/EventPage'
import RegisterPage from './pages/RegisterPage'
import {
  PleaseWaitPage,
  PaymentFailedPage,
  PaymentVerifyPage,
  SuccessPage,
} from './pages/StatusPages'

export default function App() {
  return (
    <BrowserRouter>
      <RegistrationProvider>
        <Routes>
          {/* Event landing page */}
          <Route path="/events/s/:slug" element={<EventPage />} />

          {/* Registration + checkout */}
          <Route path="/events/s/:slug/register" element={<RegisterPage />} />

          {/* Payment states */}
          <Route path="/events/s/:slug/please-wait" element={<PleaseWaitPage />} />
          <Route path="/events/s/:slug/verify" element={<PaymentVerifyPage />} />
          <Route path="/events/s/:slug/success" element={<SuccessPage />} />
          <Route path="/events/s/:slug/failed" element={<PaymentFailedPage />} />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </RegistrationProvider>
    </BrowserRouter>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f5f5f3]">
      <h1 className="text-[32px] font-bold text-[#0d1b2a]">404</h1>
      <p className="text-gray-500">Page not found</p>
    </div>
  )
}