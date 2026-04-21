# Roadmap e Próximos Passos

Documento de execução do projeto. Organiza a evolução em fases e mantém visíveis os próximos passos imediatos e as prioridades da semana.

---

## Nome do cliente

Parrilla 8187 — Bar e Churrascaria

## Nome do projeto

Plataforma de Reservas Online + Atendente IA "Beto"

## Visão geral

O projeto é entregue em 4 fases. **Fase 1 (Fundação e MVP)**, **Fase 2 (Admin operável)** e **Fase 3 (Operação e qualidade)** já estão concluídas — o sistema está em produção, o painel admin é 100% funcional, o Beto tem histórico persistente e o cliente consegue editar identidade/horários/bloqueios. **Fase 4 (Anti-abuso e expansão)** está parcialmente entregue (Sprint 6.A+B no ar: validação de WhatsApp, limite de 3 reservas e captcha Turnstile; audit log parcial) e recebeu um add-on não previsto inicialmente — **Sprint 8 (Área do Cliente)**, com login self-service por magic link, lista de reservas, cancelamento próprio e resgate de reservas anônimas. Resta **Sprint 4 (performance + CI/CD)**, **Sprint 5.C/D (esqueci a senha + multi-tenant dinâmico)**, **Sprint 6.C (cardápio editável)** e a detecção proativa de abuso.

---

## Fase 1 — Fundação e MVP

**Objetivo:** Ter o fluxo público de reserva no ar com domínio próprio, HTTPS válido e gravação real no banco; entregar o atendente Beto funcional com cardápio completo; entregar o painel admin (mesmo que com dados de demonstração) para validação visual com o cliente.
**Período:** 14/04 → 19/04
**Status:** [x] Concluída

Entregas:

- [x] Repositório inicializado com Next.js 16 + Tailwind 4 + Supabase + Groq
- [x] Schema multi-tenant no Supabase (tenants, establishments, business_hours, reservations, slot_blocks, tenant_memberships) + RLS
- [x] Fluxo público de reserva (4 telas mobile-first) gravando no banco
- [x] API de disponibilidade (`/api/reservar/slots`) consultando dados reais
- [x] Atendente Beto integrado ao Groq com cardápio completo e personalidade local
- [x] Painel admin com login, dashboard e listagem de reservas (UI demo)
- [x] Deploy em Docker Swarm + Traefik com HTTPS automático
- [x] Domínio `reservas.parilla8187.antrop-ia.com` configurado e propagado
- [x] Usuário admin provisionado no Supabase Auth com role `owner`
- [x] Auditoria completa do estado atual e roadmap aprovado

---

## Fase 2 — Admin operável e go-live público

**Objetivo:** Ao final desta fase o restaurante consegue **operar** o sistema sem suporte: ver reservas reais no painel, confirmar/cancelar reservas, abrir conversa de WhatsApp com o hóspede, criar reservas manualmente. Em paralelo, fechar as lacunas de segurança para liberar a divulgação pública sem riscos.
**Período:** 21/04 → 30/04
**Status:** [ ] Não iniciada  [ ] Em andamento  [x] Concluída

Entregas:

- [x] **Sprint 1 — Saneamento de segurança** (1-2h) — commit `27fb257`
  - Remover ou proteger `/api/debug/availability` e `/api/debug/tenant`
  - Corrigir metadata default (`<title>` ainda diz "Create Next App")
  - Rate limiting básico em `/api/reservar/slots` e `createReservationAction` (ex: 10 req/min por IP)
- [x] **Sprint 2 — Admin conectado ao banco** (4-6h) — commit `27fb257`
  - Server actions `confirmReservation` e `cancelReservation`
  - Converter `app/admin/(shell)/reservas/page.tsx` em server component lendo `reservations` real
  - Filtros funcionais (data, status) via URL params
  - KPIs do dashboard ligados a `count()` queries reais
  - Modal "Nova reserva" reutilizando a server action de criação pública
  - Botão WhatsApp gerando `wa.me/55{telefone}?text=...` com template de mensagem
- [x] Trocar senha do admin antes de entregar ao cliente
- [ ] Validação end-to-end com o cliente em ambiente de produção
- [ ] Definir e comunicar data oficial de go-live público

---

## Fase 3 — Operação e qualidade

**Objetivo:** Após o sistema estar em uso real, melhorar a experiência (memória do chat), robustez (timezone, performance) e dar autonomia ao cliente para configurar horários e bloqueios sem precisar de dev.
**Período:** 02/05 → 16/05 _(estimado)_
**Status:** [ ] Não iniciada  [x] Em andamento  [ ] Concluída _(parcial: Sprint 3 e 5 done, Sprint 4 pendente)_

Entregas:

- [x] **Sprint 3 — Chat persistente** (3-4h) — commit `5cdb946`
  - Tabela `beto_conversations` (id, session_id, messages jsonb, created_at)
  - Retomada de conversa via cookie de sessão
  - Indicador visual "continuar de onde parou"
- [ ] **Sprint 4 — Disponibilidade robusta** (2-3h)
  - Migrar `getAvailability()` para função PL/pgSQL no Supabase
  - Tornar timezone-aware (usar `timezone` do `establishments` ao invés de UTC)
  - Cache de 60s na API de slots
- [x] **Sprint 5 — Configurações editáveis pelo cliente** (2h) — commit `0b8fbeb`
  - Editar nome do estabelecimento, cor de marca, URL do logo
  - Gerenciar `business_hours` (abrir/fechar por dia da semana, ajustar duração de slot)
  - Criar `slot_blocks` manualmente (ex: "fechado dia 25/12", "evento privado dia 10/05")

---

## Fase 4 — Anti-abuso e expansão

**Objetivo:** Preparar o sistema para volume público real (proteção contra bots e spam) e abrir caminho para onboarding de outros restaurantes (multi-tenancy ativa, fluxo de cadastro de novo tenant).
**Período:** 18/05 → 30/05 _(estimado)_
**Status:** [ ] Não iniciada  [x] Em andamento  [ ] Concluída _(parcial: 6.A e 6.B done, detecção proativa + 6.C pendentes)_

Entregas:

- [x] **Sprint 6.A — Validação + limite + audit log** — commit `fcf7bcf`
  - Validação de WhatsApp robusta (10-13 dígitos + prefixo 55)
  - Limite de 3 reservas futuras ativas por número
  - Audit log funcional (rate_limit_*, reservation_rejected_*)
- [x] **Sprint 6.B — Captcha Cloudflare Turnstile** — commit `76115bc`
- [ ] **Sprint 6 — Detecção proativa de abuso** (resto)
  - Regra "> 5 reservas do mesmo IP em 10 min → alerta"
  - UI `/admin/audit` para consulta de eventos
- [ ] **Sprint 6.C — Cardápio editável pelo cliente** (~8h)
  - Migrar `app/lib/beto/menu.ts` para tabelas `menu_categories` + `menu_items`
  - UI admin para CRUD de itens
- [ ] Persistência do histórico do Beto vinculada à reserva (auditável pelo admin)
- [ ] Provisionamento de um segundo tenant de demonstração para validar arquitetura multi-tenant
- [ ] Documentação de onboarding de novo restaurante (passo-a-passo de cadastro)

---

## Fase 5 (add-on) — Área do Cliente

**Objetivo:** Dar ao cliente final (hóspede) uma conta com histórico de reservas, cancelamento self-service e vínculo automático de novas reservas. Entrega completa em 1 sprint.
**Período:** 21/04/2026
**Status:** [x] Concluída _(pendente: aplicar template de email no Supabase e deploy da imagem `sprint8.2`)_

Entregas:

- [x] **Sprint 8 — Área do Cliente** (I-01 a I-10) — commits `6538705` (core I-01 a I-04), `47ff6eb` (entrega final I-05 a I-10), `31caa35` (docs — SHA no plane-comments)
  - I-01: migration `reservations.user_id` nullable + RLS `user_id = auth.uid()`
  - I-02: `/entrar` com form de magic link + callback handler
  - I-03: middleware protegendo `/minhas-reservas/*`
  - I-04: lista agrupada (Próximas / Histórico) em `/minhas-reservas`
  - I-05: detalhe em `/minhas-reservas/[codigo]` + `.ics` + cancelamento com ownership dupla
  - I-06: `createReservation` grava `user_id` quando cliente está logado
  - I-07: `resgatarReserva` com rate limit 5/min + form inline
  - I-08: `PublicHeader` flutuante (pill top-right) com login/logout/link
  - I-09: template de email Parrilla em `docs/email-templates/magic-link.html`
  - I-10: CTA pós-confirmação + auto-resgate por email no callback

---

## Próximos passos imediatos

Ações concretas a executar agora:

- [ ] **Deploy da imagem `parrilla-booking:sprint8.2`** — cobre os commits `47ff6eb` + `31caa35` que ficam de fora da `sprint8.1` atual em produção — responsável: AntropIA — prazo: hoje
- [ ] **Aplicar template de email no Supabase** — Dashboard → Authentication → Email Templates → Magic Link, colar `docs/email-templates/magic-link.html` — responsável: AntropIA — prazo: hoje (bloqueia fechamento da I-09)
- [ ] **Atualizar Plane** — colar os 10 comentários de `docs/plane-comments.md` e mover status — responsável: AntropIA — prazo: hoje
- [ ] **Smoke test end-to-end do Sprint 8** em produção — reserva anônima → CTA "Salvar na minha conta" → magic link → auto-vínculo → detalhe → `.ics` + cancelar — responsável: AntropIA — prazo: pós-deploy
- [ ] **Uptime Kuma** — 5 min de UI (conta + 3 monitores + canal) — responsável: AntropIA — prazo: pré-demo
- [ ] **Agendar demo end-to-end com o cliente** — responsável: PO AntropIA — prazo: 28/04

## Prioridades da semana

Semana de 19/04 a 26/04:

1. Destravar deploy do Sprint 8 (build + push + redeploy) e aplicar template de email — condição para a I-09 virar Done
2. Atualizar todas as issues no Plane com comentários e status finais
3. Concluir configuração do Uptime Kuma e validar end-to-end em produção
4. Validar entrega com o cliente e definir data oficial de go-live

## Observações

- O sistema está deployado em infraestrutura própria (servidor AntropIA com Docker Swarm + Traefik), não em Vercel. Isso traz custo zero por reserva e reaproveita stack existente, mas significa que escalabilidade horizontal exige orquestração manual no Swarm.
- O cardápio do Beto está hardcoded no código TypeScript (`app/lib/beto/menu.ts`). Atualizações de preço hoje exigem rebuild da imagem Docker. A migração para edição visual está prevista na Fase 4.
- Há comentário explícito no código (`app/lib/availability.ts`) marcando o cálculo atual como "protótipo: 3 queries em TypeScript" e prevendo migração para PL/pgSQL — isso virou a Sprint 4.
- A arquitetura de banco já é multi-tenant (com `tenants` e `tenant_memberships`), mas o frontend hoje resolve apenas o tenant `parrilla8187` hardcoded em `app/reservar/actions.ts`. O esforço para ativar multi-tenancy real é pequeno e pode ser feito junto com o onboarding do segundo restaurante.
- Documentos relacionados: `01_Resumo-do-Projeto.md`, `02_Status-e-Andamento.md`, `04_Decisoes-e-Alinhamentos.md`.
