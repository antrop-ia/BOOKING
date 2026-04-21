import { BookingFlow } from './BookingFlow'
import type { DateOption } from './_components/BookingScreen'
import type { EspacoOption } from './_components/EspacoScreen'
import { resolvePublicTenantContext } from '@/app/lib/tenant'
import { listActiveSpaces } from '@/app/lib/spaces'
import { PublicHeader } from '@/app/_components/PublicHeader'
import { createClient } from '@/app/lib/supabase/server'

const WEEKDAYS_PT_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES_PT_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

const TENANT_SLUG = 'parrilla8187'
const ESTABLISHMENT_SLUG = 'boa-viagem'

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

// Forca server-rendering para refletir mudancas de espacos/horarios em tempo real.
export const dynamic = 'force-dynamic'

export default async function ReservarPage() {
  // O cookie beto_session e setado pelo middleware (ver middleware.ts).
  const dates = generateNext14Days()

  // Busca os espacos ativos pra passar pra UI (decisao obrigatoria).
  const ctx = await resolvePublicTenantContext(TENANT_SLUG, ESTABLISHMENT_SLUG)
  const espacos: EspacoOption[] = ctx
    ? (await listActiveSpaces(ctx.establishmentId)).map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        icon: s.icon,
      }))
    : []

  // Sprint 8 I-10: passa `isAuthenticated` pra ConfirmacaoScreen decidir se
  // mostra o CTA "salvar reserva na minha conta". Se ja esta logado, a
  // reserva ja foi vinculada via I-06 e CTA seria redundante.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <>
      <PublicHeader />
      <BookingFlow dates={dates} espacos={espacos} isAuthenticated={Boolean(user)} />
    </>
  )
}
