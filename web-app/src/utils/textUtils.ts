export function getLocalizedValue(obj: any, lang: string): string {
  if (!obj) return ''
  if (typeof obj === 'string') return obj

  // Support masterdata entries with nameTh/nameEn/nameCn/nameMm/nameJp fields
  const langMap: Record<string, string> = { th: 'nameTh', en: 'nameEn', cn: 'nameCn', mm: 'nameMm', jp: 'nameJp' }
  const field = langMap[lang]
  if (field && obj[field]) return obj[field]
  if (obj.nameEn) return obj.nameEn
  if (obj.nameTh) return obj.nameTh

  return obj[lang] || obj.en || ''
}
