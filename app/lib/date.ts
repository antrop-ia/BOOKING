function tzOffsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at)
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)!.value)
  const asIfUTC = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second')
  )
  return (asIfUTC - at.getTime()) / 60_000
}

export function todayInTimezone(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const utc = Date.UTC(y, m - 1, d)
  const next = new Date(utc + days * 86_400_000)
  const yy = next.getUTCFullYear()
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(next.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function localMidnightUTC(dateStr: string, timeZone: string): Date {
  const probe = new Date(`${dateStr}T12:00:00Z`)
  const offset = tzOffsetMinutes(probe, timeZone)
  const midnightUTC = new Date(`${dateStr}T00:00:00Z`)
  return new Date(midnightUTC.getTime() - offset * 60_000)
}

export function dateRange(
  today: string,
  timeZone: string,
  range: 'hoje' | 'amanha' | 'semana' | 'todos'
): { startUTC: Date; endUTC: Date } | null {
  if (range === 'todos') return null
  const tomorrow = addDays(today, 1)
  if (range === 'hoje') {
    return {
      startUTC: localMidnightUTC(today, timeZone),
      endUTC: localMidnightUTC(tomorrow, timeZone),
    }
  }
  if (range === 'amanha') {
    const dayAfter = addDays(today, 2)
    return {
      startUTC: localMidnightUTC(tomorrow, timeZone),
      endUTC: localMidnightUTC(dayAfter, timeZone),
    }
  }
  const weekEnd = addDays(today, 7)
  return {
    startUTC: localMidnightUTC(today, timeZone),
    endUTC: localMidnightUTC(weekEnd, timeZone),
  }
}

export function formatLocalDate(dateUTC: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateUTC)
}

export function formatLocalTime(dateUTC: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(dateUTC)
}

export function friendlyRelativeDate(
  dateStrLocal: string,
  today: string
): string {
  if (dateStrLocal === today) return 'Hoje'
  if (dateStrLocal === addDays(today, 1)) return 'Amanhã'
  const [y, m, d] = dateStrLocal.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    weekday: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)))
}

export function turnoFromDate(dateUTC: Date, timeZone: string): 'Almoço' | 'Jantar' {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(dateUTC)
  )
  return hour < 16 ? 'Almoço' : 'Jantar'
}
