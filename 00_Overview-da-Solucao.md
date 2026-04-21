# Overview da Solução

Documento de entrada para entender **o que a plataforma faz, como ela está construída e por que cada peça existe**. Para detalhes de cronograma e responsáveis, ver `01_Resumo-do-Projeto.md`. Para o histórico de decisões técnicas, ver `04_Decisoes-e-Alinhamentos.md`.

---

## 1. O que a solução é, em uma frase

Uma plataforma web mobile-first que permite aos clientes da **Parrilla 8187** reservar mesa em menos de 30 segundos, conversar com um atendente IA sobre o cardápio (o **Beto**), e dá ao restaurante um painel administrativo para acompanhar e gerenciar todas as reservas em tempo real — tudo em um único endereço: `reservas.parilla8187.antrop-ia.com`.

---

## 2. Os dois fluxos centrais

### 2.1. Fluxo do cliente (público)

```
Cliente abre o site
        ↓
Escolhe quantas pessoas + data + turno (almoço/jantar)
        ↓
Vê os horários disponíveis em tempo real
        ↓
Preenche nome, WhatsApp, ocasião (opcional)
        ↓
Recebe um código de reserva  (ex: #P8187-A3F7)
        ↓
Reserva gravada no banco e visível para o admin
```

Em paralelo, em qualquer ponto do fluxo, o cliente pode tocar no **botão flutuante do Beto** (canto inferior direito) para perguntar sobre cortes de carne, combos, harmonizações ou pedir recomendações. O Beto responde em streaming, com personalidade local ("chapa", "bora", "mano"), e nunca inventa pratos ou preços.

### 2.2. Fluxo do restaurante (admin)

```
Admin acessa /admin/login → entra com email/senha
        ↓
Dashboard: KPIs do dia, próximas reservas, ocupação por turno
        ↓
Aba "Reservas": lista todas com filtros (Hoje/Amanhã/Semana/Todos)
        ↓
Pode buscar por nome, código ou telefone
        ↓
Expande qualquer reserva para ver detalhes completos
        ↓
Ações: Confirmar pendente | Cancelar | Abrir WhatsApp do hóspede
        ↓
Aba "Configurações": dados do tenant, marca, role
```

---

## 3. Arquitetura em alto nível

```
┌─────────────────────────────────────────────────────────────────┐
│                      USUÁRIO (mobile/desktop)                   │
└────────────────────────────┬────────────────────────────────────┘
                             │  HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  TRAEFIK v3.4 (servidor AntropIA — 185.182.184.175)             │
│  • TLS automático via Let's Encrypt                             │
│  • Roteia reservas.parilla8187.antrop-ia.com → container        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  CONTAINER NEXT.JS 16 (Docker Swarm: parrilla-booking_app)      │
│  ┌────────────────────────┐  ┌────────────────────────────────┐ │
│  │ Páginas públicas       │  │ Painel admin (autenticado)     │ │
│  │ • / → /reservar        │  │ • /admin (dashboard)           │ │
│  │ • /reservar (4 telas)  │  │ • /admin/reservas              │ │
│  │ • Botão Beto flutuante │  │ • /admin/configuracoes         │ │
│  └────────────────────────┘  └────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ APIs e Server Actions                                    │   │
│  │ • POST /api/beto/chat        (streaming Groq)            │   │
│  │ • GET  /api/reservar/slots   (disponibilidade)           │   │
│  │ • createReservationAction()  (gravação no banco)         │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────┬──────────────────────────────────────┬───────────────┘
           │                                      │
           ▼                                      ▼
┌──────────────────────────┐         ┌──────────────────────────┐
│  SUPABASE (PostgreSQL)   │         │  GROQ (Llama 3.3-70B)    │
│  • Auth (email/senha)    │         │  • API de inferência IA  │
│  • Tabelas operacionais  │         │  • Streaming de respostas│
│  • RLS por tenant        │         │  • Latência muito baixa  │
└──────────────────────────┘         └──────────────────────────┘
```

**Resumo em palavras:** o navegador do cliente fala com o Traefik (que cuida de HTTPS), o Traefik repassa para o container Next.js, e o Next.js conversa com Supabase (banco + auth) e Groq (IA do Beto). Nada mais.

---

## 4. Componentes, um por um

### 4.1. Frontend Next.js 16 (App Router)

Toda a aplicação — públicas + admin + APIs — vive em um único processo Next.js. Server Components renderizam o HTML inicial no servidor (rápido, SEO-friendly), Client Components ('use client') cuidam das partes interativas (formulários, chat, filtros do admin). Server Actions substituem APIs REST tradicionais para mutações (criar reserva, login, logout).

**Stack visual:** Tailwind CSS 4, fontes Geist Sans/Mono + DM Sans/Mono + Playfair Display, paleta dark amarelo-âmbar (`#F5C042`) para o público, paleta clean neutral para o admin.

### 4.2. Banco de dados Supabase (PostgreSQL)

Sete tabelas operacionais, todas com **Row-Level Security ativa**:

| Tabela | Função |
|---|---|
| `tenants` | Restaurantes cadastrados (hoje: Parrilla 8187, Trattoria Nonna) |
| `establishments` | Unidades de cada tenant (hoje: Boa Viagem) |
| `business_hours` | Horários de funcionamento por dia da semana |
| `reservations` | Reservas criadas (público + admin manual) |
| `slot_blocks` | Bloqueios manuais de horários (eventos, fechamento) |
| `tenant_memberships` | Quais usuários têm acesso a quais tenants e com qual role |
| `auth.users` | Gerenciada pelo Supabase Auth |

**Princípio de segurança crítico (DEC-003):** o `tenant_id` nunca vem do payload do cliente. É sempre resolvido no servidor a partir do slug (público) ou da sessão autenticada (admin). Combinado com RLS, dá defesa em profundidade contra IDOR.

### 4.3. Atendente IA "Beto" (Groq)

Endpoint `/api/beto/chat` em Edge Runtime que:
- Recebe o histórico de mensagens do cliente
- Monta um system prompt com a personalidade do Beto + cardápio completo (~80 itens)
- Chama o modelo `llama-3.3-70b-versatile` no Groq
- Devolve a resposta em streaming (palavra por palavra) para o frontend

A personalidade está em `app/lib/beto/system-prompt.ts` e o cardápio em `app/lib/beto/menu.ts`. O Beto **nunca** inventa preços ou pratos, **nunca** finaliza reservas pelo chat (sempre redireciona para o formulário) e responde em no máximo 3-4 frases.

### 4.4. Autenticação e proteção de rotas

Login do admin via Supabase Auth (`supabase.auth.signInWithPassword()`), sessão guardada em cookies httpOnly. O `middleware.ts` do Next intercepta toda requisição em `/admin/*`, verifica se há sessão válida e redireciona para `/admin/login` se não houver.

Após o login, o `resolveAdminTenantContext()` busca em `tenant_memberships` qual tenant esse usuário gerencia e em qual papel (`owner`, `manager`, `operator`). Esse contexto é usado para personalizar a UI (cor de marca, nome do estabelecimento) e proteger queries.

### 4.5. Infraestrutura

**Docker Swarm + Traefik** no servidor AntropIA. O serviço `parrilla-booking_app` roda como uma réplica (escalável para N), com healthcheck (`wget` em `localhost:3000`), restart automático em caso de falha, rollback automático em deploy ruim, e logs rotacionados (10MB × 3 arquivos).

O Traefik descobre o serviço automaticamente via labels Docker e provisiona o certificado HTTPS do Let's Encrypt sem intervenção. Atualizações são feitas com `docker service update --image parrilla-booking:latest --force` e usam `start-first` (sobe a nova réplica antes de derrubar a antiga, zero downtime).

---

## 5. Modelo de dados — o que é gravado quando uma reserva é criada

```
INSERT INTO reservations (
  tenant_id          ← resolvido server-side a partir do slug
  establishment_id   ← idem
  slot_start         ← ISO timestamp do horário escolhido
  slot_end           ← slot_start + 60min
  guest_name         ← do formulário
  guest_contact      ← WhatsApp do formulário
  status             ← 'confirmed' (público) ou 'pending' (admin manual)
  source             ← 'public' ou 'admin'
  occasion           ← opcional (aniversário, etc)
  notes              ← opcional
)
```

Há um **unique constraint** em `(establishment_id, slot_start)` que protege contra dupla-reserva no mesmo horário. Se duas pessoas tentam reservar o mesmo slot ao mesmo tempo, o segundo recebe erro `23505` (violação de unicidade) e a UI mostra "Esse horário acabou de ser pego, tenta outro".

O **código da reserva** (`#P8187-XXXX`) é derivado dos primeiros 4 caracteres do UUID gerado pelo Postgres — é único por construção, fácil de ditar no telefone, e identifica o restaurante.

---

## 6. Cálculo de disponibilidade — como decidimos que horários mostrar

Para cada combinação de **estabelecimento + data**, o sistema executa 3 queries:

1. **Quais são os horários de funcionamento naquele dia da semana?** (`business_hours`)
2. **Quais slots já têm reserva confirmada nesse dia?** (`reservations` com status `'confirmed'`)
3. **Quais slots foram bloqueados manualmente?** (`slot_blocks`)

Depois, em TypeScript: gera todos os slots possíveis (de hora em hora dentro do horário de funcionamento), remove os ocupados e os bloqueados, retorna o que sobrou.

A API filtra por turno (almoço: 11-16h; jantar: 17-24h) antes de devolver para o frontend.

> **Nota técnica:** essa abordagem (3 queries + cálculo na aplicação) é explicitamente marcada no código como "protótipo". A migração para uma função PL/pgSQL nativa do Postgres está prevista no Sprint 4 do roadmap, e tornará o cálculo atômico, mais rápido e timezone-aware.

---

## 7. Integrações externas

| Serviço | Para quê | Modelo de cobrança |
|---|---|---|
| **Supabase** | Banco PostgreSQL + Auth + RLS | Tier gratuito (até ~50k usuários ativos, ~500MB de banco) |
| **Groq** | Inferência IA do Beto | Pay-per-token, ~$0.59/M tokens de input no Llama 3.3-70B |
| **Let's Encrypt** | Certificado HTTPS | Gratuito, renovação automática pelo Traefik |
| **GoDaddy/registrador DNS** | DNS do antrop-ia.com | Custo do domínio (já existente) |

Não há integração com gateway de pagamento, WhatsApp Business API, sistema de PDV ou CRM nesta fase.

---

## 8. Modelo de segurança em camadas

1. **TLS** em toda comunicação (Traefik + Let's Encrypt)
2. **Cookies de sessão httpOnly** (não acessíveis via JavaScript do cliente)
3. **Middleware** bloqueia rotas `/admin/*` sem sessão válida
4. **RLS no Postgres** garante que mesmo se um cliente conseguir uma chave anon, ele não consegue ler dados de outro tenant
5. **DEC-003**: server resolve `tenant_id` — cliente nunca passa, então não há IDOR
6. **Service role key** só existe em variável de ambiente do container, nunca chega no navegador
7. **NEXT_PUBLIC_***: apenas a URL pública e a anon key do Supabase são embarcadas no bundle do navegador (são públicas por design)

**Lacunas conhecidas (a resolver no Sprint 1 e 6):**
- Endpoints `/api/debug/*` ainda expostos sem autenticação
- Sem rate limiting nas rotas públicas
- Sem captcha no formulário de reserva

---

## 9. O que torna esta solução diferente

- **Mobile-first de verdade:** desenhada e testada para a tela do celular primeiro. Em desktop é responsiva, mas o público real do restaurante vem do celular.
- **Atendente IA com personalidade local:** o Beto não é um chatbot genérico — fala como um atendente da Parrilla, conhece todos os pratos e preços, sugere combos para grupos e harmonizações de bebida. Ajuda o cliente a decidir e empurra para a reserva.
- **Custo operacional próximo de zero:** roda na infraestrutura existente da AntropIA (Docker Swarm + Traefik), Supabase free tier, Groq paga só por token efetivamente consumido. Sem custo fixo mensal de infra para o cliente.
- **Arquitetura multi-tenant pronta:** o banco já suporta múltiplos restaurantes. Quando entrar o segundo cliente, é uma alteração pequena no resolver de tenant do frontend (estimado em 2-3 horas).
- **Stack moderna e mantida:** Next.js 16 + React 19 + Tailwind 4. Versões mais recentes em produção, com suporte de longo prazo.

---

## 10. Onde estamos hoje (19/04/2026)

- ✅ **Frente pública**: 100% funcional, recebe reservas reais
- ✅ **Beto**: 100% funcional, responde com cardápio real
- ✅ **Auth**: 100% funcional, usuário admin provisionado
- ✅ **Painel admin (UI)**: 100% pronto visualmente
- 🟡 **Painel admin (dados)**: 10% — usa dados mockados, será conectado ao banco no Sprint 2
- 🟡 **Segurança**: 70% — falta fechar endpoints de debug e adicionar rate limiting (Sprint 1)
- ✅ **Infraestrutura**: 100% no ar e estável

**Próximo marco:** ao fim do Sprint 1 + Sprint 2 (estimado para 30/04), a plataforma está **operacionalmente pronta** — o restaurante consegue receber reservas e gerenciá-las sem suporte técnico.

---

## 11. Documentos relacionados

- `01_Resumo-do-Projeto.md` — ficha do projeto (cliente, escopo, responsáveis)
- `02_Status-e-Andamento.md` — estado atual e o que está em andamento
- `03_Roadmap-e-Proximos-Passos.md` — fases, entregas e prioridades
- `04_Decisoes-e-Alinhamentos.md` — histórico de decisões técnicas com justificativas
- `~/.claude/plans/twinkly-enchanting-tide.md` — auditoria técnica detalhada (interna)
