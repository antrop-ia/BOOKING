/**
 * Constroi URL absoluta usando X-Forwarded-Host / X-Forwarded-Proto setados
 * pelo reverse proxy (Traefik). Necessario porque em Next 16 standalone
 * o `request.url` usa HOSTNAME=0.0.0.0 do container, ignorando o host publico.
 *
 * Uso tipico em Route Handlers e middleware antes de `NextResponse.redirect()`.
 */
export function publicUrl(path: string, headers: Headers): URL {
  const host = headers.get('x-forwarded-host') ?? headers.get('host') ?? 'localhost:3000'
  const proto = headers.get('x-forwarded-proto') ?? 'http'
  return new URL(path, `${proto}://${host}`)
}
