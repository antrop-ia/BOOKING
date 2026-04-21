import { cookies } from 'next/headers'

const COOKIE_NAME = 'beto_session'

/**
 * Le o cookie `beto_session`. Retorna null se nao existir.
 *
 * A criacao do cookie e responsabilidade do middleware — ver `middleware.ts`.
 * Nao mutamos cookies em Route Handlers para evitar a excecao
 * "Cookies can only be modified in a Server Action or Route Handler"
 * que aparece em alguns cenarios Edge + streaming.
 */
export async function readBetoSession(): Promise<string | null> {
  const store = await cookies()
  return store.get(COOKIE_NAME)?.value ?? null
}

export const BETO_COOKIE_NAME = COOKIE_NAME
