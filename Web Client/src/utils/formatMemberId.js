export const formatMemberId = (value) => {
  if (value === null || value === undefined) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (!digits) return raw
  return digits.padStart(10, '0').slice(-10)
}
