# Feature: Área do Cliente Final

Planejamento completo da feature de login e área do cliente para o Parrilla 8187. Documento para popular o Plane (novo **module** + novo **cycle**).

**Data:** 21/04/2026
**Responsável:** AntropIA
**Escopo estimado:** ~14 horas de desenvolvimento distribuídas em 10 issues

---

## Decisões arquiteturais

### 1. Método de autenticação: **Magic link via email**

Depois de avaliar 4 modelos, escolhemos **magic link** como padrão da primeira versão:

| Modelo | Por que NÃO no V1 |
|---|---|
| Email + senha tradicional | Pior UX (cliente precisa lembrar senha) |
| OTP via WhatsApp | Depende de API paga (Twilio/Evolution) — adia entrega e adiciona custo mensal |
| Consulta por código | Não permite histórico entre dispositivos |

**Por que magic link:**
- Supabase Auth já tem pronto (mesmo padrão do admin — coerência)
- Zero senha para o cliente lembrar
- Funciona entre dispositivos (cliente loga no celular, depois no desktop do trabalho)
- Sem dependência externa nova (zero custo mensal adicional)
- Migração futura para OTP/WhatsApp é aditiva (não quebra nada)

### 2. Reserva permanece **anônima por padrão**

- `/reservar` segue funcionando sem login (conversão > atrito)
- Login é **opt-in**: cliente só cria conta se quiser histórico e gerenciamento
- Quem reserva logado tem `user_id` preenchido automaticamente
- Quem reserva anônimo pode **resgatar a reserva depois** com código + WhatsApp

### 3. Tema visual: **coerente com o fluxo público da Parrilla**

- Tema dark (`#0A0906` / `#F5C042`) — diferente do admin (neutral)
- Fontes DM Sans / DM Mono / Playfair Display
- Mesma linguagem visual do `/reservar` (pills, cards, transições)
- Botão "Entrar" discreto no canto superior direito das telas públicas

### 4. Schema: **nullable com retrocompatibilidade total**

- Coluna `user_id` em `reservations` como nullable
- RLS atualizado para o cliente ver SÓ as próprias reservas (match por `user_id`)
- Reservas existentes sem `user_id` continuam visíveis via "resgatar por código"

---

## Estrutura do módulo no Plane

**Novo Module:** `Área do Cliente`
Cor sugerida: **Pink** (diferencia dos 7 existentes)

**Novo Cycle:** `Sprint 8 - Área do Cliente` (02/05 → 09/05 2026)

---

## Issues (ordem de implementação)

### I-01 · Schema: user_id em reservations + RLS cliente

**Status:** Todo
**Priority:** Urgent (P0)
**Labels:** `priority:p0`, `type:debt`, `area:infra`
**Estimate:** 1h

**Description:**
Adiciona a coluna `user_id` em `reservations` como nullable, com FK para `auth.users(id)`. Atualiza RLS para permitir SELECT de reservas onde `user_id = auth.uid()`, mantendo admin continua lendo tudo via service role.

**Critérios de aceite:**
- [ ] Migration `supabase/migrations/YYYYMMDD_reservations_user_id.sql`
- [ ] Coluna `user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL`
- [ ] Index em `(user_id)` (parcial `WHERE user_id IS NOT NULL`)
- [ ] Nova RLS policy `"users see own reservations"` permitindo SELECT quando `user_id = auth.uid()`
- [ ] RLS antiga de admin (via membership) preservada
- [ ] Migration idempotente (`IF NOT EXISTS`)
- [ ] Documentado em `docs/runbook.md` como impacto no restore

**Notas técnicas:**
- Reservas antigas ficam com `user_id = null` (esperado)
- `ON DELETE SET NULL`: apagar usuário não apaga histórico da reserva

---

### I-02 · Autenticação: páginas de login + callback magic link

**Status:** Todo
**Priority:** Urgent (P0)
**Labels:** `priority:p0`, `type:feature`, `area:public`
**Estimate:** 3h

**Description:**
Cria `/entrar` (tela de solicitar magic link) e `/entrar/callback` (recebe token do Supabase). Server actions para disparar email via `supabase.auth.signInWithOtp()`. Mantém o tema Parrilla dark.

**Critérios de aceite:**
- [ ] `/entrar` com input de email, validação visual, botão "Receber link"
- [ ] Feedback após submit: "Enviamos um link para SEU_EMAIL. Clique em até 1 hora."
- [ ] Server action `requestLoginLink(email)` com rate limit (3/min por IP)
- [ ] `/entrar/callback` consome o token do Supabase e redireciona para `/minhas-reservas`
- [ ] Mensagens de erro amigáveis (link expirado, email inválido)
- [ ] Rodapé com link "Voltar para /reservar"
- [ ] Tema dark Parrilla consistente com `/reservar`

**Notas técnicas:**
- Usar `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: '/entrar/callback' } })`
- O callback valida `?code=` via `supabase.auth.exchangeCodeForSession()`
- Reaproveitar `@/app/lib/rate-limit` já existente

---

### I-03 · Middleware: proteção de `/minhas-reservas/*`

**Status:** Todo
**Priority:** Urgent (P0)
**Labels:** `priority:p0`, `type:security`, `area:public`
**Estimate:** 30min

**Description:**
Estende `middleware.ts` para redirecionar `/minhas-reservas/*` para `/entrar` quando não há sessão Supabase Auth. Mantém rotas do admin intactas (`/admin/*` continua exigindo membership).

**Critérios de aceite:**
- [ ] Matcher inclui `/minhas-reservas/:path*`
- [ ] Redirect para `/entrar?redirect=/minhas-reservas` se sem sessão
- [ ] Após login, callback respeita `?redirect=` query param
- [ ] `/entrar` e `/entrar/callback` NÃO exigem sessão (obviamente)

---

### I-04 · Página "Minhas reservas" (listagem)

**Status:** Todo
**Priority:** High (P1)
**Labels:** `priority:p1`, `type:feature`, `area:public`
**Estimate:** 3h

**Description:**
`/minhas-reservas` lista as reservas do usuário logado agrupadas em **Próximas** e **Histórico**. Cada card mostra data, hora, espaço (com ícone), pessoas, status e código. Design mobile-first coerente com `/reservar`.

**Critérios de aceite:**
- [ ] Server component carrega reservas onde `user_id = auth.uid()`
- [ ] Agrupamento automático: "Próximas" (`slot_start >= now() AND status != cancelled`) e "Histórico"
- [ ] Ordenação: próximas ASC, histórico DESC
- [ ] Card por reserva com: data formatada, hora, emoji do espaço + nome, pessoas, código, badge de status
- [ ] Empty state se não tiver reservas: "Você ainda não fez nenhuma reserva. Reservar agora →"
- [ ] Botão "Resgatar reserva existente" leva a I-07
- [ ] Tema dark Parrilla, cards com borda amarela na próxima reserva mais próxima (destaque)
- [ ] Menu no topo: nome do usuário + "Sair"

**Notas técnicas:**
- Reaproveitar `app/lib/reservations.ts` para parser do contato
- Reaproveitar `app/lib/date.ts` para timezone e formatação
- Query com JOIN para `establishment_spaces` (ícone + nome)

---

### I-05 · Detalhe da reserva + cancelamento

**Status:** Todo
**Priority:** High (P1)
**Labels:** `priority:p1`, `type:feature`, `area:public`
**Estimate:** 2h

**Description:**
`/minhas-reservas/[codigo]` mostra todos os dados da reserva e permite cancelar, baixar `.ics` e abrir WhatsApp do restaurante.

**Critérios de aceite:**
- [ ] Rota com param `[codigo]` (não o uuid, usa o `#P8187-XXXX`)
- [ ] Valida que a reserva pertence ao usuário logado (senão 404 silencioso)
- [ ] Mostra: data, hora, espaço, pessoas, ocasião, observações, status, criado em
- [ ] Botão "Cancelar reserva" (confirmação + server action)
- [ ] Botão "Adicionar ao calendário" baixa arquivo `.ics`
- [ ] Botão "Falar com o restaurante" abre WhatsApp da Parrilla
- [ ] Após cancelar: UI atualiza, status vira "Cancelada", botões de ação somem

**Notas técnicas:**
- Server action `cancelOwnReservation(reservationId)` valida `user_id = auth.uid()` antes de fazer update
- `.ics` gerado server-side com timezone correto (reusar `app/lib/date.ts`)

---

### I-06 · Vincular nova reserva ao usuário logado

**Status:** Todo
**Priority:** Medium (P2)
**Labels:** `priority:p2`, `type:feature`, `area:public`
**Estimate:** 30min

**Description:**
Quando o cliente está logado e cria uma reserva em `/reservar`, a `createReservationAction` detecta a sessão e preenche `user_id` automaticamente.

**Critérios de aceite:**
- [ ] `createReservationAction` tenta ler `supabase.auth.getUser()`
- [ ] Se logado, passa `userId` para `createReservation` lib
- [ ] `createReservation` grava `user_id` no insert
- [ ] Fluxo anônimo continua funcionando (sem break)

---

### I-07 · Resgatar reserva feita antes do cadastro

**Status:** Todo
**Priority:** Medium (P2)
**Labels:** `priority:p2`, `type:feature`, `area:public`
**Estimate:** 1h

**Description:**
Form em "Minhas reservas" que permite o cliente associar a conta a uma reserva antiga feita anonimamente. Usuário fornece código + WhatsApp; server confere e seta `user_id = auth.uid()`.

**Critérios de aceite:**
- [ ] Botão "+ Adicionar reserva existente" em `/minhas-reservas`
- [ ] Modal/inline form com código + WhatsApp
- [ ] Server action: busca reserva por id (prefixo do uuid a partir do código), valida que `guest_contact` normalizado bate com o WhatsApp digitado
- [ ] Seta `user_id = auth.uid()` se bater; retorna erro amigável se não
- [ ] Uma reserva só pode ser resgatada uma vez (se já tem `user_id`, erro)

**Notas técnicas:**
- Reutilizar `sanitizeWhatsappDigits` e `normalizeWhatsapp`
- Rate limit 5 tentativas/min por usuário logado (previne brute force de códigos)

---

### I-08 · Header navegacional com login/logout

**Status:** Todo
**Priority:** High (P1)
**Labels:** `priority:p1`, `type:feature`, `area:public`
**Estimate:** 2h

**Description:**
Header discreto nas telas públicas (`/`, `/reservar`, `/minhas-reservas`) com CTA contextual: "Entrar" se não logado, menu com nome + "Minhas reservas" + "Sair" se logado.

**Critérios de aceite:**
- [ ] Componente `PublicHeader.tsx` server component
- [ ] Logo pequeno da Parrilla à esquerda (usa `brand_color` e `logo_url` do tenant)
- [ ] Se não logado: botão "Entrar" à direita
- [ ] Se logado: avatar (iniciais do email) com dropdown "Minhas reservas" + "Sair"
- [ ] Mobile: menu hambúrguer com mesmas opções
- [ ] Integrado no layout raiz de rotas públicas (sem duplicar em cada page)
- [ ] Tema dark Parrilla consistente

---

### I-09 · Email template customizado

**Status:** Todo
**Priority:** Low (P3)
**Labels:** `priority:p3`, `type:feature`, `area:public`
**Estimate:** 30min

**Description:**
Personaliza o template de magic link no Supabase Auth para refletir a identidade Parrilla (tema dark, logo, assunto em PT-BR, tom coloquial).

**Critérios de aceite:**
- [ ] Template "Magic Link" editado no Supabase Dashboard → Authentication → Templates
- [ ] Assunto: "Seu acesso à Parrilla 8187 está pronto"
- [ ] Corpo com logo SVG embarcado, tema dark, botão amarelo
- [ ] Assinatura "Equipe Parrilla 8187"
- [ ] Link "Se não foi você, ignore este email"
- [ ] Documentado em `docs/runbook.md` (onde editar, como testar)

---

### I-10 · CTA "Salvar reserva na minha conta" após confirmação

**Status:** Todo
**Priority:** Medium (P2)
**Labels:** `priority:p2`, `type:feature`, `area:public`
**Estimate:** 1h

**Description:**
Após reserva confirmada em `/reservar`, mostra CTA discreto na `ConfirmacaoScreen` para o cliente criar conta e já vincular a reserva. Email é pré-preenchido com o que foi digitado em "Dados".

**Critérios de aceite:**
- [ ] Novo card abaixo do código da reserva: "Quer acompanhar essa reserva depois?"
- [ ] Botão "Criar acesso rápido" leva a `/entrar?email=...&resgatar=CODIGO`
- [ ] A tela de entrar pré-preenche o email
- [ ] Após login, automaticamente seta `user_id` na reserva do código passado
- [ ] Card tem estilo sutil (não competir com "Nova reserva")

---

## Ordem e dependências

```
I-01 (schema)     ────────┐
                          ├─> I-02 (auth pages)  ──> I-03 (middleware)
I-09 (email template)────┘                              │
                                                        v
                                          I-04 (minhas reservas) ──> I-05 (detalhe)
                                                        │
                                                        ├─> I-06 (vincular reserva nova)
                                                        │
                                                        └─> I-07 (resgatar antiga)

I-08 (header) ────── pode ser paralelo com I-02/I-04
I-10 (CTA confirmação) ────── depende de I-02
```

**Caminho crítico:** I-01 → I-02 → I-03 → I-04 → I-05 (= ~10h)

---

## CSV pronto para import no Plane

Salvar como `plane-import-login.csv` e importar via **Workspace settings → Imports → CSV**.

```csv
Name,Description,State,Priority,Labels,Start Date,Target Date,Estimate,Module,Cycle
"Schema: user_id em reservations + RLS cliente","Migration adicionando user_id nullable em reservations com FK auth.users e ON DELETE SET NULL. Index parcial. Nova RLS policy permitindo SELECT quando user_id = auth.uid(). Idempotente.",Todo,Urgent,"priority:p0,type:debt,area:infra",2026-05-02,2026-05-02,1,Área do Cliente,Sprint 8 - Área do Cliente
"Autenticação: páginas de login + callback magic link","/entrar com input de email + server action requestLoginLink. /entrar/callback consome token Supabase e redireciona. Rate limit 3/min por IP. Mensagens de erro amigáveis. Tema dark Parrilla.",Todo,Urgent,"priority:p0,type:feature,area:public",2026-05-02,2026-05-03,3,Área do Cliente,Sprint 8 - Área do Cliente
"Middleware: proteção de /minhas-reservas","Estende middleware.ts para redirect /minhas-reservas/* → /entrar quando sem sessão. Respeita ?redirect= no callback. /entrar e /entrar/callback permanecem públicos.",Todo,Urgent,"priority:p0,type:security,area:public",2026-05-03,2026-05-03,0.5,Área do Cliente,Sprint 8 - Área do Cliente
"Página 'Minhas reservas' (listagem)","/minhas-reservas lista reservas do usuário logado agrupadas em Próximas e Histórico. Cards com data, hora, espaço (emoji + nome), pessoas, código e status. Próxima reserva em destaque (borda amarela). Empty state amigável. Tema dark Parrilla.",Todo,High,"priority:p1,type:feature,area:public",2026-05-04,2026-05-06,3,Área do Cliente,Sprint 8 - Área do Cliente
"Detalhe da reserva + cancelamento","/minhas-reservas/[codigo] mostra todos os dados. Botões: cancelar (server action valida user_id), adicionar ao calendário (.ics com timezone), WhatsApp do restaurante. UI atualiza após cancelar.",Todo,High,"priority:p1,type:feature,area:public",2026-05-06,2026-05-07,2,Área do Cliente,Sprint 8 - Área do Cliente
"Vincular nova reserva ao usuário logado","createReservationAction lê supabase.auth.getUser(). Se logado, passa userId para createReservation; lib grava user_id no insert. Fluxo anônimo continua funcionando.",Todo,Medium,"priority:p2,type:feature,area:public",2026-05-07,2026-05-07,0.5,Área do Cliente,Sprint 8 - Área do Cliente
"Resgatar reserva feita antes do cadastro","Form em /minhas-reservas (código + WhatsApp) para associar conta a reserva antiga. Server action valida o par, seta user_id. Rate limit 5 tentativas/min. Reserva só pode ser resgatada 1 vez.",Todo,Medium,"priority:p2,type:feature,area:public",2026-05-07,2026-05-08,1,Área do Cliente,Sprint 8 - Área do Cliente
"Header navegacional com login/logout","PublicHeader.tsx server component. Logo da Parrilla à esquerda. Botão 'Entrar' se não logado; avatar + dropdown (Minhas reservas + Sair) se logado. Mobile com hambúrguer. Aplica em /, /reservar, /minhas-reservas.",Todo,High,"priority:p1,type:feature,area:public",2026-05-05,2026-05-06,2,Área do Cliente,Sprint 8 - Área do Cliente
"Email template customizado (magic link)","Personaliza template Magic Link no Supabase Dashboard. Tema dark com logo SVG, botão amarelo, assinatura 'Equipe Parrilla 8187', link 'se não foi você ignore'. Documentar onde editar no runbook.",Todo,Low,"priority:p3,type:feature,area:public",2026-05-08,2026-05-08,0.5,Área do Cliente,Sprint 8 - Área do Cliente
"CTA 'Salvar reserva na minha conta' após confirmação","Novo card em ConfirmacaoScreen após código. Botão 'Criar acesso rápido' leva a /entrar?email=X&resgatar=CODIGO. Após login, automaticamente vincula reserva.",Todo,Medium,"priority:p2,type:feature,area:public",2026-05-08,2026-05-09,1,Área do Cliente,Sprint 8 - Área do Cliente
```

---

## Estimativa total e distribuição

| Tipo | Quantidade | Horas |
|---|---|---|
| P0 (bloqueante) | 3 issues | 4.5h |
| P1 (importante) | 3 issues | 7h |
| P2 (médio) | 3 issues | 2.5h |
| P3 (baixo) | 1 issue | 0.5h |
| **Total** | **10 issues** | **~14.5h** |

**Caminho crítico (MVP utilizável):** I-01 + I-02 + I-03 + I-04 + I-05 = ~10h

Isso entrega **login + lista de reservas + detalhe/cancelar**. As outras (I-06, 07, 08, 09, 10) são melhorias de UX que podem vir depois.

---

## Antes de começar — checklist

- [ ] Criar module "Área do Cliente" no Plane (cor Pink)
- [ ] Criar cycle "Sprint 8 - Área do Cliente" (02/05 → 09/05)
- [ ] Importar `plane-import-login.csv` (vai criar as 10 issues)
- [ ] Confirmar com o cliente que o email usado no magic link é o mesmo que ele vê no WhatsApp
- [ ] Decidir se a feature entra antes ou depois do go-live público oficial
