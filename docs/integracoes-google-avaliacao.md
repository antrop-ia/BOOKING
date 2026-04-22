# Avaliação de integrações Google — Parrilla 8187

> **Contexto**: sistema em produção, restaurante único em Boa Viagem (Recife), canal principal do cliente é WhatsApp, login com magic link Supabase. Esta é uma avaliação honesta — a meta é dizer **o que vale a pena**, **o que é marketing**, e **o que é perda de tempo** pra esse cenário.

---

## TL;DR — ranking por relação valor/esforço

| # | Integração | Esforço | Impacto no negócio | Criticidade | Fazer? |
|---|---|---|---|---|---|
| 1 | **Google Calendar — botão "Adicionar" pro cliente** | Baixo (2-4h) | Médio — melhora UX pós-reserva | Média | **Sim, já** |
| 2 | **Google Calendar — agenda compartilhada do staff** | Médio (6-8h) | Alto — staff vê reservas do celular | Alta | **Sim** |
| 3 | **Google Maps — embed + rota** | Baixo (2h) | Médio — reduz fricção pré-reserva | Alta | **Sim** |
| 4 | **Google Business Profile — sync de horários** | Médio (4-6h) | Alto — evita horário errado no Google | Alta | **Sim** |
| 5 | **Reserva pelo Google (RWG)** | Muito alto (20-40h + aprovação) | Altíssimo — tráfego direto | Alta | **Sim, mas fase 2** |
| 6 | **GA4 + funil de conversão** | Baixo (3h) | Alto — dado pra decidir | Alta | **Sim** |
| 7 | **Google Business — posts automáticos** | Alto (10h+) | Médio | Baixa | Talvez |
| 8 | **Google Sign-In (OAuth)** | Baixo (3h) | Baixo — magic link já cobre | Baixa | Opcional |
| 9 | **Gmail SMTP relay** | Baixo (1-2h) | Baixo — Supabase já envia | Baixa | Só se vier problema |
| 10 | **Google Pay** | Altíssimo (30-50h) | Médio — pré-pagamento premium | Baixa | Não agora |

**Prioridade recomendada**: 3 → 4 → 1 → 2 → 6 (o "starter kit Google" em 1-2 sprints). RWG (#5) é a próxima fronteira depois que o volume estabilizar.

---

## 1. Google Calendar — botão "Adicionar à agenda" pro cliente

**Hoje**: temos `.ics` (arquivo baixado) em `/minhas-reservas/[codigo]`. Funciona em iOS, Outlook, Android — mas o usuário precisa baixar, abrir, importar.

**Proposta**: botão adicional "Adicionar ao Google Calendar" que abre `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Parrilla%208187&dates=...` — zero backend, 1 click.

**Pros**
- 5 linhas de código, sem API key, sem OAuth
- Mobile-first: no Android abre app nativo direto
- Complementa `.ics` (não substitui — Outlook/Apple Calendar continuam com ICS)

**Cons**
- Só resolve para quem usa Gmail/Google Calendar (mas no Brasil isso é ~70% dos smartphones Android)
- Não mantém sync: se a reserva for cancelada, o evento do Google não some sozinho

**Criticidade**: Média. É UX polish. Não destrava negócio, mas é quick win.

**Dependências**: nenhuma. Self-contained.

---

## 2. Google Calendar — agenda compartilhada do staff (service account)

**Hoje**: staff vê reservas em `/admin/reservas`. Funciona, mas não aparece no celular junto com os outros compromissos do dia.

**Proposta**: criar um calendário "Reservas Parrilla 8187" no Google Workspace, cada reserva vira um evento nesse calendário via service account. Staff adiciona o calendário no Gmail/celular e vê as reservas junto com o resto da agenda.

**Pros**
- Reservas chegam **em tempo real** no celular do gestor sem precisar abrir o admin
- Compartilhamento granular (gestor vê tudo, salonero só do turno, etc)
- Cancelamento/atualização propaga automaticamente se for bidirecional
- Integração com lembretes nativos (notificação 30 min antes)
- Complementa o Sprint 9 (WhatsApp é alerta, Calendar é visão diária)

**Cons**
- Requer conta Google Workspace do restaurante **ou** uma conta Gmail dedicada + service account (~R$30/mês se Workspace)
- Service account + impersonation é config não-trivial (1-2h de setup inicial)
- Se sincronia quebra silenciosamente, cria confusão pior que não ter

**Criticidade**: Alta. Substitui parcialmente a necessidade de staff checar o admin constantemente.

**Dependências**: Sprint 9 ideal antes (WhatsApp pra alert, Calendar pra contexto).

---

## 3. Google Maps — embed + link de direções

**Hoje**: rodapé diz "Boa Viagem, Recife". Sem mapa, sem endereço completo, sem rota.

**Proposta**:
- `ConfirmacaoScreen` e `/minhas-reservas/[codigo]` ganham card com:
  - Mapa estático embed (Maps Static API, 1 chamada por render)
  - Botão "Como chegar" → `https://www.google.com/maps/dir/?api=1&destination=...`
- Opcional: Place ID dinâmico pra puxar foto/nota do restaurante

**Pros**
- Reduz fricção: "onde fica exatamente?" vira 1 click
- Muda a percepção de qualidade (de "site genérico" pra "parece app")
- Maps Static é **barato**: ~$2 por 1000 carregamentos, US$ 200 de crédito mensal grátis no Google Cloud → cabe folgado em milhares de reservas/mês

**Cons**
- Maps Static tem assinatura de URL (HMAC SHA-1) — precisa guardar secret no server
- Precisa cartão de crédito no Google Cloud Console pra ativar (mesmo dentro do free tier)
- Cache agressivo é obrigatório (não gerar URL nova a cada visita da mesma reserva)

**Criticidade**: Alta. É uma expectativa básica de qualquer app de comer/reservar hoje.

**Dependências**: nenhuma.

---

## 4. Google Business Profile — sync de horários + reviews

**Hoje**: horários e bloqueios editáveis no admin (Sprint 5). Mas o "Google Meu Negócio" tem **outra cópia** dos mesmos dados — se o cliente fechar numa segunda, precisa lembrar de editar em 2 lugares.

**Proposta**:
- API do Google Business Profile (Business Information API) pra puxar/empurrar horários
- Quando admin edita horários ou cria `slot_block` com dia inteiro → atualiza Google Meu Negócio automaticamente
- Opcional: notificação no admin quando chega review nova (Reviews API)

**Pros**
- **Alto ROI**: cliente Google vê horário certo → menos "fui e tava fechado" → menos review ruim
- Horário no Maps/Search é o dado mais alto-impacto pra restaurante
- Protege contra divergência humana entre os 2 sistemas

**Cons**
- Business Profile API exige **aprovação** do Google (pedido via formulário; "can take weeks"), é a barreira real
- OAuth com scope `business.manage` — só o dono/admin do GMB pode autorizar
- Se o GMB tiver dados divergentes (comum em restaurantes que mudaram horário várias vezes), precisa um reconciliation primeiro

**Criticidade**: Alta. Mas a aprovação do Google é o gargalo — começar o pedido cedo.

**Dependências**: conta GMB verificada (presumindo que existe).

---

## 5. Reserva pelo Google (RWG / "Reserve with Google")

**Hoje**: cliente acha a Parrilla no Google → vê telefone → liga, ou → site "Site" aparece e entra em `/reservar`.

**Proposta**: cliente pesquisa "parrilla 8187" no Google → aparece botão **"Reservar mesa"** nativo no card → modal Google com data/hora/pessoas → confirma **sem sair do Google** → nosso backend recebe via callback.

**Pros**
- **Maior alavanca de aquisição** que existe pra restaurante no Google. Literalmente dobra conversão em cases conhecidos.
- UX é Google-nativa — zero fricção, funciona no celular/voice/Android Auto
- Reduz dependência do "cliente ter o link direto do site"

**Cons**
- **Processo de onboarding pesadíssimo**:
  - RWG não é self-service. Google só aprova via parceiro certificado (OpenTable, Zenchef, SevenRooms...) **ou** via Direct Integration
  - Direct requires implementing [Actions Center API](https://developers.google.com/actions-center) — schema de booking/availability/cancellation em JSON, webhook bidirecional, certificação, SLA de uptime
  - Volume mínimo recomendado: ~100 reservas/mês (pra Google aceitar bancar a integração)
- **Tempo de aprovação**: 3-6 meses em média
- **Compliance**: SLA em torno de latência (<500ms pra availability), uptime, handling de cancelamento, terms obrigatórios
- **Custo**: zero pro Google, mas carga de dev grande

**Criticidade**: Alta pro crescimento, baixa pra demanda atual. Faz sentido só quando os números de 5-6 meses de operação mostrarem volume sustentado.

**Dependências**: volume + aprovação Google. Evitar agora.

**Alternativa intermediária**: **Booking link no GMB** (menor ambição). Dentro do Business Profile, o dono pode adicionar um "Booking link" que aparece como botão no card. Isso é instantâneo, não precisa de Actions Center. Resolve 30-40% do valor do RWG com 1% do esforço.

---

## 6. Google Analytics 4 + Tag Manager — funil de conversão

**Hoje**: não medimos **onde o usuário desiste** no fluxo de 4 telas. Chutamos.

**Proposta**: GA4 + GTM no fluxo público, eventos:
- `reserva_iniciada` (abriu `/reservar`)
- `data_selecionada`
- `horario_selecionado`
- `espaco_selecionado`
- `dados_preenchidos`
- `captcha_passou`
- `reserva_confirmada`

Consulta no GA4 → funil visual → sabemos se o captcha derruba gente, se o step de espaço adiciona fricção, etc.

**Pros**
- **Dado real pra iterar UI**: "30% desiste na tela de espaço" é acionável
- Free tier cobre o volume de qualquer restaurante individual
- Integração com Google Ads depois (se o cliente quiser anúncios)

**Cons**
- LGPD: precisa banner de consentimento (pode usar algo tipo Cookiebot ou caseiro)
- Dado flutua — precisa volume suficiente pra conclusões sérias (~200 sessões/semana)
- Se não olha nunca, é peso morto

**Criticidade**: Alta — mas só se **alguém vai olhar os dados** toda semana. Sem leitura regular é "compliance teatro".

**Dependências**: decisão de privacidade + compromisso do time AntropIA ou cliente em olhar os relatórios.

---

## 7. Google Business — posts automáticos

**Ideia**: admin apertar um botão "Publicar cardápio da semana" no `/admin/configuracoes` e isso vira post no GMB.

**Pros**: cliente vê novidade, SEO local marginal, dá sensação de atividade.

**Cons**: baixa retenção humana (quem faz post toda semana?), low-impact comparado com o resto, exige API approval igual #4.

**Criticidade**: Baixa. Vira "cool demo", dificilmente usado depois.

**Recomendação**: ignorar até o cliente pedir explicitamente.

---

## 8. Google Sign-In (OAuth) pro cliente final

**Hoje**: magic link Supabase funciona (Sprint 8). Usuário clica "Entrar" → digita email → clica link no email.

**Proposta**: botão adicional "Continuar com Google" → OAuth flow → sessão criada.

**Pros**: 1-click login, sem checkout de email, sem erro de digitação.

**Cons**: adiciona **mais um caminho** de login (e de bug), mais um Google Cloud project, mais UI. Para um restaurante único, a diferença marginal de conversão não justifica a complexidade adicional.

**Criticidade**: Baixa. Magic link já cobre o caso.

**Recomendação**: Não agora. Reavaliar se múltiplos tenants entrarem (onboarding mais volume, quer UX premium).

---

## 9. Gmail SMTP relay (sender transacional)

**Hoje**: Supabase envia o magic link pelo smtp padrão dele (`noreply@mail.supabase.io` ou similar), visual customizado pelo template HTML aplicado em Sprint 8.

**Proposta**: usar conta Google Workspace da Parrilla pra enviar magic link via Gmail SMTP — email vira "Parrilla 8187 `<reservas@parilla8187.com.br>`".

**Pros**: branding consistente, menos chance de ir pra spam.

**Cons**: complexidade desproporcional (config SMTP no Supabase, app password, manutenção). Só vale se começar a ter problema de deliverability.

**Criticidade**: Baixa até aparecer problema real.

---

## 10. Google Pay

**Ideia**: aceitar pré-pagamento/taxa de reserva pra horários de pico.

**Pros**: reduz no-show, agrega receita antes do evento.

**Cons**: enorme superfície (PSP, compliance, reembolso, disputas), muda a natureza do produto. Fora do DNA "mobile-first, zero fricção".

**Criticidade**: Baixa. Só faz sentido com **regra de negócio específica** do cliente (ex: festa fim de ano, eventos privados).

---

## Matriz de decisão visual

```
Alto valor   │  (2) Staff Calendar  │  (4) GMB sync
             │  (3) Maps embed      │  (5) RWG [longo prazo]
             │  (6) GA4 funil       │
             │                      │
             │                      │
Médio valor  │  (1) Google Calendar │  (7) GMB posts
             │      pro cliente     │  (10) Google Pay
             │  (9) Gmail SMTP      │
             │                      │
             │                      │
Baixo valor  │  (8) Google Sign-In  │
             │                      │
             │                      │
             └──────────────────────┴────────────────────
                  Baixo esforço        Alto esforço
```

---

## Sprints propostos (se o cliente aprovar)

### Sprint 10 — "Starter kit Google" (~12-15h)
Ordem de implementação sugerida:

1. **Google Maps embed + rota** (2h) — ganho visual imediato
2. **Google Calendar button pro cliente** (2h) — complementa `.ics`
3. **GA4 + GTM + funil** (3h) — começa a coletar dado logo
4. **Booking link no GMB** (manual, 30min de config) — ganho de conversão sem dev
5. **Staff Calendar via service account** (6-8h) — substitui parcialmente a necessidade de abrir `/admin/reservas`

### Sprint 11 — "GMB API + reviews" (~6-8h)
Só depois do pedido de aprovação da Business Profile API ser feito (começar cedo, leva semanas):

1. Sync bidirecional de horários `business_hours` ↔ GMB
2. Sync de bloqueios dia-inteiro ↔ "Fechado nesse dia" no GMB
3. (Opcional) Lista de reviews recentes no dashboard admin

### Sprint 12+ — "Reserve with Google" (~25-40h)
Só quando:
- Volume mensal estável > ~100 reservas/mês
- Cliente topou compromisso de SLA (uptime alto, latência <500ms)
- Tiver orçamento de tempo pra certificação Google

---

## Decisões que precisam do cliente

Antes de mexer em qualquer uma dessas, precisa saber:

1. **Conta Google Workspace da Parrilla existe?** (necessário pra #2 staff calendar, #9 SMTP)
2. **Quem é admin do Google Meu Negócio?** (necessário pra #4, #5, #7)
3. **Tem cartão de crédito na conta Google Cloud?** (necessário pra ativar APIs, mesmo em free tier)
4. **Aceita banner de consentimento LGPD** no site? (necessário pra GA4 sério)
5. **Vai alguém olhar os dados de GA4** semanalmente? (sem isso, não vale)

---

## Riscos transversais

- **Dependência do ecossistema Google**: todas essas integrações pressupõem que o restaurante *vive* no Google (GMB, Workspace). Se algum dia migrarem pra Apple Business Connect ou outro, é retrabalho.
- **Custos esgotando free tier**: Maps Static é barato mas existe. Monitorar uso via Google Cloud budget alert (setar R$50/mês já avisa).
- **Rate limits**: APIs do Google têm cotas. Cache agressivo é padrão, não opcional.
- **Retirada de feature pelo Google**: Google Business Profile API já foi reescrita múltiplas vezes (última mudança deprecou "My Business API v4"). Sempre monitorar.

---

## Conclusão

O "kit Google" básico (#1, #2, #3, #6) tem **ROI claro** e cabe em 1-2 sprints. Faz a diferença entre um sistema de reservas genérico e um que parece "produto de verdade".

Os itens ambiciosos (#4 GMB API, #5 RWG) exigem **pedido formal de aprovação** que leva semanas — começar o processo cedo vale a pena mesmo que a implementação seja depois.

Os itens opcionais (#7, #8, #9, #10) ficam no backlog aguardando sinal do cliente — não têm ROI claro sem contexto adicional.

**Recomendação final**: começar pelo Sprint 10 (Starter Kit) em paralelo ao Sprint 9 (WhatsApp). Os dois se complementam — Evolution API pra push real-time do staff, Google Calendar pra contexto ao longo do dia.
