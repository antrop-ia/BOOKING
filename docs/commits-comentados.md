# Commits comentados — timeline do projeto

Lista cronológica de todos os commits do projeto **Parrilla 8187 — Plataforma de Reservas**, com contexto de cada entrega. Útil para status report, demo com cliente, onboarding de novo dev.

Repositório: https://github.com/antrop-ia/BOOKING

---

## Dia 1 — 17/04/2026 — Fundação e MVP

### `aa26f27` · 07:44 · **Initial commit from Create Next App**

Bootstrap do projeto com `create-next-app`: Next.js 16, TypeScript, Tailwind CSS 4. Ponto zero.

---

### `b048b18` · 08:47 · **feat: cycle 1 foundation — tenant resolution, availability, admin shell**

Sprint de fundação (3 dias condensados em 1 commit):

- **Dia 1**: Supabase SSR helpers (`server.ts`, `client.ts`, middleware), schema multi-tenant com RLS, unique index em `(establishment_id, slot_start)` contra dupla-reserva, resolvers de tenant e availability.
- **Dia 2**: layout público com cor de marca via CSS vars, `getAvailability` usando admin client (RLS bloqueia anon em `reservations`).
- **Dia 3**: login admin email/senha via server action, middleware protegendo `/admin/*`, shell com sidebar + páginas dashboard/reservas/config, logout.

**Entregou**: esqueleto do multi-tenant + autenticação + cálculo de disponibilidade.

---

### `e2c17ba` · 11:48 · **feat: Parrilla 8187 booking flow — v0 UI portado para Next.js + Supabase**

Portou a UI v0 (8 componentes client) para o repositório:
- `BookingScreen`, `HorariosScreen`, `DadosScreen`, `ConfirmacaoScreen` + primitivos (`PillSelector`, `DateCard`, `PrimaryButton`, `StatusBar`)
- `BookingFlow` orquestra state-navigation entre 4 telas
- API `/api/reservar/slots` filtra almoço/jantar e usa admin client para contornar RLS
- `createReservationAction` insere reserva com service role, trata conflito de slot (`23505`) com mensagem amigável
- Tema dark Parrilla (`#F5C042` + `#0A0906`), fontes Playfair Display + DM Sans + DM Mono
- `/` redireciona pra `/reservar`
- Instalou `ai`, `@ai-sdk/groq`, `@ai-sdk/react` (preparando o Beto)

**Entregou**: fluxo público de reserva funcional, mobile-first, gravando no banco.

---

### `02be3b1` · 12:01 · **feat: Beto — atendente Groq com cardápio da Parrilla 8187**

Atendente IA "Beto":
- `app/lib/beto/menu.ts`: cardápio estruturado (~80 itens em 8 categorias, com preços, descrições, tags)
- `app/lib/beto/system-prompt.ts`: persona descontraída com regras rígidas (não inventa pratos/preços, respostas curtas, menciona HH ter-sex 16-20h)
- `/api/beto/chat`: streaming via AI SDK 6 + Groq, modelo `llama-3.3-70b-versatile`, runtime edge
- `BetoChat.tsx`: botão flutuante + painel lateral dark, typing indicator, `useChat`
- Plugado no `BookingFlow` (disponível em todas as telas)

**Entregou**: chatbot conversacional com streaming, conhecimento do cardápio real.

---

## Dia 2 — 21/04/2026 — Produção, hardening e expansão

### `27fb257` · 05:06 · **feat: production-ready — deploy Swarm + Traefik, Sprint 1 e 2 entregues**

Primeiro grande commit de produção:

**Deploy**
- `Dockerfile` multi-stage (node:22-alpine, output standalone)
- `docker-compose.yml` com labels Traefik + healthcheck
- `.dockerignore` enxuto

**Sprint 1 — Saneamento**
- Remove `/api/debug/*`
- Metadata completa em `app/layout.tsx` (substituiu "Create Next App")
- Rate limiting em `/api/reservar/slots` e `createReservationAction`
- BetoChat: `z-index: 9999` + `safe-area-inset-bottom` (fix mobile)

**Sprint 2 — Admin operável**
- `/admin/reservas` e `/admin` consultam banco real (sem mock)
- Server actions: `confirmReservation`, `cancelReservation`, `createManualReservation`
- `NovaReservaModal`, `ReservasView` com filtros e WhatsApp link
- Helpers `app/lib/date.ts` (timezone-aware) e `app/lib/reservations.ts`

**Infraestrutura**
- `scripts/backup-supabase.sh` + `restore-supabase.sh` + systemd timer diário 03:30
- Rotação de 30 dias em `/var/backups/parrilla-booking/`

**Impacto**: produto vai do zero ao ar, com painel admin 100% real e backup automatizado.

---

### `aa6f1e4` · 05:07 · **docs: templates de projeto, overview da solução e runbook operacional**

Documentação padrão da AntropIA:
- `00_Overview-da-Solucao.md` (arquitetura + fluxos)
- `01_Resumo-do-Projeto.md`, `02_Status-e-Andamento.md`, `03_Roadmap-e-Proximos-Passos.md`, `04_Decisoes-e-Alinhamentos.md`, `05_Metricas-e-Sucesso.md`
- `docs/runbook.md` (pânico: rollback / restore / senha / cert / Uptime Kuma)
- `plane-import-issues.csv` (22 issues para import direto no Plane)
- `rules-operacionais.md`

**Entregou**: onboarding completo do projeto em documentos padronizados.

---

### `5cdb946` · 16:01 · **feat: Sprint 3 — chat persistente do Beto**

Persistência do histórico de conversas:

- Migration `20260421_beto_conversations.sql`: tabela `beto_conversations` (jsonb messages, unique `(tenant_id, session_id)`, RLS tenant-scoped)
- `app/lib/beto/session.ts`: `readBetoSession()` (cookie HttpOnly gerido pelo middleware)
- `app/lib/beto/persistence.ts`: `loadConversation` / `saveConversation` (upsert) / `clearConversation`
- `/api/beto/chat`: rate limit 30 msg/h por sessão, persiste no `onFinish` do `streamText`
- `/api/beto/history`: GET (retoma) + DELETE (nova conversa)
- `middleware.ts` estendeu matcher para `/api/beto/*` e cria cookie lá (Edge runtime não permitia em Route Handler)
- `BetoChat`: badge "Continuando sua conversa anterior" + botão "Nova"

**Entregou**: retomar conversa entre sessões + rate limit do chat.

---

### `40e5e13` · 16:41 · **docs: conteúdo pronto para cada work item no Plane**

`docs/plane-issues.md` com 22 issues detalhadas (8 Done + 14 pendentes), cada uma com descrição rica, critérios de aceite em checklist, notas de implementação e metadados (module/cycle/priority/labels/estimate).

**Entregou**: referência pro time popular o backlog sem reabrir CSV.

---

### `0b8fbeb` · 17:03 · **feat: Sprint 5 (A+B) — admin edita identidade, horários e bloqueios**

Self-service do tenant — **primeira feature grande que o cliente vê como autonomia**:

**5.A — Identidade**
- `app/admin/(shell)/configuracoes/actions.ts`: `updateTenant` com role check (`operator` bloqueado), valida hex + HTTPS URL
- `ConfiguracoesForm.tsx`: color picker nativo, preview em tempo real, toast + botão Desfazer

**5.B.1 — Horários**
- `/admin/configuracoes/horarios`: 7 linhas (Dom-Sáb), toggle aberto/fechado, abre/fecha (time input), duração do slot (30/60/90/120)
- `updateBusinessHours` valida tempos, faz delete-all + insert dos dias ativos
- Revalida `/reservar` — mudança reflete em tempo real

**5.B.2 — Bloqueios**
- `/admin/configuracoes/bloqueios`: form de 1 slot por vez + lista de bloqueios futuros com remover
- `BloqueiosView` converte (data local + hora) → ISO UTC usando o timezone do establishment

**Entregou**: cliente configura identidade visual, horários e bloqueios **sem dev**.

---

### `fcf7bcf` · 17:30 · **feat: Sprint 6.A — validação WhatsApp, limite 3 reservas e audit log**

Defesas anti-abuso sem dependência externa:

- `normalizeWhatsapp`: 10-13 dígitos, prefixo 55 implícito, rejeita internacional
- Limite **3 reservas ativas por WhatsApp** no fluxo público (admin bypassa)
- Novos códigos de erro: `invalid_phone`, `over_limit`
- Migration `20260421_audit_log.sql`: tabela `audit_log` (tenant_id, establishment_id, ip, event_type, details jsonb), índices para consulta rápida, RLS permite SELECT só pra membros do tenant
- `app/lib/audit.ts`: `logAuditEvent` best-effort (falha silenciosamente)
- Plug em 3 rotas: `rate_limit_reserve`, `rate_limit_slots`, `rate_limit_beto`, `reservation_rejected_*`, `reservation_created`

**Validação end-to-end**: 35 requests em `/api/reservar/slots` → 5 bloqueios registrados no `audit_log`.

**Entregou**: trilha de auditoria + 3 camadas de defesa anti-abuso.

---

### `76115bc` · 18:11 · **feat: Sprint 6.B — captcha Cloudflare Turnstile no form de reserva**

Última camada contra bots:

- `@marsidev/react-turnstile` como dep
- Widget Turnstile (tema dark, modo Managed) no `DadosScreen`, acima do botão Confirmar
- `app/lib/turnstile.ts`: verify server-side contra `https://challenges.cloudflare.com/turnstile/v0/siteverify`
- `createReservationAction` valida o token **antes de qualquer query ao banco**
- Token é single-use: reset no client em caso de erro
- `Dockerfile` aceita `NEXT_PUBLIC_TURNSTILE_SITE_KEY` como build-arg
- `docker-compose.yml` expõe `TURNSTILE_SECRET_KEY` em runtime

**Entregou**: proteção contra bots automatizados no formulário público.

---

### `afecc18` · 18:26 · **docs: comentários prontos para atualizar cada issue no Plane**

`docs/plane-comments.md`: 15 comentários curtos, um por issue do Plane, com commit de referência + arquivos principais + resumo. Organizados por module. Copy-paste-ready.

**Entregou**: fechamento do backlog no Plane sem precisar reabrir histórico.

---

### `66a8055` · 18:46 · **feat: espaços do restaurante — cliente escolhe onde sentar (obrigatório)**

Feature **extra** sugerida pelo cliente durante a sessão:

**Schema**
- Migration `20260421_establishment_spaces.sql`: tabela `establishment_spaces` (name, slug, description, icon emoji, sort_order, is_active), coluna `space_id` em `reservations` (nullable, ON DELETE SET NULL)
- Seed Parrilla: `🏛️ Salão interno` + `🌿 Varanda externa`

**Público — 5 telas (era 4)**
- `EspacoScreen` entre Horários e Dados, cards grandes com emoji + descrição + radio indicator, **seleção obrigatória**
- `/reservar/page.tsx` vira `force-dynamic` pra refletir espaços em tempo real
- `ConfirmacaoScreen` inclui linha "Espaço" no recibo

**Admin**
- `/admin/configuracoes/espacos`: CRUD completo (nome, slug auto, descrição, emoji picker, ordem, ativo), role check
- `/admin/reservas` mostra `ícone + nome` do espaço na linha e no detalhe expandido
- `NovaReservaModal` com dropdown de espaço pré-selecionado

**Retrocompatibilidade**: reservas antigas com `space_id = null` continuam válidas sem mostrar espaço.

**Entregou**: escolha obrigatória e visual de onde sentar, com admin autônomo para criar/editar áreas.

---

## Estatísticas finais

| Métrica | Valor |
|---|---|
| Commits no master | 13 |
| Dias de desenvolvimento efetivo | 2 (17/04 + 21/04) |
| Migrations SQL | 3 (`beto_conversations`, `audit_log`, `establishment_spaces`) |
| Linhas de código adicionadas | ~5.000 |
| Sprints entregues integralmente | 1, 2, 3, 6.A, 6.B |
| Sprints parciais | 5 (A+B sim, C+D não) |
| Feature extra entregue | Espaços do restaurante |

## Timeline visual

```
17/04
├─ 07:44  aa26f27  Initial
├─ 08:47  b048b18  Foundation (multi-tenant + availability + admin shell)
├─ 11:48  e2c17ba  Booking flow 4 telas
└─ 12:01  02be3b1  Beto

21/04
├─ 05:06  27fb257  Production-ready (Docker Swarm, Sprint 1+2)
├─ 05:07  aa6f1e4  Docs (runbook, templates, CSV Plane)
├─ 16:01  5cdb946  Sprint 3 (chat persistente)
├─ 16:41  40e5e13  Docs (conteúdo de cada issue)
├─ 17:03  0b8fbeb  Sprint 5 A+B (identidade + horários + bloqueios)
├─ 17:30  fcf7bcf  Sprint 6.A (validação + limite + audit_log)
├─ 18:11  76115bc  Sprint 6.B (captcha Turnstile)
├─ 18:26  afecc18  Docs (comentários Plane)
└─ 18:46  66a8055  Espaços do restaurante
```

**Produto em produção**: `https://reservas.parilla8187.antrop-ia.com`
**Admin**: `https://reservas.parilla8187.antrop-ia.com/admin/login`
**Monitoring**: `https://uptime.parilla8187.antrop-ia.com`
