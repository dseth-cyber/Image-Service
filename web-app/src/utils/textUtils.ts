export function getLocalizedValue(obj: any, lang: string): string {
  if (!obj) return ''
  if (typeof obj === 'string') return obj

  // Support masterdata entries with nameTh/nameEn/nameCn/nameMm/nameJp fields
  // Handle locale codes with country/region suffixes (e.g., 'th-TH', 'zh-CN')
  const cleanLang = (lang || '').split('-')[0].toLowerCase()
  const langMap: Record<string, string> = {
    th: 'nameTh',
    en: 'nameEn',
    cn: 'nameCn',
    zh: 'nameCn',
    mm: 'nameMm',
    my: 'nameMm',
    jp: 'nameJp',
    ja: 'nameJp'
  }
  const field = langMap[cleanLang]
  if (field && obj[field]) return obj[field]
  if (obj.nameEn) return obj.nameEn
  if (obj.nameTh) return obj.nameTh

  return obj[lang] || obj[cleanLang] || obj.en || ''
}

// Translate stored alert titles like "Camera offline: CAM-01" using i18n.
// Works for both old (already-stored English) and new alerts.
export function translateAlertTitle(title: string, t: (k: string, opts?: any) => string): string {
  if (!title) return ''
  const m = title.match(/^Camera (offline|online|maintenance|error|inactive|deleted):\s*(.+)$/i)
  if (m) {
    const status = m[1].toLowerCase()
    const name = m[2]
    const key = `imageService.alerts.titleCamera.${status}`
    const translated = t(key, { name })
    if (translated !== key) return translated
  }
  return title
}
