// Rich-text helpers shared by the event wizard and every surface that displays
// admin-authored HTML (event description, consent text).
//
// The admin RichTextEditor emits HTML. Before we send it to the backend we
// sanitize it down to a SMALL ALLOW-LIST so the stored value is safe to render
// on both the admin portal and the public attendee app. The attendee app MUST
// render the same allow-list — keep ALLOWED_TAGS in sync across both repos.
// (See ATTENDEE-RICHTEXT-NOTE.md at the repo root.)

const ALLOWED_TAGS = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'A'])

function isEmptyHtml(html: string): boolean {
  // Treat markup that carries no visible text (e.g. "<p></p>", "&nbsp;") as empty.
  const text = html.replace(/<[^>]*>/g, '').replace(/\u00a0|&nbsp;/gi, ' ').trim()
  return text.length === 0
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Allow-list sanitizer. Parses the input and rebuilds it keeping ONLY safe tags
// and attributes — dropping <script>, inline styles, event handlers, and unsafe
// hrefs while preserving the visible text of anything it strips. Runs in the
// browser (uses DOMParser); returns '' for empty/whitespace-only input.
export function sanitizeRichHtml(input: unknown): string {
  if (!input || typeof input !== 'string') return ''
  if (typeof DOMParser === 'undefined') return '' // non-browser guard (tests/SSR)

  const doc = new DOMParser().parseFromString(input, 'text/html')

  const clean = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return escapeText(node.textContent ?? '')
    if (node.nodeType !== Node.ELEMENT_NODE) return ''

    const el = node as Element
    const tag = el.tagName
    const inner = Array.from(el.childNodes).map(clean).join('')

    // Paragraph-like blocks all normalize to <p> so line/paragraph structure
    // survives (contentEditable emits <div> in some browsers, <p> in others).
    if (tag === 'P' || tag === 'DIV') {
      return inner.trim() ? `<p>${inner}</p>` : ''
    }
    if (tag === 'BR') return '<br>'
    if (tag === 'A') {
      const href = el.getAttribute('href') ?? ''
      if (/^\s*(https?:|mailto:)/i.test(href)) {
        return `<a href="${escapeAttr(href.trim())}" target="_blank" rel="noopener noreferrer">${inner}</a>`
      }
      return inner // unsafe/relative href → keep the text, drop the link
    }
    if (ALLOWED_TAGS.has(tag)) {
      const lower = tag.toLowerCase()
      return `<${lower}>${inner}</${lower}>`
    }
    // Unknown tag (span, font, style, script, …) → drop the tag, keep its text.
    return inner
  }

  const html = Array.from(doc.body.childNodes).map(clean).join('').trim()
  return isEmptyHtml(html) ? '' : html
}

// HTML → readable plain text. Used for card snippets / line-clamped previews and
// any surface that intentionally shows description as plain text. Converts block
// boundaries and list items to newlines/bullets instead of gluing them together.
export function richTextToPlain(input: unknown): string {
  if (!input || typeof input !== 'string') return ''
  const withBreaks = input
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<\/\s*(p|div|li|h[1-6]|ul|ol)\s*>/gi, '\n')
  if (typeof DOMParser === 'undefined') {
    return withBreaks.replace(/<[^>]*>/g, '').replace(/\n{3,}/g, '\n\n').trim()
  }
  const doc = new DOMParser().parseFromString(withBreaks, 'text/html')
  const text = doc.body.textContent ?? ''
  return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}
