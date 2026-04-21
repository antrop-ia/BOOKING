/**
 * Gerador minimo de arquivo .ics (RFC 5545) para um evento unico.
 * Usado em /minhas-reservas/[codigo] para "Adicionar ao calendario".
 *
 * Linhas terminadas em CRLF e datas em UTC (com sufixo Z) — formato
 * mais portavel entre Google/Apple/Outlook.
 */

export interface IcsEventInput {
  uid: string
  summary: string
  description?: string
  location?: string
  startUTC: Date
  endUTC: Date
}

function formatUTC(d: Date): string {
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  const ss = String(d.getUTCSeconds()).padStart(2, '0')
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`
}

function escapeText(raw: string): string {
  return raw
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

export function buildReservationIcs(input: IcsEventInput): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Parrilla 8187//Reservas//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${input.uid}`,
    `DTSTAMP:${formatUTC(new Date())}`,
    `DTSTART:${formatUTC(input.startUTC)}`,
    `DTEND:${formatUTC(input.endUTC)}`,
    `SUMMARY:${escapeText(input.summary)}`,
  ]
  if (input.description) {
    lines.push(`DESCRIPTION:${escapeText(input.description)}`)
  }
  if (input.location) {
    lines.push(`LOCATION:${escapeText(input.location)}`)
  }
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}
