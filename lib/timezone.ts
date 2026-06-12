const TIMEZONE = 'America/Santiago'

/**
 * Fecha/hora actual en America/Santiago como "YYYY-MM-DDTHH:MM:SS".
 * Útil para comparar contra columnas `fecha` (DATE) y `hora_*` (TIME)
 * mediante comparación lexicográfica de strings.
 */
export function getSantiagoDateTimeString(date: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const parts: Record<string, string> = {}
  for (const p of fmt.formatToParts(date)) parts[p.type] = p.value
  const hour = parts.hour === '24' ? '00' : parts.hour
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}`
}

/** Fecha de hoy en America/Santiago como "YYYY-MM-DD" */
export function getTodaySantiago(): string {
  return getSantiagoDateTimeString().slice(0, 10)
}
