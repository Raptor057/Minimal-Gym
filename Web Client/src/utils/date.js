const usDateTime12 = /^(\d{2})\/(\d{2})\/(\d{4})\s(\d{1,2}):(\d{2})\s(AM|PM)$/i
const usDateTime24 = /^(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2})$/

export const toLocalTimestamp = (value) => {
  if (!value) return null
  if (value instanceof Date) return value.getTime()
  if (typeof value !== 'string') return null

  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) return parsed.getTime()

  let match = value.match(usDateTime12)
  if (match) {
    const [, month, day, year, hourRaw, minute, ampm] = match
    let hour = Number(hourRaw)
    if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12
    if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0
    const date = new Date(Number(year), Number(month) - 1, Number(day), hour, Number(minute))
    return Number.isNaN(date.getTime()) ? null : date.getTime()
  }

  match = value.match(usDateTime24)
  if (match) {
    const [, month, day, year, hour, minute] = match
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
    return Number.isNaN(date.getTime()) ? null : date.getTime()
  }

  return null
}
