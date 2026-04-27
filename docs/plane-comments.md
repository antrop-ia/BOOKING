# Comentarios prontos para o Plane (fechamento 21/04/2026)

Para cada issue abaixo, **mude o status para o indicado** e **cole o comentario** na caixa de comentarios da issue. Os comentarios sao curtos, falam o que foi feito, e apontam o commit + arquivos de referencia.

Ordem: do mais recente (Sprint 8) para o mais antigo (Sprint 1), agrupado por module do Plane.

---

## Area do Cliente (Sprint 8)

> Imagem deployada: `parrilla-booking:sprint8.1` (build local, sha e26702c1603c).
> SHA do commit das issues I-05 a I-10: **47ff6eb**

### Issue: **I-01 — Schema: user_id em reservations + RLS cliente**
Status → **Done**
```
Entregue no commit 6538705 + migration aplicada manualmente no Supabase
em 21/04/2026 (Dashboard -> SQL Editor).

Migration: supabase/migrations/20260421_reservations_user_id.sql
- Coluna user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
  (nullable — reservas anonimas continuam validas)
- Index parcial em (user_id, slot_start DESC) WHERE user_id IS NOT NULL
- Policy "users see own reservations" (SELECT autenticado WHERE
  user_id = auth.uid()) — aditiva, nao substitui policy de admin
- Migration idempotente (IF NOT EXISTS / DROP POLICY IF EXISTS)

Validado: query do final retorna 'reservations.user_id ready' + count
das reservas existentes (todas com user_id NULL — esperado).
```

---

### Issue: **I-02 — Autenticacao: paginas de login + callback magic link**
Status → **Done**
```
Entregue no commit 6538705.

Arquivos:
- app/entrar/page.tsx: tela com form, preserva ?redirect= e ?resgatar=
  vindo do middleware. Redireciona pra /minhas-reservas se ja logado.
- app/entrar/LoginForm.tsx: client component, validacao regex de email,
  feedback "Link enviado" pos-submit.
- app/entrar/actions.ts: requestLoginLink rate-limited (3/min por IP),
  signInWithOtp({ shouldCreateUser: true }), callback URL preserva
  redirect+resgatar. Tambem exporta signOutCliente.
- app/entrar/callback/route.ts: exchangeCodeForSession + redirect.
  Sprint 8 I-10 adicionou auto-resgate por email quando vem com
  ?resgatar=.

Tema dark Parrilla coerente com /reservar. Sem dependencia externa nova
— reusa Supabase Auth (mesmo padrao do admin).
```

---

### Issue: **I-03 — Middleware: protecao de /minhas-reservas/***
Status → **Done**
```
Entregue no commit 6538705.

middleware.ts:
- Matcher inclui /minhas-reservas e /minhas-reservas/:path*
- Bloco novo (linhas 68-84): se nao ha sessao Supabase, redirect pra
  /entrar?redirect=<path-original com search preservado>
- /entrar e /entrar/callback nao sao matched pelo middleware (sao
  publicos por design)
- Admin segue com sua propria checagem (membership no layout)
```

---

### Issue: **I-04 — Pagina "Minhas reservas" (listagem)**
Status → **Done**
```
Entregue no commit 6538705. Pequeno fix de UX (label de data) no commit
47ff6eb.

- app/minhas-reservas/page.tsx: server component, getUser obrigatorio,
  filtra reservations por user_id = auth.uid() via admin client (RLS
  cobre, mas admin client e usado pra resolver timezone e join com
  establishment_spaces). Agrupa em Proximas e Historico.
- app/minhas-reservas/MinhasReservasView.tsx: client component, dark
  Parrilla, cards com data, hora (DM Mono), turno, pessoas, espaco com
  emoji, ocasiao e status badge. Empty state amigavel + borda amarela
  destacando a proxima reserva mais proxima.
- Fix de UX: dateLabel agora usa friendlyRelativeDate ("Hoje" / "Amanha"
  / "sex, 24 abr") em vez de YYYY-MM-DD cru.
```

---

### Issue: **I-05 — Detalhe da reserva + cancelamento**
Status → **Done**
```
Entregue no commit 47ff6eb.

Novos arquivos:
- app/minhas-reservas/[codigo]/page.tsx: server, regex valida formato
  P8187-XXXX, lookup por uuid prefix + ownership (user_id=auth.uid()).
  Trata colisao de prefixo (>1 row -> notFound).
- app/minhas-reservas/[codigo]/actions.ts: cancelOwnReservation com
  ownership dupla (getUser + UPDATE filtrado por user_id), retorna 0
  rows se ja cancelada / nao e do user.
- app/minhas-reservas/[codigo]/ReservaDetailView.tsx: client, dark
  Parrilla, exibe data/hora destacada + detalhes em rows.
- app/lib/ics.ts: gerador minimo .ics RFC5545 para "Adicionar ao
  calendario" (data URL base64).

Botoes:
- Adicionar ao calendario (download .ics)
- Falar com o restaurante (renderizado so se RESTAURANT_INFO.whatsapp
  estiver preenchido — hoje null, espera o cliente confirmar o numero
  oficial)
- Cancelar reserva (confirm + transition + atualizacao otimista de
  status local)
```

---

### Issue: **I-06 — Vincular nova reserva ao usuario logado**
Status → **Done**
```
Entregue no commit 47ff6eb.

- app/reservar/actions.ts: createReservationAction agora chama
  createClient + getUser ANTES de createReservation, e passa user.id
  como userId.
- app/lib/reservations.ts: CreateReservationParams ganha campo
  userId?: string | null; insert grava user_id = params.userId ?? null.

Fluxo anonimo continua intacto (userId fica null).
```

---

### Issue: **I-07 — Resgatar reserva feita antes do cadastro**
Status → **Done**
```
Entregue no commit 47ff6eb.

- app/minhas-reservas/actions.ts (NOVO): resgatarReserva({ codigo,
  whatsapp }) com rate limit 5/min por user.id. Valida codigo P8187-XXXX,
  busca por uuid prefix + user_id IS NULL, compara WhatsApp normalizado
  contra guest_contact, UPDATE com filtro is('user_id', null) anti-race.
  Mensagens de erro especificas (ja vinculada a outra conta / nao
  encontrada / WhatsApp invalido).
- app/minhas-reservas/MinhasReservasView.tsx: nova ResgatarSection com
  botao "+ Adicionar reserva existente" que expande inline em form.
  Quando ?resgatar=CODIGO chega via URL (vindo do CTA pos-confirmacao),
  o form ja abre com o codigo prepopulado.

Tambem exporta tryAutoResgateByEmail usado pelo I-10 (auto-vinculo via
ownership de email apos magic link).
```

---

### Issue: **I-08 — Header navegacional com login/logout**
Status → **Done**
```
Entregue no commit 47ff6eb.

Decisao de design (registrar): em vez de header full-width que duplicaria
o branding ja existente em BookingScreen e MinhasReservasView, criamos
um *pill flutuante* (position: fixed, top-right) discreto que nao
interfere com o layout existente.

- app/_components/PublicHeader.tsx: server component, le getUser. Se
  logado: pill "Minhas reservas" (opcional via prop) + botao "Sair"
  (form action signOutCliente). Se nao: pill "Entrar". Sem JS extra
  (form action funciona via SSR).
- Aplicado em /reservar (page.tsx), /minhas-reservas (page.tsx) e
  /minhas-reservas/[codigo] (page.tsx). Nao aplicado em /, /entrar,
  /admin (cada um tem motivo proprio).
- Removido header inline duplicado de MinhasReservasView (botao SAIR
  vivia ali; agora vive no PublicHeader).
```

---

### Issue: **I-09 — Email template customizado (magic link)**
Status → **Done**
```
Template aplicado no Supabase Dashboard em 21/04/2026 (noite).

HTML versionado em docs/email-templates/magic-link.html.

Aplicacao:
- Supabase Dashboard -> Authentication -> Email Templates -> Magic Link
- Subject: "Seu acesso a Parrilla 8187 esta pronto"
- Body: conteudo de docs/email-templates/magic-link.html

Documentado em docs/runbook.md secao "Templates de email Supabase".
```

---

### Issue: **I-10 — CTA "Salvar reserva na minha conta" pos-confirmacao**
Status → **Done**
```
Entregue no commit 47ff6eb.

- app/reservar/_components/ConfirmacaoScreen.tsx: novo card discreto
  acima do botao "Nova reserva", visivel so se nao logado
  (showSaveAccountCta). Botao linka pra /entrar?email=X&resgatar=CODIGO.
- app/reservar/BookingFlow.tsx: thread email no estado de confirmacao
  e propaga showSaveAccountCta = !isAuthenticated.
- app/reservar/page.tsx: le getUser server-side e passa
  isAuthenticated=Boolean(user) pro BookingFlow.
- app/entrar/callback/route.ts: se vier ?resgatar=, chama
  tryAutoResgateByEmail (vincula a reserva quando o email do guest_contact
  bate com o user.email — ownership ja provado pelo magic link).
  ?resgatar= so e preservado no redirect final se o auto-vinculo falhou
  (assim o aviso "use o form" e o form expandido so aparecem quando
  precisa de ajuda manual).
```

---

## Fluxo Publico de Reserva

### Issue: **Adicionar Cloudflare Turnstile (captcha) no form de reserva**
Status → **Done**
```
Entregue no commit 76115bc.

Implementacao:
- @marsidev/react-turnstile como dep
- Widget renderizado no DadosScreen (tema dark, modo Managed)
- app/lib/turnstile.ts: verify server-side contra
  https://challenges.cloudflare.com/turnstile/v0/siteverify
- createReservationAction valida o token ANTES de qualquer query ao banco
- Token e single-use: em caso de erro, o client reseta pra gerar novo
- Dockerfile aceita NEXT_PUBLIC_TURNSTILE_SITE_KEY como build-arg
- docker-compose.yml expoe TURNSTILE_SECRET_KEY no runtime
- Site key visivel no bundle /_next/static/chunks/0y.rxb3wo59r8.js
- Secret so no container (testado: nao vaza no HTML nem em qualquer chunk)

Defesa ativa em producao.
```

---

### Issue: **Limite de 3 reservas futuras ativas por numero de WhatsApp**
Status → **Done**
```
Entregue no commit fcf7bcf.

Logica em app/lib/reservations.ts (createReservation):
- Antes do INSERT, conta reservas com status != cancelled e
  slot_start >= now() cujo WhatsApp (apos normalizacao) bate com o novo
- Se count >= 3: rejeita com codigo 'over_limit' e mensagem
  "Voce ja tem 3 reservas ativas nesse numero. Cancele uma antes de
  fazer outra."
- Admin (source='admin') bypassa o limite — restaurante pode criar
  quantas reservas quiser manualmente

Limitacao conhecida: count O(n) no volume atual de reservas futuras
(filtragem em JS apos fetch). Com volume alto, resolver com coluna
normalizada indexada — fica como follow-up.

Registrado no audit_log como reservation_rejected_over_limit quando
acontece.
```

---

### Issue: **Validacao mais robusta de formato de WhatsApp**
Status → **Done**
```
Entregue no commit fcf7bcf.

normalizeWhatsapp em app/lib/reservations.ts:
- Aceita 10-13 digitos apos remover nao-digitos
- Normaliza prefixo 55 (adiciona se faltar em 10/11 digitos; rejeita
  numero de 12-13 que nao comece com 55)
- Mensagens amigaveis para cada caso: muito curto, muito longo,
  internacional nao suportado
- Retorna { ok: true, digits } normalizado, usado tanto pela validacao
  quanto pelo limite de 3-por-numero

Registrado no audit_log como reservation_rejected_invalid_phone quando
falha. Aplicado a reservas publicas E manuais (admin).
```

---

## Atendente IA (Beto)

### Issue: **Tabela beto_conversations para persistir historico**
Status → **Done**
```
Entregue no commit 5cdb946.

Migration: supabase/migrations/20260421_beto_conversations.sql

Schema: id uuid PK, tenant_id uuid FK, session_id text,
messages jsonb, created_at + updated_at (via trigger).
Unique index em (tenant_id, session_id) para upsert rapido.
Index em (tenant_id, updated_at DESC) para listagem futura no admin.
RLS permite SELECT so para membros do tenant; INSERT/UPDATE/DELETE
apenas via service_role.
```

---

### Issue: **UI 'continuar de onde parou' no BetoChat**
Status → **Done**
```
Entregue no commit 5cdb946.

BetoChat.tsx:
- Na primeira vez que o chat e aberto, faz GET /api/beto/history
- Se retornar mensagens, setMessages(...) + exibe badge amarelo
  "Continuando sua conversa anterior."
- Botao "Nova" no header chama DELETE /api/beto/history e limpa a UI
- Cookie beto_session (HttpOnly, 30 dias) e setado pelo middleware em
  /reservar e /api/beto/* — nao mais via Route Handler (Edge runtime
  proibia)
```

---

### Issue: **Rate limiting no /api/beto/chat (30 msg/h por sessao)**
Status → **Done**
```
Entregue no commit 5cdb946.

Reutilizou lib/rate-limit.ts com key = "beto:{sessionId}".
Limite 30 msgs/hora. Retorna HTTP 429 + header Retry-After.

Bonus do commit fcf7bcf: cada rate limit disparado loga no audit_log
como rate_limit_beto com sessionId no details.
```

---

## Painel Admin

### Issue: **Edicao de configuracoes do tenant (nome, cor, logo)**
Status → **Done**
```
Entregue no commit 0b8fbeb.

/admin/configuracoes agora tem form editavel:
- Nome (3-80 chars)
- Cor de marca (color picker nativo + input hex)
- URL do logo (HTTPS opcional, com preview da imagem)
- Preview da marca em tempo real no topo
- Toast de sucesso + botao Desfazer

Server action updateTenant em app/admin/(shell)/configuracoes/actions.ts:
- role=operator recebe 403 amigavel
- owner/manager podem editar
- Validacao: nome, hex #RRGGBB, URL https
- revalidatePath('/admin', 'layout') para refletir imediatamente
```

---

### Issue: **Gerenciar business_hours no admin**
Status → **Done**
```
Entregue no commit 0b8fbeb.

/admin/configuracoes/horarios:
- 7 linhas (Dom-Sab), cada uma com:
  - Toggle aberto/fechado
  - Time inputs para abre/fecha (HH:mm, step 15 min)
  - Select de duracao do slot (30/60/90/120 minutos)
- Validacao: opens_at < closes_at; slot 30-180 min

Server action updateBusinessHours faz delete-all + insert dos dias
ativos para o establishment do tenant logado. Revalida /reservar e
/admin/reservas.
```

---

### Issue: **Criar slot_blocks manualmente no admin**
Status → **Done**
```
Entregue no commit 0b8fbeb.

/admin/configuracoes/bloqueios:
- Form adiciona 1 slot por vez: data + select de horario (11:00 a 23:00
  em passos de 30 min)
- Lista de bloqueios futuros com botao Remover
- Trata erro 23505 (duplicidade) com mensagem "Esse horario ja esta
  bloqueado"
- BloqueiosView converte (data local + HH:mm) -> ISO UTC usando o
  timezone real do establishment (Intl.DateTimeFormat)

Server actions createSlotBlock e deleteSlotBlock com ownership do
tenant validada no server.
```

---

## Autenticacao & Multi-tenancy

### Issue: **Trocar senha provisoria do admin@parrilla8187.com.br**
Status → **Done**
```
Feito hoje. Senha gerada com openssl rand -hex 8 | fold -w4 | paste
-sd'-' - e atualizada via PUT /auth/v1/admin/users/{id} com a service
role key. Login validado via POST /auth/v1/token?grant_type=password
retornando access_token.

Nova credencial guardada no cofre do cliente.
```

---

## Seguranca & Saneamento

### Issue: **Corrigir title default 'Create Next App' em app/layout.tsx**
Status → **Done**
```
Entregue no commit 27fb257.

app/layout.tsx agora tem metadata completa:
- title.default = "Parrilla 8187 — Reservas online"
- title.template = "%s · Parrilla 8187"
- description PT-BR
- OpenGraph e Twitter cards com metadataBase
- viewport-fit=cover + themeColor #F5C042
- lang="pt-BR" no html

Rota /reservar tem metadata proprio ("Reservar sua mesa").
Confirmado em producao: <title>Parrilla 8187 — Reservas online</title>
em /, e "Reservar sua mesa · Parrilla 8187" em /reservar.
```

---

### Issue: **Log de eventos suspeitos (muitas reservas do mesmo IP)**
Status → **In Progress** (parcialmente entregue)
```
Parcial no commit fcf7bcf.

Ja entregue:
- Migration supabase/migrations/20260421_audit_log.sql aplicada
- Tabela audit_log com tenant_id, establishment_id, ip, event_type,
  details jsonb, indices para consulta rapida
- RLS permite SELECT so para membros do tenant
- app/lib/audit.ts: logAuditEvent best-effort (falha silenciosamente
  se tabela nao existir)
- Eventos ja sendo registrados: rate_limit_reserve, rate_limit_slots,
  rate_limit_beto, reservation_rejected_over_limit,
  reservation_rejected_invalid_phone, reservation_created
- Validado end-to-end: 35 requests em /api/reservar/slots geraram 5
  eventos rate_limit_slots em audit_log

Ainda falta (escopo reduzido desta issue):
- Deteccao proativa de >5 reservas em 10min do mesmo IP (alerta
  ativo, nao so log)
- UI no admin para consultar eventos (/admin/audit)

Posso continuar ou abro nova issue para o que falta?
```

---

## Infraestrutura & DevOps

### Issue: **Backup automatico diario do banco Supabase**
Status → **Done**
```
Entregue no commit 27fb257.

- scripts/backup-supabase.sh: dump logico via REST API (6 tabelas +
  auth.users), empacota em tar.gz, rotacao automatica >30 dias
- scripts/restore-supabase.sh com modo --dry-run
- /etc/systemd/system/parrilla-backup.timer: dispara diariamente as
  03:30 -03, Persistent=true (roda se servidor estiver off)
- Credenciais em /etc/parrilla-booking/backup.env (0600, so root)
- Backups em /var/backups/parrilla-booking/
- Log consolidado em /var/log/parrilla-backup.log

Primeiro backup real validado (data + auth.users + manifest tudo ok).
```

---

### Issue: **Monitoring de uptime com alerta Slack/Telegram**
Status → **In Progress** (infra entregue, falta configurar monitores)
```
Infra 100% pronta:
- Uptime Kuma deployado em https://uptime.parilla8187.antrop-ia.com
- Volume persistente (uptime-kuma_uptime-kuma-data)
- Certificado Let's Encrypt valido
- Healthcheck + restart policy

Pendente: configurar UI (5 min):
1. Criar conta admin no primeiro acesso
2. Adicionar 3 monitores HTTP:
   - https://reservas.parilla8187.antrop-ia.com/ (200)
   - https://reservas.parilla8187.antrop-ia.com/reservar (200)
   - https://reservas.parilla8187.antrop-ia.com/admin/login (200)
3. Conectar canal de notificacao (Telegram/Slack/Discord)

Movo pra Done quando a config da UI estiver feita.
```

---

### Issue: **Documentar comando de rollback emergencial**
Status → **Done**
```
Entregue no commit aa6f1e4.

docs/runbook.md cobre:
- Arvore de decisao para panico (app nao responde / deploy ruim / dado
  perdido / etc)
- Rollback via Swarm PreviousSpec (1 passo) ou rebuild de commit antigo
- Restore de banco a partir de .tar.gz
- Reset de senha do admin
- Renovacao forcada de certificado Let's Encrypt
- Operacao do Uptime Kuma
- Apendice com mapa de arquivos importantes

README.md aponta para o runbook.
```

---

## Issues que devem ser fechadas / atualizadas sem mover status

### Todas as issues que ja estavam Done antes do Sprint 3
Nenhuma acao nova — mantem o status Done.
(Deploy Docker, infra Traefik, schema multi-tenant, fluxo publico, etc.)

### Issues ainda Todo/Backlog (nenhum comentario novo)
- **Fluxo 'esqueci minha senha' para admin** — Sprint 5.C, 2h, nao atacamos hoje
- **Ativar resolver de tenant dinamico no frontend** — Sprint 5.D, so precisa quando entrar 2o cliente
- **Documentar onboarding de novo tenant** — Sprint 5.D, idem
- **Migrar getAvailability() para PL/pgSQL** — Sprint 4, debito tecnico
- **Cache HTTP de 60s na API de slots** — Sprint 4, idem
- **Pipeline CI/CD (git push -> deploy automatico)** — Sprint 4, idem
- **Migrar cardapio hardcoded para tabelas do Supabase** — Sprint 6.C, 8h, low ROI

---

## Resumo final

| Categoria | Done hoje | Done antes | Ainda pendente |
|---|---|---|---|
| Fluxo Publico de Reserva | 3 | 0 | 0 |
| Atendente IA (Beto) | 0 | 3 (Sprint 3) | 1 (menu DB) |
| Painel Admin | 3 | 0 | 0 |
| Autenticacao & Multi-tenancy | 1 | 0 | 3 |
| Seguranca & Saneamento | 1 (parcial) | 1 | 0 |
| Disponibilidade & Slots | 0 | 0 | 2 |
| Infraestrutura & DevOps | 2 (parcial) | 1 | 1 (CI/CD) |
| **Total** | **10** | **5** | **7** |

**Defesas em producao hoje:** rate limit (3 rotas) + validacao WhatsApp + limite por numero + captcha Turnstile + audit log funcionando (35 reqs -> 5 bloqueios registrados no banco).

Produto pronto pra divulgacao publica.

---

## Sprint 5.C — Esqueci minha senha admin (25/04/2026)

> SHA do commit: **72a70ff**

### Issue: **Sprint 5.C — Fluxo "esqueci minha senha" para admin**
Status → **Done**
```
Entregue no commit 72a70ff.

Fluxo self-service: admin pede reset de senha pelo email, recebe
link do Supabase Auth, define nova senha e e redirecionado pro login.

Arquivos novos:
- app/admin/esqueci-senha/{page.tsx, EsqueciSenhaForm.tsx, actions.ts}
  Form pede email, server action chama supabase.auth.resetPasswordForEmail
  com redirectTo=publicUrl('/admin/redefinir-senha'). Rate limit 3/min/IP
  e anti-enumeracao (sempre devolve "se o email existir, voce vai
  receber um link").
- app/admin/redefinir-senha/{page.tsx, NovaSenhaForm.tsx, actions.ts}
  Page consome ?code= do email via exchangeCodeForSession; se invalido,
  redireciona pra /admin/esqueci-senha?error=link_expirado. Form valida
  8-72 chars + confirmacao. Action chama supabase.auth.updateUser, faz
  signOut e redireciona /admin/login?success=senha_redefinida pra forcar
  login limpo com a senha nova.

Arquivos modificados:
- app/admin/login/page.tsx: mensagem verde de sucesso quando vem
  ?success=senha_redefinida + link "Esqueci minha senha" abaixo do form.
- middleware.ts: libera /admin/esqueci-senha e /admin/redefinir-senha
  como rotas publicas (mesmo bloco do /admin/login).

Smoke test em producao:
  /admin/login -> 200
  /admin/esqueci-senha -> 200
  /admin/redefinir-senha -> 200

Limitacao conhecida: a senha so pode ser trocada pelo proprio admin
(nao ha fluxo "owner reseta senha de outro admin"). Esse caso seria
um botao "Pedir reset" na lista de admins, fora do escopo de 5.C.
```

---

## Sprint 4 — Disponibilidade robusta + CI (26/04/2026)

> SHAs dos commits: **a4ffc75** (4.1+4.2) + **67ca04d** (4.3)

### Issue: **Migrar getAvailability() para PL/pgSQL**
Status → **Done**
```
Entregue no commit a4ffc75 + migration aplicada manualmente no Supabase
em 25/04/2026 (Dashboard -> SQL Editor).

Migration: supabase/migrations/20260425_get_availability_function.sql
- Function public.get_availability(p_establishment_id uuid, p_date date)
  retorna table(slot_start, slot_end, available) numa unica round-trip,
  substituindo as 3 queries TS antigas em app/lib/availability.ts.
- Respeita business_hours do dia da semana, derruba slots com reserva
  (status 'confirmed' ou 'pending') e slot_blocks da mesma data.
- SECURITY DEFINER + GRANT EXECUTE para anon, authenticated, service_role.
- + 2 indices auxiliares (parciais) em reservations e slot_blocks.

app/lib/availability.ts reescrito pra chamar admin.rpc(get_availability)
via createAdminClient.

Validacao em producao:
- get_availability(<establishment>, '2026-04-25') retorna 12 slots,
  com 5 marcados available=false, batendo 1:1 com as 5 reservas
  confirmadas existentes (13:00, 14:00, 15:00, 18:00 e 21:00).

Decisao de design: comportamento timezone-naive (UTC), identico ao TS
atual, pra nao deslocar slot_starts ja gravados em producao. Switch
pra timezone-aware (usar establishments.timezone) fica como follow-up
+ data migration separado.
```

---

### Issue: **Cache HTTP de 60s na API de slots**
Status → **Done**
```
Entregue no commit a4ffc75.

middleware.ts agora seta o header em /api/reservar/slots:
  Cache-Control: public, max-age=60, s-maxage=60, stale-while-revalidate=30

Por que no middleware e nao no route handler: Next 16 descarta
Cache-Control retornado por GET handlers dynamic-by-default (que usam
request.url ou request.headers). O middleware atua sobre a response final
e o header sobrevive. Verificado: probe direto no container e via Traefik
mostra o header presente.

Risco aceitavel: durante a janela de 60s o front pode mostrar um slot
ja vendido — a action createReservationAction valida via constraint
unico em reservations e devolve erro amigavel se houver conflito.
```

---

### Issue: **Pipeline CI/CD (git push -> deploy automatico)**
Status → **In Progress (parcial)**
```
Entrega parcial no commit 67ca04d.

Foi entregue:
- .github/workflows/ci.yml dispara em push e PR de master
- Job: npm ci -> npx tsc --noEmit -> next build
- Build usa placeholders nas envs do Supabase/Groq/Turnstile
  (so valida que compila, sem deploy)

Falta (sprint futuro):
- Job de deploy via SSH no Swarm — exige SSH key + secrets configurados
  no GitHub. Nao foi adicionado pra evitar pendencia de credencial.

Observacao: o primeiro run do workflow (push do 67ca04d) ficou marcado
como "failure" porque a conta do GitHub esta bloqueada por billing.
Quando regularizar, o CI roda automaticamente e os proximos pushes
ficam validados.
```

---

## Sprint 6.A.3 — Deteccao burst + UI auditoria (27/04/2026)

> SHA do commit: **2c17818**

### Issue: **Detecao proativa de abuso (burst > 5 reservas/IP/10min)**
Status → **Done**
```
Entregue no commit 2c17818.

Logica: app/lib/audit.ts ganhou checkReservationBurst(ip, tenantId, ...)
que, apos cada reserva criada com sucesso, conta reservation_created do
mesmo IP nos ultimos 10min. Se passa do threshold (5), registra um
evento burst_detected no audit_log. Anti-spam: so loga 1 vez por IP
por janela.

Disparada em app/reservar/actions.ts apos o insert via void (best-effort,
nao bloqueia, nao envia alerta). O sinal fica no audit_log e aparece
em /admin/audit (badge rose destacado).

AuditEventType extendido com 'burst_detected'.

Limitacao conhecida: nao envia alerta proativo (Telegram/Slack/email).
Quem precisa investigar precisa abrir /admin/audit. Tornar push fica
como follow-up se o uso crescer.
```

---

### Issue: **UI /admin/audit para consulta de eventos**
Status → **Done**
```
Entregue no commit 2c17818.

Nova rota /admin/audit (server component, force-dynamic):
- Lista as 200 linhas mais recentes do audit_log do tenant.
- Filtros: janela (24h/7d/30d/tudo), tipo de evento, IP.
- Tabela com 4 colunas: quando (BR-Recife), evento (badge colorido),
  IP (mono), detalhes (resumo curto + json on-demand).
- Badge: amber pros rate_limit, vermelho pros rejected, verde pros
  reservation_created, rose-bold pro burst_detected.
- Link "Auditoria" no nav do shell admin.

Smoke test em producao:
  /admin/audit (sem login) -> 307 (redireciona pra /admin/login)

Acesso por enquanto nivelado com o resto do shell (qualquer membership
ve). Restringir a owner/manager fica como follow-up.
```
