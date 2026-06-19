export function formatDateTime(dateStr: string | Date, locale = 'th'): string {
  const d = new Date(dateStr)
  return d.toLocaleString(locale === 'th' ? 'th-TH' : locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
