/**
 * Verifica um token do Cloudflare Turnstile no server-side.
 *
 * Chame somente a partir de Server Actions ou Route Handlers — requer a
 * `TURNSTILE_SECRET_KEY` do env, que nao pode vazar pro cliente.
 *
 * Ref: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

interface TurnstileSiteverifyResponse {
  success: boolean
  challenge_ts?: string
  hostname?: string
  'error-codes'?: string[]
  action?: string
  cdata?: string
}

export interface TurnstileVerifyResult {
  ok: boolean
  /** Codigos de erro do Turnstile (quando `ok` = false). */
  errors?: string[]
}

/**
 * Se o Turnstile estiver desabilitado (env vazia), retorna ok: true — util
 * pra dev local sem cadastrar chaves. Em producao o env sempre vai estar
 * setado pelo deploy.
 */
export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string | null
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    // Sem chave configurada: bypass. Logar warning pra lembrar no prod.
    console.warn('[turnstile] TURNSTILE_SECRET_KEY nao configurado — bypass')
    return { ok: true }
  }

  if (!token || token.length < 10) {
    return { ok: false, errors: ['missing-input-response'] }
  }

  const body = new URLSearchParams()
  body.append('secret', secret)
  body.append('response', token)
  if (remoteIp) body.append('remoteip', remoteIp)

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    })
    if (!res.ok) {
      return { ok: false, errors: [`http-${res.status}`] }
    }
    const json = (await res.json()) as TurnstileSiteverifyResponse
    if (json.success) return { ok: true }
    return { ok: false, errors: json['error-codes'] ?? ['verify-failed'] }
  } catch (err) {
    console.error('[turnstile] verify fetch failed', err)
    return { ok: false, errors: ['network-error'] }
  }
}
