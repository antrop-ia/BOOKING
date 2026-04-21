import { BookingFlow } from './BookingFlow'
import type { DateOption } from './_components/BookingScreen'

const WEEKDAYS_PT_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES_PT_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function generateNext14Days(): DateOption[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days: DateOption[] = []

  for (let i = 0; i < 14; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const dayNum = String(d.getDate())
    const weekday = WEEKDAYS_PT_SHORT[d.getDay()]
    let label: string
    if (i === 0) label = 'Hoje'
    else if (i === 1) label = 'Amanhã'
    else label = MESES_PT_SHORT[d.getMonth()]

    days.push({ iso, day: dayNum, weekday, label })
  }

  return days
}

export const metadata = {
  title: 'Reservar sua mesa',
  description: 'Escolha dia, horário e número de pessoas. Confirmação imediata.',
}

export default function ReservarPage() {
  // O cookie beto_session e setado pelo middleware (ver middleware.ts).
  // Mantemos a pagina estatica para cache rapido; o cookie vem pelo header.
  const dates = generateNext14Days()
  return <BookingFlow dates={dates} />
}
