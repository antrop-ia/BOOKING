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

---

## 6. Pendências de decisão

- **Processo de confirmação de reserva** — hoje é manual pelo admin; precisa decidir se confirma automaticamente após regra X, notifica por WhatsApp/SMS ou permanece manual.
- **Política de no-show e limite de reservas por telefone** — Sprint 6 (Anti-abuso) depende disso.
- **Edição de cardápio pelo cliente** — se vira fase 3/4 ou se termina como responsabilidade do time AntropIA.
