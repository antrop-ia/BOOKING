# Comentarios prontos para o Plane (fechamento 21/04/2026)

Para cada issue abaixo, **mude o status para o indicado** e **cole o comentario** na caixa de comentarios da issue. Os comentarios sao curtos, falam o que foi feito, e apontam o commit + arquivos de referencia.

Ordem: do mais recente (Sprint 6) para o mais antigo (Sprint 1), agrupado por module do Plane.

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
