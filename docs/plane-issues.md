# Conteudo de cada work item no Plane

Referencia para preencher cada issue no Plane com descricao, criterios de aceite e status atual. Sprints 1, 2 e 3 foram entregues — as issues fechadas estao marcadas com o commit que as resolveu.

---

## DONE — ja podem ser marcadas como "Done" no Plane

### [P0] Corrigir title default 'Create Next App'

**Module**: Seguranca & Saneamento
**Cycle**: Sprint 1
**Status**: Done — commit `27fb257` (21/04/2026)

**Resumo**: Substituido o metadata default do `create-next-app` por metadata completa em [app/layout.tsx](app/layout.tsx): `title.default = "Parrilla 8187 — Reservas online"`, `title.template = "%s · Parrilla 8187"`, description em PT-BR, OpenGraph + Twitter cards, `viewport-fit=cover`, `themeColor: "#F5C042"`. Rota `/reservar` tem metadata proprio ("Reservar sua mesa").

---

### [P0] Trocar senha provisoria do admin@parrilla8187.com.br

**Module**: Autenticacao & Multi-tenancy
**Cycle**: Sprint 2
**Status**: Done (21/04/2026)

**Resumo**: Senha antiga `Parrilla8187!` substituida por senha gerada aleatoriamente via `openssl rand -hex 8 | fold -w4 | paste -sd'-'`. Nova senha atualizada via Supabase Auth Admin API (`PUT /auth/v1/admin/users/{id}`) e validada com login real. Nova credencial armazenada no cofre do cliente.

---

### [P1] Backup automatico diario do banco Supabase

**Module**: Infraestrutura & DevOps
**Cycle**: Sprint 1
**Status**: Done — commit `27fb257` (21/04/2026)

**Resumo**: Sistema de backup logico via REST API do Supabase (evita precisar compartilhar senha do Postgres). Dumpa 6 tabelas + `auth.users` em JSON, empacota em `.tar.gz`, armazena em `/var/backups/parrilla-booking/` com rotacao de 30 dias. Systemd timer dispara diariamente as 03:30 -03. Script de restore disponivel com modo `--dry-run`. Primeiro backup real validado em producao.

**Artefatos**:
- [scripts/backup-supabase.sh](scripts/backup-supabase.sh)
- [scripts/restore-supabase.sh](scripts/restore-supabase.sh)
- `/etc/systemd/system/parrilla-backup.timer`
- `/etc/parrilla-booking/backup.env` (0600, no servidor)

---

### [P1] Monitoring de uptime com alerta Slack/Telegram

**Module**: Infraestrutura & DevOps
**Cycle**: Sprint 1
**Status**: Done — infra deployada (21/04/2026)

**Resumo**: Uptime Kuma deployado como servico Swarm em `uptime.parilla8187.antrop-ia.com`, com certificado Let's Encrypt automatico via Traefik. Falta apenas configuracao de UI (3 monitores HTTP + canal de notificacao) — 5 min de clique. Instrucoes no [README.md](README.md).

**Artefatos**:
- `/root/uptime-kuma/docker-compose.yml`
- Volume persistente `uptime-kuma_uptime-kuma-data`

---

### [P3] Documentar comando de rollback emergencial

**Module**: Infraestrutura & DevOps
**Cycle**: Sprint 1
**Status**: Done — commit `aa6f1e4` (21/04/2026)

**Resumo**: Runbook em [docs/runbook.md](docs/runbook.md) cobre arvore de decisao para panico: app nao responde, rollback de deploy, restore de banco, reset de senha admin, renovacao de cert Let's Encrypt e operacao do Uptime Kuma. Apendice com mapa de arquivos e comandos mais usados.

---

### [P2] Tabela beto_conversations para persistir historico

**Module**: Atendente IA (Beto)
**Cycle**: Sprint 3
**Status**: Done — commit `5cdb946` (21/04/2026)

**Resumo**: Migration em [supabase/migrations/20260421_beto_conversations.sql](supabase/migrations/20260421_beto_conversations.sql) criou a tabela com schema completo: `id uuid`, `tenant_id uuid FK`, `session_id text`, `messages jsonb`, timestamps com trigger de `updated_at`, unique index em `(tenant_id, session_id)`, index para listagem por data, RLS permitindo SELECT a membros do tenant.

---

### [P2] UI 'continuar de onde parou' no BetoChat

**Module**: Atendente IA (Beto)
**Cycle**: Sprint 3
**Status**: Done — commit `5cdb946` (21/04/2026)

**Resumo**: Ao abrir o chat pela primeira vez na sessao, faz GET `/api/beto/history`. Se retornar mensagens, `setMessages(...)` e mostra badge amarelo "Continuando sua conversa anterior" acima do scroll. Botao "Nova" no header dispara DELETE `/api/beto/history` para limpar. Session cookie (`beto_session`) e setado pelo middleware em `/reservar` e `/api/beto/*`.

---

### [P1] Rate limiting no /api/beto/chat (30 msg/h por sessao)

**Module**: Atendente IA (Beto)
**Cycle**: Sprint 3
**Status**: Done — commit `5cdb946` (21/04/2026)

**Resumo**: Reutiliza [app/lib/rate-limit.ts](app/lib/rate-limit.ts) com `key = beto:{sessionId}`, `limit: 30`, `windowMs: 3_600_000`. Responde `HTTP 429` com header `Retry-After` quando estourar. Session_id vem do cookie HttpOnly setado pelo middleware (nao pode ser burlado pelo cliente).

---

## TODO / BACKLOG — texto pronto pra copiar pra cada issue no Plane

### [P1] Adicionar Cloudflare Turnstile (captcha) no form de reserva

**Module**: Fluxo Publico de Reserva
**Cycle**: Sprint 6
**Priority**: High
**Labels**: `priority:p1`, `type:security`, `area:public`
**Estimate**: 2h

**Descricao**:
Adicionar protecao contra bots no formulario de reserva publico. Hoje qualquer script consegue postar no `createReservationAction` sem desafio algum.

**Criterios de aceite**:
- [ ] Conta Cloudflare Turnstile criada, site key e secret key guardados em `.env`
- [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY` disponivel no build (hard-coded no bundle do cliente, OK)
- [ ] `TURNSTILE_SECRET_KEY` server-only, nao vazar
- [ ] Widget Turnstile renderizado na tela `DadosScreen` (ultima antes de confirmar)
- [ ] Token do widget enviado junto do `createReservationAction`
- [ ] Server valida o token chamando `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`
- [ ] Rejeita reserva se validacao falhar, com mensagem "Confirmacao de seguranca invalida"
- [ ] Fluxo manual do admin (`createManualReservation`) nao passa por captcha

**Implementacao**:
- Lib recomendada: `@marsidev/react-turnstile`
- Endpoint de verificacao retorna `{ success: boolean, ... }`
- Adicionar no `.env.example` as duas novas chaves

---

### [P2] Limite de 3 reservas futuras ativas por WhatsApp

**Module**: Fluxo Publico de Reserva
**Cycle**: Sprint 6
**Priority**: Medium
**Labels**: `priority:p2`, `type:security`, `area:public`
**Estimate**: 1h

**Descricao**:
Pessoa pode reservar quantas vezes quiser com o mesmo telefone — serve de vetor pra squat de horarios. Limitar a 3 reservas futuras ativas (status `confirmed` ou `pending`) por telefone.

**Criterios de aceite**:
- [ ] Antes de inserir em `reservations`, contar quantas linhas com o mesmo `guest_contact` tem `slot_start >= now()` e `status NOT IN ('cancelled')`
- [ ] Se count `>= 3`, rejeitar com mensagem "Voce ja tem 3 reservas ativas. Cancele uma antes de reservar mais."
- [ ] Funciona tanto pelo fluxo publico quanto via admin
- [ ] Count usa a parte numerica de `guest_contact` ja normalizada (o contato vem em formato `WhatsApp | email | ocasiao: ... | pessoas: N`)

**Implementacao**:
- Adicionar a checagem em `app/lib/reservations.ts` na `createReservation`
- Usar `sanitizeWhatsappDigits` pra normalizar antes de comparar
- Pode usar `ilike '%{digits}%'` no `guest_contact` ou criar um indice parcial

---

### [P3] Validacao mais robusta de formato de WhatsApp

**Module**: Fluxo Publico de Reserva
**Cycle**: Sprint 6
**Priority**: Low
**Labels**: `priority:p3`, `type:feature`, `area:public`
**Estimate**: 1h

**Descricao**:
Hoje o campo aceita qualquer string no `whatsapp` do formulario — ja foram recebidos valores como "81" ou "nao tenho". Adicionar validacao client + server.

**Criterios de aceite**:
- [ ] Apos `sanitizeWhatsappDigits` o valor deve ter entre 10 e 13 digitos
- [ ] Se nao comecar com 55, aplicar o prefixo implicitamente (padrao whatsappLink)
- [ ] Erro visivel embaixo do campo: "Numero precisa ter DDD + 8 ou 9 digitos"
- [ ] Server rejeita se validacao falhar (defesa em profundidade)

---

### [P2] Migrar getAvailability() para PL/pgSQL

**Module**: Disponibilidade & Slots
**Cycle**: Sprint 4
**Priority**: Medium
**Labels**: `priority:p2`, `type:debt`, `area:infra`
**Estimate**: 3h

**Descricao**:
Hoje [app/lib/availability.ts](app/lib/availability.ts) faz 3 queries e calcula slots em TypeScript — a primeira linha do arquivo ja marca isso como "Protótipo: 3 queries + cálculo em TypeScript. Fase 2: mover para função PL/pgSQL para performance em escala." Migrar para uma function SQL que retorna slots livres em uma unica round-trip.

**Criterios de aceite**:
- [ ] Function `public.get_availability(p_establishment_id uuid, p_date date)` que retorna `table(slot_start timestamptz, slot_end timestamptz, available boolean)`
- [ ] Function respeita `business_hours` do dia da semana correto
- [ ] Considera o timezone do `establishment` (hoje sempre UTC)
- [ ] Subtrai reservas com status `confirmed` ou `pending`
- [ ] Subtrai `slot_blocks` daquela data
- [ ] `app/lib/availability.ts` passa a fazer `rpc('get_availability', {...})` em vez das 3 queries atuais
- [ ] Teste: mesmos inputs devem dar mesmos outputs da versao TypeScript

**Implementacao**:
- Migration em `supabase/migrations/20260YYMMDD_get_availability_function.sql`
- Escrever em PL/pgSQL para clareza (evitar SQL puro complicado)
- Rodar `EXPLAIN ANALYZE` nas 3 queries atuais vs a function para medir ganho

---

### [P3] Cache HTTP de 60s na API de slots

**Module**: Disponibilidade & Slots
**Cycle**: Sprint 4
**Priority**: Low
**Labels**: `priority:p3`, `type:feature`, `area:infra`
**Estimate**: 30min

**Descricao**:
Slots mudam de 60 em 60 minutos (granularidade). Nao faz sentido bater no banco cada refresh de pagina. Adicionar cache curto no response.

**Criterios de aceite**:
- [ ] `app/api/reservar/slots/route.ts` retorna header `Cache-Control: public, max-age=60, s-maxage=60`
- [ ] CDN (caso tivesse) e browser respeitam
- [ ] Nao quebra quando um slot e reservado dentro dos 60s (usuario pode ver slot ocupado-mas-ainda-exibido; tela de confirmacao ja trata erro de duplicate)

---

### [P2] Fluxo 'esqueci minha senha' para admin

**Module**: Autenticacao & Multi-tenancy
**Cycle**: Sprint 5
**Priority**: Medium
**Labels**: `priority:p2`, `type:feature`, `area:admin`
**Estimate**: 2h

**Descricao**:
Admin nao tem como recuperar senha sozinho — hoje depende da AntropIA rodar script. Adicionar fluxo self-service via magic link.

**Criterios de aceite**:
- [ ] Link "Esqueci minha senha" na tela de login
- [ ] Tela `/admin/esqueci-senha` com input de email
- [ ] Server action chama `supabase.auth.resetPasswordForEmail(email, { redirectTo: ... })`
- [ ] Email enviado pelo Supabase (template default ja serve)
- [ ] Link redireciona pra `/admin/nova-senha` com token
- [ ] Tela de nova senha valida min 8 chars + confirma match
- [ ] Apos reset, redireciona pra `/admin` ja logado

**Implementacao**:
- Supabase Auth ja tem toda infra, so precisa de 2 telas novas + 2 server actions
- Template do email pode ser customizado em Supabase Dashboard → Authentication → Templates

---

### [P3] Ativar resolver de tenant dinamico no frontend

**Module**: Autenticacao & Multi-tenancy
**Cycle**: Sprint 5
**Priority**: Low
**Labels**: `priority:p3`, `type:feature`, `area:public`
**Estimate**: 3h

**Descricao**:
Hoje `parrilla8187` / `boa-viagem` estao hardcoded em [app/reservar/actions.ts](app/reservar/actions.ts) (e mais alguns lugares). Precisa pra receber o segundo cliente.

**Criterios de aceite**:
- [ ] Estrategia decidida: path-prefix `/r/{tenantSlug}/...` ou subdomain `{tenantSlug}.reservas.antrop-ia.com`
- [ ] `resolvePublicTenantContext` recebe slug via URL param/subdomain, nao mais constantes
- [ ] Fluxo `/reservar` continua funcionando para Parrilla (retrocompativel: `/reservar` alias pra `/r/parrilla8187`)
- [ ] `app/[tenant]/[establishment]/page.tsx` ja tem a estrutura — so precisa ativar as rotas
- [ ] Redirects de URLs antigas (`/reservar` → novo path)

**Implementacao**:
- Path-prefix e mais simples (nao precisa mexer em DNS)
- Considerar middleware para resolver tenant no inicio do request

---

### [P3] Documentar onboarding de novo tenant

**Module**: Autenticacao & Multi-tenancy
**Cycle**: Sprint 5
**Priority**: Low
**Labels**: `priority:p3`, `type:docs`, `area:admin`
**Estimate**: 1h

**Descricao**:
Processo para cadastrar um novo restaurante (tenant) hoje e completamente manual e nao documentado.

**Criterios de aceite**:
- [ ] Novo arquivo `docs/onboarding-tenant.md`
- [ ] Passo-a-passo com SQL pra rodar no Supabase:
  - [ ] INSERT em `tenants` (nome, slug, brand_color, logo_url)
  - [ ] INSERT em `establishments` (tenant_id, slug, nome, timezone)
  - [ ] INSERT em `business_hours` (7 linhas, uma por weekday)
- [ ] Como criar o primeiro admin user (Supabase Auth Admin API)
- [ ] Como associar em `tenant_memberships` com role `owner`
- [ ] Checklist final: login testado, dashboard exibe nome correto, reserva publica funciona

---

### [P2] Edicao de configuracoes do tenant (nome, cor, logo)

**Module**: Painel Admin
**Cycle**: Sprint 5
**Priority**: Medium
**Labels**: `priority:p2`, `type:feature`, `area:admin`
**Estimate**: 2h

**Descricao**:
Hoje `/admin/configuracoes` e read-only. Dar ao dono do restaurante controle de marca sem precisar pedir pra AntropIA.

**Criterios de aceite**:
- [ ] Form em `/admin/configuracoes` para editar: `name`, `brand_color` (color picker), `logo_url` (input texto ou upload)
- [ ] Server action `updateTenant` com role check (so `owner` e `manager`, nao `operator`)
- [ ] Preview em tempo real da cor
- [ ] Salvar mostra toast de sucesso e refresca
- [ ] `brand_color` valida que e hex `#RRGGBB`
- [ ] `logo_url` valida que e URL HTTPS

**Implementacao**:
- Upload de logo pode vir depois — V1 aceita so URL
- Se for fazer upload, usar Supabase Storage

---

### [P2] Gerenciar business_hours no admin

**Module**: Painel Admin
**Cycle**: Sprint 5
**Priority**: Medium
**Labels**: `priority:p2`, `type:feature`, `area:admin`
**Estimate**: 3h

**Descricao**:
Horarios de funcionamento hoje so podem ser alterados via SQL direto. Precisa de UI pra o cliente.

**Criterios de aceite**:
- [ ] Nova secao `/admin/configuracoes/horarios`
- [ ] Tabela 7 linhas (um por dia da semana): toggle `aberto/fechado`, input `abre em`, `fecha em`, duracao do slot em minutos
- [ ] Server action `updateBusinessHours` (upsert)
- [ ] Validacao: abre < fecha, slot duration entre 30 e 120 minutos
- [ ] Mudanca reflete imediatamente na API `/api/reservar/slots` (nao cachar muito)
- [ ] Role check igual ao tenant config

---

### [P2] Criar slot_blocks manualmente no admin

**Module**: Painel Admin
**Cycle**: Sprint 5
**Priority**: Medium
**Labels**: `priority:p2`, `type:feature`, `area:admin`
**Estimate**: 2h

**Descricao**:
Para bloquear datas especificas (feriados, evento privado, fechamento por reforma).

**Criterios de aceite**:
- [ ] Nova secao `/admin/configuracoes/bloqueios`
- [ ] Lista de bloqueios futuros com botao "remover"
- [ ] Form "adicionar bloqueio": data, inicio, fim, motivo opcional
- [ ] Server action `createSlotBlock` e `deleteSlotBlock`
- [ ] Bloqueio reflete em `/api/reservar/slots` (ja suportado pelo `getAvailability`)

---

### [P2] Log de eventos suspeitos (muitas reservas do mesmo IP)

**Module**: Seguranca & Saneamento
**Cycle**: Sprint 6
**Priority**: Medium
**Labels**: `priority:p2`, `type:security`, `area:admin`
**Estimate**: 2h

**Descricao**:
Detectar padroes de abuso e registrar para auditoria. Nao precisa bloquear automaticamente — so gerar sinal pra humano investigar.

**Criterios de aceite**:
- [ ] Migration cria tabela `public.audit_log` (id, ts, ip, event_type, details jsonb)
- [ ] Trigger: > 5 reservas do mesmo IP em 10 minutos → log + opcionalmente envia alerta no canal do Uptime Kuma
- [ ] Tenant-scoped (cada tenant so ve o proprio log)
- [ ] UI opcional no admin: `/admin/audit` (pode ficar pra outro sprint)

---

### [P3] Migrar cardapio hardcoded para tabelas do Supabase

**Module**: Atendente IA (Beto)
**Cycle**: Sprint 6
**Priority**: Low
**Labels**: `priority:p3`, `type:debt`, `area:admin`
**Estimate**: 1d (8h)

**Descricao**:
Cardapio vive em [app/lib/beto/menu.ts](app/lib/beto/menu.ts) como constante TypeScript (~80 itens). Mudanca de preco exige PR + deploy. Migrar pra tabelas pra que o cliente edite pelo admin.

**Criterios de aceite**:
- [ ] Migration cria `menu_categories` (id, tenant_id, name, order) e `menu_items` (id, category_id, name, price_cents, description, tags text[], active boolean)
- [ ] Seed SQL com o cardapio atual
- [ ] `buildBetoSystemPrompt()` le do banco em vez de importar constante
- [ ] Cache de 60s no server-side (cardapio nao muda toda requisicao)
- [ ] RLS: SELECT publico, INSERT/UPDATE/DELETE so via service_role
- [ ] UI do admin para editar fica no **Sprint 7** (fora do escopo desta issue)

**Implementacao**:
- Comecar so com read + seed, UI vem depois
- Preco em `price_cents` (integer) pra evitar float
- `tags` em `text[]` pra facilitar busca tipo "vegetariano", "familia", etc.

---

### [P2] Pipeline CI/CD (git push -> deploy automatico)

**Module**: Infraestrutura & DevOps
**Cycle**: Sprint 4
**Priority**: Medium
**Labels**: `priority:p2`, `type:feature`, `area:infra`
**Estimate**: 4h

**Descricao**:
Hoje todo deploy e manual: `ssh servidor && git pull && docker build && docker service update`. Automatizar com GitHub Actions.

**Criterios de aceite**:
- [ ] Workflow `.github/workflows/deploy.yml` dispara em push na `master`
- [ ] Job 1: typecheck (`tsc --noEmit`) e build (`next build`)
- [ ] Job 2 (so se 1 passou): build imagem com tag `deploy-{timestamp}`, push pra registry local do servidor (via SSH)
- [ ] Job 3: `docker service update --image ...` via SSH com `start-first` pra zero downtime
- [ ] Secrets: SSH key, SUPABASE env vars para build-time
- [ ] Rollback manual documentado no runbook (tags permitem voltar)

**Implementacao**:
- Registry local pode ser so `docker save | ssh | docker load` se nao quiser rodar registry
- Prefere `ssh -o StrictHostKeyChecking=no` para primeira conexao

---

## Resumo do backlog apos Sprints 1, 2, 3

| Categoria | Done | Pendente | Total |
|---|---|---|---|
| Seguranca & Saneamento | 1 | 1 | 2 |
| Autenticacao & Multi-tenancy | 1 | 3 | 4 |
| Painel Admin | 0 | 3 | 3 |
| Fluxo Publico de Reserva | 0 | 3 | 3 |
| Atendente IA (Beto) | 3 | 1 | 4 |
| Disponibilidade & Slots | 0 | 2 | 2 |
| Infraestrutura & DevOps | 3 | 1 | 4 |
| **Total** | **8** | **14** | **22** |

**Proximos sprints sugeridos** (ordem de impacto):
1. **Sprint 4** — Disponibilidade robusta + CI/CD (3 issues, ~7h)
2. **Sprint 5** — Auto-servico do tenant (5 issues, ~8h)
3. **Sprint 6** — Anti-abuso + cardapio editavel (6 issues, ~1.5 dias)
