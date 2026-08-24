import { sanitizeRichHtml } from '../lib/richText'

// Renders admin-authored rich text (event description) as safe HTML.
//
// Security: even though the admin already sanitizes before saving, we ALWAYS
// re-sanitize here on render (defense in depth — the stored value could be old
// or tampered). `sanitizeRichHtml` rebuilds the markup from a small allow-list
// (p, br, b/strong, i/em, u, ul, ol, li, a[safe href]) and drops everything
// else, so `dangerouslySetInnerHTML` below only ever receives trusted markup.
//
// Styling: Tailwind's preflight resets list bullets, numbers and paragraph
// spacing to nothing, so we re-add them with arbitrary variants scoped to the
// tags this component emits. Without these, lists render as un-bulleted lines.
const RICH_TEXT_CLASSES =
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 ' +
  '[&_p]:mb-2 [&_p:last-child]:mb-0 [&_a]:underline [&_a]:text-[#3b5bdb] [&_a]:break-words'

export function RichText({ html, className = '' }: { html?: string; className?: string }) {
  const clean = sanitizeRichHtml(html)
  if (!clean) return null // empty / whitespace-only / nothing visible after sanitizing
  return (
    <div
      className={`${RICH_TEXT_CLASSES} ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
