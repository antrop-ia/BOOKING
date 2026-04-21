# Roadmap e Próximos Passos

Documento de execução do projeto. Organiza a evolução em fases e mantém visíveis os próximos passos imediatos e as prioridades da semana.

---

## Nome do cliente

Parrilla 8187 — Bar e Churrascaria

## Nome do projeto

Plataforma de Reservas Online + Atendente IA "Beto"

## Visão geral

O projeto é entregue em 4 fases. **Fase 1 (Fundação e MVP)** já está concluída — a frente pública aceita reservas reais e o atendente Beto está operacional. **Fase 2 (Admin operável)** é a fase atual: tornar o painel administrativo conectado aos dados reais e fechar lacunas de segurança para liberar o go-live público. **Fase 3 (Operação e escala)** trata de robustez, persistência do chat e auto-serviço do tenant. **Fase 4 (Anti-abuso e expansão)** prepara o sistema para volume de uso real e abre caminho para multi-tenancy ativa com outros restaurantes.

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
**Status:** [ ] Não iniciada  [x] Em andamento  [ ] Concluída

Entregas:

- [ ] **Sprint 1 — Saneamento de segurança** (1-2h)
  - Remover ou proteger `/api/debug/availability` e `/api/debug/tenant`
  - Corrigir metadata default (`<title>` ainda diz "Create Next App")
  - Rate limiting básico em `/api/reservar/slots` e `createReservationAction` (ex: 10 req/min por IP)
- [ ] **Sprint 2 — Admin conectado ao banco** (4-6h)
  - Server actions `confirmReservation` e `cancelReservation`
  - Converter `app/admin/(shell)/reservas/page.tsx` em server component lendo `reservations` real
  - Filtros funcionais (data, status) via URL params
  - KPIs do dashboard ligados a `count()` queries reais
  - Modal "Nova reserva" reutilizando a server action de criação pública
  - Botão WhatsApp gerando `wa.me/55{telefone}?text=...` com template de mensagem
- [ ] Trocar senha do admin antes de entregar ao cliente
- [ ] Validação end-to-end com o cliente em ambiente de produção
- [ ] Definir e comunicar data oficial de go-live público

---

## Fase 3 — Operação e qualidade

**Objetivo:** Após o sistema estar em uso real, melhorar a experiência (memória do chat), robustez (timezone, performance) e dar autonomia ao cliente para configurar horários e bloqueios sem precisar de dev.
**Período:** 02/05 → 16/05 _(estimado)_
**Status:** [ ] Não iniciada  [ ] Em andamento  [ ] Concluída

Entregas:

- [ ] **Sprint 3 — Chat persistente** (3-4h)
  - Tabela `beto_conversations` (id, session_id, messages jsonb, created_at)
  - Retomada de conversa via cookie de sessão
  - Indicador visual "continuar de onde parou"
- [ ] **Sprint 4 — Disponibilidade robusta** (2-3h)
  - Migrar `getAvailability()` para função PL/pgSQL no Supabase
  - Tornar timezone-aware (usar `timezone` do `establishments` ao invés de UTC)
  - Cache de 60s na API de slots
- [ ] **Sprint 5 — Configurações editáveis pelo cliente** (2h)
  - Editar nome do estabelecimento, cor de marca, URL do logo
  - Gerenciar `business_hours` (abrir/fechar por dia da semana, ajustar duração de slot)
  - Criar `slot_blocks` manualmente (ex: "fechado dia 25/12", "evento privado dia 10/05")

---

## Fase 4 — Anti-abuso e expansão

**Objetivo:** Preparar o sistema para volume público real (proteção contra bots e spam) e abrir caminho para onboarding de outros restaurantes (multi-tenancy ativa, fluxo de cadastro de novo tenant).
**Período:** 18/05 → 30/05 _(estimado)_
**Status:** [ ] Não iniciada  [ ] Em andamento  [ ] Concluída

Entregas:

- [ ] **Sprint 6 — Anti-abuso** (2-3h)
  - Captcha (Cloudflare Turnstile) no formulário de reserva
  - Limite de 3 reservas futuras ativas por número de telefone
  - Log de eventos suspeitos (muitas tentativas vindas do mesmo IP)
- [ ] Persistência do histórico do Beto vinculada à reserva (auditável pelo admin)
- [ ] Edição visual do cardápio do Beto (hoje hardcoded em `app/lib/beto/menu.ts`)
- [ ] Provisionamento de um segundo tenant de demonstração para validar arquitetura multi-tenant
- [ ] Documentação de onboarding de novo restaurante (passo-a-passo de cadastro)

---

## Próximos passos imediatos

Ações concretas a executar agora, independente da fase:

- [ ] Iniciar Sprint 1 (saneamento de segurança) — responsável: AntropIA — prazo: 21/04
- [ ] Confirmar pontos focais do lado Parrilla 8187 (proprietário, gestor de sala, contato técnico) — responsável: PO AntropIA + Cliente — prazo: 21/04
- [ ] Trocar senha provisória do admin antes da próxima reunião com o cliente — responsável: AntropIA — prazo: 21/04
- [ ] Iniciar Sprint 2 (admin funcional) imediatamente após o Sprint 1 — responsável: AntropIA — prazo: 25/04
- [ ] Agendar reunião de validação end-to-end com o cliente em ambiente de produção — responsável: PO AntropIA — prazo: 28/04

## Prioridades da semana

Semana de 19/04 a 26/04:

1. Concluir Sprint 1 (segurança) — destravar a divulgação pública sem riscos
2. Concluir Sprint 2 (admin real) — entregar painel utilizável para o restaurante
3. Validar entrega com o cliente e definir data oficial de go-live

## Observações

- O sistema está deployado em infraestrutura própria (servidor AntropIA com Docker Swarm + Traefik), não em Vercel. Isso traz custo zero por reserva e reaproveita stack existente, mas significa que escalabilidade horizontal exige orquestração manual no Swarm.
- O cardápio do Beto está hardcoded no código TypeScript (`app/lib/beto/menu.ts`). Atualizações de preço hoje exigem rebuild da imagem Docker. A migração para edição visual está prevista na Fase 4.
- Há comentário explícito no código (`app/lib/availability.ts`) marcando o cálculo atual como "protótipo: 3 queries em TypeScript" e prevendo migração para PL/pgSQL — isso virou a Sprint 4.
- A arquitetura de banco já é multi-tenant (com `tenants` e `tenant_memberships`), mas o frontend hoje resolve apenas o tenant `parrilla8187` hardcoded em `app/reservar/actions.ts`. O esforço para ativar multi-tenancy real é pequeno e pode ser feito junto com o onboarding do segundo restaurante.
- Documentos relacionados: `01_Resumo-do-Projeto.md`, `02_Status-e-Andamento.md`, `04_Decisoes-e-Alinhamentos.md`.
