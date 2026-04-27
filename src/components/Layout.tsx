export function Header() {
  return (
    <header className="bg-[#0d1b2a] px-6 py-4 flex items-center justify-between">
      <div className="flex flex-col">
        <span className="text-white text-xl font-bold font-serif italic tracking-wide">╱GSWMI</span>
        <span className="text-white/40 text-[8px] tracking-widest uppercase leading-tight">
          Gbenga Samuel-Wemimo Ministry International
        </span>
      </div>
      <a
        href="mailto:support@gswmi.com"
        className="text-white text-[13px] underline underline-offset-4 hover:text-white/80 transition-colors"
      >
        Contact support
      </a>
    </header>
  )
}

export function AnnouncementBanner({ text }: { text?: string }) {
  return (
    <div className="bg-red-600 text-center py-2.5 overflow-hidden">
      <p className="text-white text-[13px] font-medium animate-marquee whitespace-nowrap inline-block">
        {text ?? 'For safety and comfort reasons, kids and expectant moms are NOT ALLOWED to register.'}
      </p>
    </div>
  )
}

export function Footer() {
  return (
    <footer className="py-5 text-center text-[12px] text-gray-400 border-t border-gray-200 bg-[#f9f9f9]">
      © GSWMI Logistics Team
    </footer>
  )
}