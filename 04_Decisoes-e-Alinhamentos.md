# Decisões e Alinhamentos

Registro das decisões técnicas, de produto e de escopo tomadas ao longo do projeto. Cada entrada explica **contexto**, **decisão**, **motivo** e — quando aplicável — **alternativas descartadas**. O que está aqui foi acordado e não deve ser renegociado sem passar por nova decisão explícita.

---

## Nome do cliente

Parrilla 8187 — Bar e Churrascaria

## Nome do projeto

Plataforma de Reservas Online + Atendente IA "Beto"

---

## Índice

1. [Arquitetura e stack](#1-arquitetura-e-stack)
2. [Produto e escopo](#2-produto-e-escopo)
3. [Infraestrutura e deploy](#3-infraestrutura-e-deploy)
4. [Segurança](#4-segurança)
5. [IA e atendente Beto](#5-ia-e-atendente-beto)
6. [Pendências de decisão](#6-pendências-de-decisão)

---

## 1. Arquitetura e stack

### D-001 — Next.js 16 App Router para frontend e backend

- **Contexto:** Precisávamos de SSR + rotas de API no mesmo projeto, deploy único, forte integração com edge/serverless se necessário.
- **Decisão:** Next.js 16 com App Router, TypeScript estrito, Tailwind CSS 4.
- **Motivo:** Time tem domínio da ferramenta, tipagem ponta-a-ponta, RSC reduz JS no cliente, ecossistema maduro.
- **Descartado:** Remix (menos familiaridade), SvelteKit (ecosistema menor), Nest + React separados (complexidade desnecessária para MVP).

### D-002 — Supabase como banco e auth

- **Contexto:** Precisávamos de PostgreSQL gerenciado + auth pronto + Row Level Security para preparar multi-tenant.
- **Decisão:** Supabase (Postgres 15, Auth, RLS).
- **Motivo:** Remove ~2 sprints de infra de auth e DB, RLS nativo é essencial para o modelo multi-tenant futuro, custo zero no plano inicial.
- **Descartado:** Postgres auto-hospedado + NextAuth (mais manutenção), Firebase (lock-in maior, SQL ausente).

### D-003 — Schema multi-tenant desde o dia 1

- **Contexto:** O projeto começa com o Parrilla 8187, mas a arquitetura da AntropIA prevê outros restaurantes.
- **Decisão:** Todas as tabelas têm `tenant_id`; RLS baseia acesso no `tenant_memberships`. Apenas o Parrilla é provisionado nesta fase.
- **Motivo:** Migrar dados depois custa caro; preparar agora tem custo marginal.

---

## 2. Produto e escopo

### D-010 — Fluxo público em 4 telas, mobile-first

- **Contexto:** Clientes reservam majoritariamente pelo celular; cada tela extra reduz conversão.
- **Decisão:** Data/pessoas → horários → dados → confirmação. Nada de cadastro prévio; basta nome + telefone.
- **Motivo:** Reduz fricção ao mínimo e replica o modelo validado em concorrentes.

### D-011 — Código de reserva `#P8187-XXXX`

- **Contexto:** Cliente e restaurante precisam de uma referência curta.
- **Decisão:** 4 caracteres alfanuméricos após prefixo fixo por tenant.
- **Motivo:** Curto o suficiente para ditar no telefone, único por restaurante, serve como identificador humano nos cards do admin e nas mensagens do Beto.

### D-012 — Cardápio hardcoded nesta fase

- **Contexto:** Edição visual de cardápio é escopo grande; cliente não listou como prioridade.
- **Decisão:** Cardápio completo (~80 itens) fica no código; alteração requer PR. Edição pelo cliente fica para fase posterior.
- **Motivo:** Reduz superfície de bug e acelera go-live; frequência de mudança é baixa.

---

## 3. Infraestrutura e deploy

### D-020 — Docker Swarm + Traefik no servidor AntropIA

- **Contexto:** Já existe um enxame Swarm com outros produtos AntropIA; Traefik cuida de roteamento e TLS.
- **Decisão:** Deploy como serviço no mesmo enxame, HTTPS automático via Let's Encrypt.
- **Motivo:** Zero custo extra de infra, rollback simples, mesmo padrão operacional dos demais produtos.
- **Descartado:** Vercel (menor controle sobre domínio personalizado + custo recorrente), VPS dedicado (overkill).

### D-021 — Domínio `reservas.parilla8187.antrop-ia.com`

- **Contexto:** Cliente não quer operar domínio próprio por enquanto.
- **Decisão:** Subdomínio sob `antrop-ia.com`, padrão `<produto>.<tenant>.antrop-ia.com`.
- **Motivo:** Zero configuração do lado do cliente; coerente com o padrão da AntropIA para produtos whitelabel.

---

## 4. Segurança

### D-030 — Middleware para todas as rotas `/admin`

- **Contexto:** Painel admin precisa estar protegido sem checagem manual em cada página.
- **Decisão:** Middleware do Next + Supabase Auth verifica sessão antes de qualquer rota `/admin/*`.
- **Motivo:** Centraliza a política de acesso; evita erro por esquecimento em páginas novas.

### D-031 — Endpoints de debug devem sair antes do go-live

- **Contexto:** Há 2 endpoints expostos sem auth usados em desenvolvimento.
- **Decisão:** Remoção obrigatória na Sprint 1 — Segurança, sem exceção.
- **Motivo:** Qualquer URL pública sem auth é superfície de ataque.

---

## 5. IA e atendente Beto

### D-040 — Groq + Llama 3.3-70B com streaming

- **Contexto:** Precisamos de latência baixa, tom coloquial e custo previsível.
- **Decisão:** Groq como provider; Llama 3.3-70B como modelo; resposta em streaming.
- **Motivo:** Latência muito menor que OpenAI/Anthropic em chat curto, custo ~1/10, qualidade suficiente para triagem e harmonização.
- **Descartado:** GPT-4 (custo alto demais para volume esperado), Claude (latência maior no tier usado), Llama self-hosted (infra a mais).

### D-041 — Sem histórico persistente

- **Contexto:** Cliente não pediu histórico; guardar conversas implica LGPD.
- **Decisão:** Conversas só vivem na sessão do navegador; nada é gravado no banco.
- **Motivo:** Zero superfície LGPD nesta fase; se o cliente quiser depois, é feature isolada.

### D-042 — Magic link como auth do cliente final (21/04/2026)

- **Contexto:** Entregar área do cliente (login + histórico de reservas + cancelamento self-service) sem adicionar dependências externas nem custo mensal.
- **Decisão:** Usar Supabase Auth com magic link por email como único método de V1. Cliente reserva sem login continua funcionando (conversão > atrito); login é opt-in.
- **Motivo:** Zero senha para lembrar, funciona entre dispositivos, reaproveita infra já usada pelo admin, mesma migração futura para OTP/WhatsApp é aditiva.
- **Descartado:** Email+senha (pior UX), OTP WhatsApp (depende de Twilio/Evolution paga), consulta só por código (sem histórico entre dispositivos).

### D-043 — Exceção ao padrão de 7 modules fixos (21/04/2026)

- **Contexto:** O padrão AntropIA § 4.2 define 7 modules canônicos (Fluxo Público, Atendente IA, Disponibilidade, Painel Admin, Auth & Multi-tenant, Segurança & Saneamento, Infraestrutura & DevOps). A feature "Área do Cliente" tem superfície suficientemente distinta (novas rotas, nova persistência de identidade, fluxo próprio) que agrupá-la em `Auth & Multi-tenant` ou `Fluxo Público` esconderia o escopo no board.
- **Decisão:** Criar 8º module `Área do Cliente` + 7º cycle `Sprint 8 - Área do Cliente` (02/05 → 09/05) só neste projeto (BOOK). O padrão permanece válido para novos projetos.
- **Motivo:** Visibilidade no painel > pureza do padrão. O stakeholder abre o módulo e vê a feature inteira agrupada.
- **Impacto:** `rules-operacionais.md` deste projeto ganha a exceção; o template applier AntropIA (`/opt/plane/antropia-template/`) permanece inalterado — futuros projetos seguem os 7 padrões.

### D-044 — user_id nullable + RLS por auth.uid() (21/04/2026)

- **Contexto:** Reservas existentes foram feitas sem conta; reservas futuras podem ou não ter usuário logado.
- **Decisão:** Coluna `reservations.user_id uuid NULL` com FK `auth.users(id) ON DELETE SET NULL` + nova RLS policy permitindo SELECT quando `user_id = auth.uid()`. Admin continua lendo tudo via service role.
- **Motivo:** Zero impacto nas reservas existentes, zero perda de histórico se usuário for deletado, permite fluxo anônimo + fluxo logado lado a lado.

### D-045 — `PublicHeader` como pill flutuante (21/04/2026)

- **Contexto:** I-08 pedia "header navegacional" nas telas públicas. `BookingScreen` (`/reservar`) já tem cabeçalho próprio rico (logo P 8187 + endereço + divisor) e `MinhasReservasView` também tinha um cabeçalho inline. Um header full-width adicional duplicaria o branding e empurraria o conteúdo do BookingFlow para baixo, quebrando o ritmo visual mobile-first.
- **Decisão:** `PublicHeader` é um *pill flutuante* (`position: fixed`, `top:14px`, `right:14px`, `z-index:50`) que mostra "Entrar" se deslogado, ou "Minhas reservas" + "Sair" se logado. Server component, sem JS extra (form action). Aplicado em `/reservar`, `/minhas-reservas` e `/minhas-reservas/[codigo]` — fica fora de `/`, `/entrar` e `/admin`. O cabeçalho inline antigo de `MinhasReservasView` perdeu o botão "Sair" duplicado.
- **Motivo:** Discreto, zero regressão visual nos fluxos existentes, mobile-first sem reflow.

### D-046 — Auto-resgate de reserva por email no callback do magic link (21/04/2026)

- **Contexto:** I-10 cria CTA "Salvar reserva na minha conta" em `ConfirmacaoScreen` que leva o cliente recém-confirmado para `/entrar?email=X&resgatar=CODIGO`. O fluxo "puro" exigiria que ele preenchesse WhatsApp de novo no form de resgate manual (I-07) — atrito desnecessário.
- **Decisão:** Quando o callback do magic link recebe `?resgatar=CODIGO`, o servidor tenta `tryAutoResgateByEmail`: busca a reserva por prefixo do UUID + `user_id IS NULL` e, se o email gravado em `guest_contact` bater com `user.email`, vincula `user_id = auth.uid()` automaticamente. Se o auto-vínculo falha, o `?resgatar=` é preservado no redirect para que o form manual abra com o código pré-preenchido (fallback I-07).
- **Motivo:** Ownership do email já foi provado pelo magic link (Supabase Auth) — exigir WhatsApp seria redundante. Falha silenciosa garante que o caminho manual continua disponível e não há cenário de "vínculo errado" porque o match é estrito por email.
- **Risco descartado:** Alguém compartilhar a URL de confirmação. Para reivindicar, atacante precisaria ter acesso ao email da reserva — o mesmo que faria login normal — então o ataque não adiciona superfície.

### D-047 — Evolution API dedicada para notificações WhatsApp (21/04/2026)

- **Contexto:** Sprint 9 precisa disparar mensagem WhatsApp para a equipe do restaurante quando chega reserva nova. Existe instância Evolution compartilhada rodando na SmartFlow, mas mudar configuração/API key lá impacta outros produtos.
- **Decisão:** Subir stack dedicada `parrilla-evolution` no Swarm (api + postgres + redis) em `minha_rede`. Manager UI exposta em `evolution.parilla8187.antrop-ia.com` com Basic Auth via Traefik; API interna acessada pelo Next via `http://parrilla-evolution-api:8080`. `AUTHENTICATION_API_KEY` em `/etc/parrilla-booking/evolution.env` (0600). Hook `notifyNewReservation` é best-effort com try/catch (mesma filosofia do `audit.ts`): falha silenciosa, nunca derruba a reserva — cada tentativa é registrada em `notification_log`.
- **Motivo:** Isolamento (SmartFlow permanece intacto), propriedade clara do estado da sessão WhatsApp (volume `parrilla_evolution_instances` vai no backup diário), e liberdade para evoluir API key/template sem coordenação com outros produtos.
- **Descartado:** Reutilizar a instância da SmartFlow (mistura tenants), Twilio (custo mensal + contrato), OTP nativo Meta Business API (exige aprovação do WhatsApp + custo).

### D-048 — 9º module 'Admin editável & notificações' + 8º cycle Sprint 9 (21/04/2026)

- **Contexto:** Seguindo o mesmo raciocínio do D-043 (Área do Cliente), a Sprint 9 entrega (a) stack Evolution nova + (b) UI admin de notificações + (c) hook na criação de reserva. Agrupar isso em algum dos 7 canônicos (Painel Admin, Infraestrutura & DevOps) dilui visibilidade.
- **Decisão:** Criar 9º module `Admin editável & notificações` + 8º cycle `Sprint 9 - Notificações WhatsApp` (28/04 → 05/05) só no BOOK. Futuras sprints de notificação/WhatsApp de outros tenants também ficarão neste module.
- **Motivo:** Quem abre o BOOK vê a feature inteira agrupada. O template applier AntropIA segue inalterado — outros projetos continuam 7 modules + 6 cycles.

---

## 6. Pendências de decisão

- **Processo de confirmação de reserva** — hoje é manual pelo admin; precisa decidir se confirma automaticamente após regra X, notifica por WhatsApp/SMS ou permanece manual.
- **Política de no-show e limite de reservas por telefone** — Sprint 6 (Anti-abuso) depende disso.
- **Edição de cardápio pelo cliente** — se vira fase 3/4 ou se termina como responsabilidade do time AntropIA.
