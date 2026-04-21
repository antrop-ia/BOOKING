@AGENTS.md

# BOOKING / Parrilla 8187

Este repositório hospeda a plataforma de reservas online do restaurante **Parrilla 8187** com:

- fluxo público mobile-first em `app/reservar`
- painel administrativo em `app/admin`
- atendente IA "Beto" via Groq em `app/api/beto/*`
- Supabase como banco, auth e RLS
- deploy self-hosted em Docker Swarm + Traefik

Stack atual:

- `next@16.2.4`
- `react@19.2.4`
- `tailwindcss@4`
- `@supabase/ssr` + `@supabase/supabase-js`
- `ai@6` + `@ai-sdk/groq`

## Leia isto antes de mexer em qualquer coisa

Ordem recomendada para se inteirar:

1. [README.md](README.md)
2. [00_Overview-da-Solucao.md](00_Overview-da-Solucao.md)
3. [02_Status-e-Andamento.md](02_Status-e-Andamento.md)
4. [04_Decisoes-e-Alinhamentos.md](04_Decisoes-e-Alinhamentos.md)
5. [rules-operacionais.md](rules-operacionais.md)
6. [docs/runbook.md](docs/runbook.md)
7. [docs/plane-issues.md](docs/plane-issues.md)
8. [docs/plane-comments.md](docs/plane-comments.md)

Se a mudança tocar App Router, Server Actions, Route Handlers, cookies, auth ou middleware/proxy, leia também os guias locais do Next desta versão:

- `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`

Observação importante de Next 16:

- a documentação já trata `middleware.ts` como convenção depreciada em favor de `proxy.ts`
- este projeto **ainda usa** `middleware.ts` na raiz
- não renomeie isso de forma casual; faça só em mudança deliberada e validada

## Mapa rápido do produto

### Público

- `app/page.tsx` redireciona para `/reservar`
- `app/reservar/page.tsx` monta datas e, no estado atual do workspace, também busca espaços ativos
- `app/reservar/BookingFlow.tsx` orquestra as telas do fluxo
- `app/reservar/actions.ts` grava reserva via Server Action
- `app/api/reservar/slots/route.ts` devolve disponibilidade

### Admin

- `app/admin/login/*` autenticação via Supabase Auth
- `app/admin/(shell)/layout.tsx` resolve tenant do admin e aplica shell
- `app/admin/(shell)/page.tsx` dashboard com dados reais
- `app/admin/(shell)/reservas/*` CRUD de reservas
- `app/admin/(shell)/configuracoes/*` identidade, horários, bloqueios e espaços

### IA / Beto

- `app/api/beto/chat/route.ts` chat streaming via Groq
- `app/api/beto/history/route.ts` retomada/limpeza de conversa
- `app/lib/beto/system-prompt.ts` personalidade + regras
- `app/lib/beto/menu.ts` cardápio hardcoded
- `app/lib/beto/persistence.ts` persistência em `beto_conversations`
- `app/lib/beto/session.ts` cookie `beto_session`

### Domínio / Infra

- `app/lib/tenant.ts` resolve tenant público e admin
- `app/lib/reservations.ts` regra de criação/validação de reserva
- `app/lib/availability.ts` cálculo atual de slots
- `app/lib/date.ts` helpers timezone-aware
- `app/lib/rate-limit.ts` rate limit em memória
- `app/lib/audit.ts` audit log best-effort
- `app/lib/spaces.ts` leitura/administração de espaços
- `app/lib/turnstile.ts` verificação server-side do Cloudflare Turnstile
- `app/lib/supabase/server.ts` clients SSR e admin

## Invariantes que não podem ser quebrados

### Multi-tenant e segurança

- `tenant_id` nunca deve vir do cliente; sempre resolver server-side em `app/lib/tenant.ts`
- `createAdminClient()` usa `SUPABASE_SERVICE_ROLE_KEY` e **nunca** pode vazar para o cliente
- `NEXT_PUBLIC_*` pode ir para bundle; segredos não
- middleware ajuda, mas **não substitui** checagem de auth/autorização dentro de Server Actions e Route Handlers

### Reservas

- a criação central passa por `app/lib/reservations.ts`
- conflito de slot depende do constraint único no banco e é tratado como erro amigável
- `guest_contact` hoje é um campo composto com WhatsApp + extras serializados
- qualquer mudança nesse formato exige revisar:
  - `buildGuestContact`
  - `parseGuestContact`
  - dashboard/admin
  - geração de link de WhatsApp
  - possíveis docs/Plane que descrevem a regra

### Disponibilidade

- `app/lib/availability.ts` ainda é o protótipo de 3 queries + cálculo em TypeScript
- a leitura pública usa admin client apenas para `slot_start`, porque RLS pública não expõe reservas/bloqueios
- se mexer em disponibilidade, revisar também timezone e regras de turno

### Datas e timezone

- não invente aritmética de data; prefira `app/lib/date.ts`
- dashboard/admin usam timezone do estabelecimento
- bloqueios usam conversão local -> UTC com `Intl.DateTimeFormat`

### Beto

- o Beto não pode fechar reserva pelo chat
- o cardápio é hardcoded em TypeScript e qualquer preço/descrição nova deve ser alterado ali
- histórico do Beto depende do cookie `beto_session`, criado pelo middleware para evitar problemas no Edge runtime

### Rate limit e auditoria

- `app/lib/rate-limit.ts` é in-memory por processo
- funciona para o cenário atual, mas não é distribuído entre réplicas
- se houver mudança de escala/arquitetura, isso precisa ser reavaliado
- `app/lib/audit.ts` é best-effort: não pode derrubar fluxo principal

## Estado real do workspace

Além do histórico já commitado, o workspace pode conter trabalho em andamento. Antes de editar:

1. rode `git status --short`
2. identifique arquivos alterados pelo usuário
3. nunca reverta trabalho alheio sem pedido explícito

No momento em que este `CLAUDE.md` foi preenchido, existe uma frente local não commitada ligada a **espaços do restaurante**:

- migration `supabase/migrations/20260421_establishment_spaces.sql`
- admin em `app/admin/(shell)/configuracoes/espacos/*`
- fluxo público com `app/reservar/_components/EspacoScreen.tsx`

Importante:

- esse fluxo de espaços aparenta estar **em andamento**
- parte da UI pública já referencia espaço
- a gravação server-side ainda precisa ser conferida ponta a ponta antes de assumir feature concluída
- trate isso como WIP se encontrar diffs locais

## Convenções práticas desta base

### Server vs Client Components

- páginas e layouts são Server Components por padrão
- marque só o mínimo necessário com `'use client'`
- mantenha fetch de dados e acesso a segredos no server
- use Client Components apenas para estado, eventos e browser APIs

### Server Actions

- o projeto usa Server Actions como caminho principal de mutação
- toda action deve validar auth, autorização, payload e invariantes no próprio arquivo
- se a action altera dados exibidos no admin/público, revalide os caminhos corretos com `revalidatePath`

### Route Handlers

- use para integrações HTTP, streaming, BFF e endpoints públicos
- lembre que `GET` route handlers não são cacheados por padrão
- qualquer uso de `headers()`, `cookies()`, `request.url`, query etc torna o handler dinâmico de fato

### Supabase

- `createClient()` em `app/lib/supabase/server.ts` é o client SSR com cookies
- `createAdminClient()` é bypass total de RLS
- para público, use o client SSR quando possível e o admin client apenas quando necessário e com menor exposição possível

### Frontend

- o fluxo público tem identidade visual própria escura da Parrilla
- o admin é neutro e injeta `--brand-primary` via tenant
- preserve essa separação visual
- não “neutralize” a UI pública para algo genérico sem necessidade

## Comandos úteis

Desenvolvimento:

```bash
npm install
npm run dev
```

Build local:

```bash
npm run build
```

Typecheck manual:

```bash
npx tsc --noEmit
```

Não há script de `lint` configurado em `package.json` neste momento. Não invente no fechamento que `npm run lint` foi executado se ele não existe.

Deploy e operação estão descritos em:

- [README.md](README.md)
- [docs/runbook.md](docs/runbook.md)
- [Dockerfile](Dockerfile)
- [docker-compose.yml](docker-compose.yml)

## Variáveis de ambiente esperadas

Obrigatórias no fluxo principal:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`

Captcha:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

Regras:

- `NEXT_PUBLIC_*` são públicas por definição
- `SUPABASE_SERVICE_ROLE_KEY` e `TURNSTILE_SECRET_KEY` são server-only
- em dev local, o Turnstile pode ficar desabilitado e a verificação faz bypass com warning

## Quando uma mudança exigir atualização de documentação

Atualize os docs do projeto sempre que mexer em comportamento real do sistema, roadmap, riscos ou operação:

- [02_Status-e-Andamento.md](02_Status-e-Andamento.md) se o estado atual mudou
- [03_Roadmap-e-Proximos-Passos.md](03_Roadmap-e-Proximos-Passos.md) se backlog/fase/prioridade mudou
- [04_Decisoes-e-Alinhamentos.md](04_Decisoes-e-Alinhamentos.md) se houve decisão técnica relevante
- [README.md](README.md) se mudou setup, estrutura, rotas ou operação
- [docs/runbook.md](docs/runbook.md) se mudou deploy, restore, rollback ou credenciais/processo operacional

## Regra obrigatória de fechamento para o Plane

O projeto usa o **Plane** como software de gestão. Ao final de uma entrega com commit(s), o fechamento **não termina no código**.

### Sempre gerar / atualizar o documento de comentários para o Plane

Arquivo principal:

- [docs/plane-comments.md](docs/plane-comments.md)

Esse arquivo precisa conter comentários prontos para colar no Plane com:

- status final da issue
- commit SHA
- resumo do que foi entregue
- arquivos ou áreas afetadas
- limitações, follow-ups ou entrega parcial quando existir

### Quando também atualizar o documento de conteúdo das issues

Arquivo:

- [docs/plane-issues.md](docs/plane-issues.md)

Atualize quando:

- nascer uma issue nova
- critérios de aceite mudarem
- prioridade / ciclo / módulo mudarem
- houver reescopo real do trabalho

### Checklist de fechamento esperado

Ao concluir uma entrega, siga esta ordem:

1. validar a mudança localmente no que fizer sentido
2. registrar exatamente quais arquivos e fluxos mudaram
3. produzir commit(s) claros e comentáveis
4. atualizar `docs/plane-comments.md` com comentários prontos para colar no Plane
5. se necessário, atualizar `docs/plane-issues.md`, status, roadmap e decisões
6. na resposta final, mencionar explicitamente:
   - o que foi entregue
   - se houve ou não validação
   - quais commits correspondem à entrega
   - que o material para o Plane foi atualizado

Se a entrega for parcial, diga isso claramente no comentário do Plane. Não maquie "parcial" como "Done".

## Checklist mental antes de editar

- Entendi se a mudança toca público, admin, IA, banco, infra ou docs?
- Li os docs do Next 16 relevantes para a peça que vou mexer?
- Verifiquei `git status` para não atropelar trabalho local do usuário?
- A mudança respeita `tenant_id` resolvido no servidor?
- Estou usando `createAdminClient()` só quando realmente preciso?
- Se mexi em reserva, revisei parser/formatter de `guest_contact`?
- Se mexi em data/hora, usei helpers de timezone?
- Se mexi em fluxo crítico, atualizei docs e Plane no fechamento?

## Resumo executivo para qualquer agente que cair aqui

Este é um projeto Next 16 moderno, mas com regras de domínio muito específicas:

- segurança multi-tenant por resolução server-side + RLS
- reservas e disponibilidade com lógica própria em Supabase/TypeScript
- chat IA com personalidade local e limitações explícitas
- operação real em produção com Swarm, Traefik, backup e runbook
- documentação viva faz parte do produto
- fechamento no Plane é obrigatório: código + commit + comentário pronto

Se for mudar algo importante, trate o repositório como sistema em produção e não como template de app.
