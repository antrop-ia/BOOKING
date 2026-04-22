# Status e Andamento

Painel textual de acompanhamento do projeto. Deve ser atualizado semanalmente e permitir leitura rápida do estado atual por sócios, equipe e parceiros.

---

## Nome do cliente

Parrilla 8187 — Bar e Churrascaria

## Nome do projeto

Plataforma de Reservas Online + Atendente IA "Beto"

## Status geral

**Demo-ready · Produto em produção**

_Todos os fluxos críticos estão no ar e operacionais: fluxo público de reserva com captcha, Atendente Beto com histórico persistente e rate limiting, painel administrativo com CRUD real de reservas + edição de configurações/horários/bloqueios, backup diário automatizado. Há 1 reserva de teste (Rafael Cavalcanti, 25/04 15:00) e 2 conversas do Beto no banco — aceitáveis como prova de funcionamento durante a demo, removíveis em 1 comando se preferirem demo zerado._

## Etapa atual

**Pronto para apresentação ao cliente · validações finais pré-demo**

## Resumo rápido

A plataforma está em produção em `https://reservas.parilla8187.antrop-ia.com`, com HTTPS válido, domínio dedicado e stack em Docker Swarm com rollback testado. O fluxo público de reserva funciona ponta-a-ponta no celular (4 telas mobile-first com captcha Turnstile, limite de 3 reservas por WhatsApp e validação robusta de número). O Beto responde com streaming via Groq, retoma conversa pelo cookie de sessão e está rate-limited em 30 msg/hora. O painel admin está 100% conectado ao banco real (CRUD de reservas + botão WhatsApp + edição de identidade de marca + gestão de horários e bloqueios). Backup diário às 03:30 em `/var/backups/parrilla-booking/` com rotação 30 dias. Uptime Kuma publicado em `uptime.parilla8187.antrop-ia.com` aguardando configuração do monitor + canal de notificação (5 min). Credenciais do admin rotacionadas para senha aleatória guardada no cofre do cliente.

## O que já foi feito

- ✅ **Infraestrutura**: deploy em Docker Swarm + Traefik + HTTPS automático + healthcheck + rollback documentado
- ✅ **Domínio**: `reservas.parilla8187.antrop-ia.com` em produção
- ✅ **Fluxo público de reserva**: 4 telas mobile-first com gravação real, código `#P8187-XXXX`, conflict detection
- ✅ **Captcha** (Sprint 6): Cloudflare Turnstile no `DadosScreen`, token validado server-side antes de qualquer query
- ✅ **Validação de WhatsApp** (Sprint 6): `normalizeWhatsapp` com 10–13 dígitos + prefixo 55 implícito
- ✅ **Limite anti-abuso** (Sprint 6): máx. 3 reservas futuras ativas por número; admin bypassa o limite
- ✅ **Audit log** (Sprint 6): tabela `audit_log` com eventos `reservation_rejected_over_limit`, `reservation_rejected_invalid_phone`, `rate_limit_*`, `reservation_created` — 35 reqs → 5 bloqueios já registrados no banco
- ✅ **API de disponibilidade**: `/api/reservar/slots` com cálculo a partir de `business_hours` + `reservations` + `slot_blocks`
- ✅ **Atendente Beto** (Sprint 3): integração Groq (Llama 3.3-70B) com streaming, system prompt com personalidade local, cardápio completo (~80 itens)
- ✅ **Persistência do Beto** (Sprint 3): tabela `beto_conversations`, retomada via cookie `beto_session`, badge "Continuando sua conversa anterior"
- ✅ **Rate limiting do Beto** (Sprint 3): 30 mensagens/hora por sessão, HTTP 429 + Retry-After
- ✅ **Autenticação admin**: Supabase Auth + middleware de proteção; senha rotacionada para aleatória pós-provisionamento
- ✅ **Painel admin (Sprint 2)**: dashboard com KPIs reais, CRUD de reservas conectado ao banco, botões Confirmar/Cancelar/WhatsApp funcionais, criação manual
- ✅ **Configurações editáveis pelo tenant** (Sprint 5): identidade (nome/cor/logo), gestão de `business_hours` (7 dias × toggles + horários + slot duration), bloqueios manuais (`slot_blocks`)
- ✅ **Backup automatizado** (Sprint 1): `backup-supabase.sh` + `restore-supabase.sh` + `systemd timer` diário 03:30, rotação 30 dias, primeiro backup validado
- ✅ **Runbook de emergência** (Sprint 1): `docs/runbook.md` cobrindo pânico / rollback / restore / reset de senha / renovação de cert / operação Uptime Kuma
- ✅ **Segurança de metadata** (Sprint 1): removido "Create Next App", OpenGraph + Twitter cards, `viewport-fit=cover`, `themeColor`
- ✅ **Área do Cliente** (Sprint 8): login self-service via magic link em `/entrar`, `/minhas-reservas` com listagem agrupada (Próximas/Histórico), detalhe + cancelamento, download `.ics`, vínculo automático de novas reservas para clientes logados, resgate de reservas anônimas (form manual com WhatsApp + auto-vínculo por email pós-magic-link), header navegacional discreto e pré-requisitos documentados em runbook seções 7-8. Commits: `6538705` (core I-01 a I-04) + `47ff6eb` (entrega final I-05 a I-10) + `31caa35` (preenchimento de SHA nos comentários do Plane). Próximo passo de deploy: rebuild da imagem como `parrilla-booking:sprint8.2` (a `sprint8.1` em produção cobre apenas até `6538705`).

## O que está em andamento

- 🔧 **Uptime Kuma — configuração da UI**: infra deployada em `uptime.parilla8187.antrop-ia.com` com cert Let's Encrypt, mas falta criar conta admin + adicionar 3 monitores HTTP (`/`, `/reservar`, `/admin/login`) + conectar canal Telegram/Slack — responsável: AntropIA — previsão: pré-demo (5 min)
- 🔧 **Detecção proativa de abuso** (Sprint 6, parcial): `audit_log` já registra eventos, mas falta regra ativa "> 5 reservas do mesmo IP em 10 min → alerta" e UI `/admin/audit` — responsável: AntropIA — previsão: a definir
- 🔧 **Demo com o cliente**: roteiro pronto (ver abaixo), aguardando confirmação de data

## O que falta

### Pré-demo (agora, 5–10 min)

- ✅ **Deploy da imagem `sprint8.3`** (21/04 noite): imagem `ce8a1a72f7b6` em produção cobrindo até commit `f045f1f`. Rollout convergiu zero-downtime; `sprint8.2` e `sprint8.1` mantidas pra rollback.
- ✅ **Template de email Supabase aplicado** (21/04 noite): magic link sai com identidade Parrilla — I-09 Done.
- ✅ **Fix de host em redirects** (21/04 noite, commit `f045f1f`): Next 16 standalone atrás do Traefik usava `HOSTNAME=0.0.0.0` ao construir URLs de redirect, mandando usuário pra `https://0.0.0.0:3000/minhas-reservas` após o magic link. Novo helper `app/lib/public-url.ts` lê `x-forwarded-host` + `x-forwarded-proto`. Aplicado no callback do Supabase e no middleware.
- ✅ **Smoke test end-to-end validado** (21/04 noite): magic link → callback no host público → `/minhas-reservas` OK.
- 🔴 **Atualizar Plane**: colar os 10 comentários de `docs/plane-comments.md` nas issues I-01 a I-10 e mover todas para Done.
- 🔴 **Smoke test no celular** em `/reservar`: fluxo de 4 telas + captcha + Beto + admin reflete a reserva. Novo caminho Sprint 8: reserva anônima → CTA "Salvar na minha conta" → magic link → auto-vínculo invisível em `/minhas-reservas` → abrir detalhe → testar `.ics` e cancelar.
- 🔴 **Uptime Kuma**: conta + 3 monitores + canal de notificação (Telegram/Slack/WhatsApp)
- 🔴 **(Opcional) Limpar dados de teste**: 1 reserva + 2 conversas Beto — se cliente preferir demo zerado

### Antes de entregar ao cliente

- 🔴 **Credenciais via canal seguro** (1Password / Vaultwarden / WhatsApp efêmero):
  - URL: `https://reservas.parilla8187.antrop-ia.com`
  - Admin: `https://reservas.parilla8187.antrop-ia.com/admin/login`
  - Email: `admin@parrilla8187.com.br`
  - Senha: guardada no cofre (ver docs internos)

### Roteiro de demo sugerido (5–7 min, ordem de maior impacto)

1. Abrir `/reservar` no celular → explicar fluxo de 4 telas, 30 segundos por reserva
2. Meio do fluxo → tocar no botão Beto → perguntar "qual picanha pra 4 pessoas" → mostrar streaming
3. Em outro dispositivo, abrir `/admin` → mostrar a reserva recém-feita no dashboard
4. `/admin/configuracoes` → mudar cor de marca ao vivo → refresh mostra nova cor
5. `/admin/configuracoes/horarios` → fechar domingo → `/reservar` num domingo fica vazio
6. `/admin/configuracoes/bloqueios` → bloquear 25/12 → explicar cobertura de feriados
7. (Se sobrar tempo) `/admin/reservas` → confirmar/cancelar uma reserva → mostrar botão WhatsApp

### Enquadramento positivo do que ainda não existe

- **Cardápio editável pelo cliente** → ajustes hoje via AntropIA em horas; edição visual está no roadmap (Sprint 6.C, 8h, baixo ROI no momento)
- **Esqueci minha senha** → reset manual pelo time AntropIA; self-service está planejado (Sprint 5)
- **Multi-tenant ativo com outros restaurantes** → arquitetura pronta, ativação é uma tarde de dev (Sprint 5.D)
- **Pipeline CI/CD** → deploy hoje é manual mas documentado no runbook; automação está no backlog (Sprint 4)

### Melhorias planejadas (médio prazo)

- 🟡 **Sprint 4 — Performance & CI/CD** (7h): migrar `getAvailability()` para PL/pgSQL, cache HTTP de 60s na API de slots, pipeline GitHub Actions → Swarm
- 🟡 **Sprint 5 — Auto-serviço restante** (8h): fluxo "esqueci minha senha", resolver de tenant dinâmico, onboarding documentado
- 🟡 **Sprint 6.C — Cardápio editável** (1d): migrar de constante TypeScript para tabelas `menu_categories` + `menu_items` + UI admin

## Bloqueios

Nenhum bloqueio técnico. **Aguardando do lado cliente**: data da demo, confirmação dos pontos focais (dono / gestor de sala / ponto focal técnico), decisão sobre go-live público oficial.

## URLs de produção

| URL | Função |
|---|---|
| `https://reservas.parilla8187.antrop-ia.com/` | Página pública (redireciona para `/reservar`) |
| `https://reservas.parilla8187.antrop-ia.com/reservar` | Fluxo de reserva: 4 telas + Beto + captcha |
| `https://reservas.parilla8187.antrop-ia.com/entrar` | Login do cliente final (magic link) |
| `https://reservas.parilla8187.antrop-ia.com/minhas-reservas` | Área autenticada do cliente — lista, detalhe, cancelar |
| `https://reservas.parilla8187.antrop-ia.com/admin/login` | Entrada admin |
| `https://reservas.parilla8187.antrop-ia.com/admin` | Dashboard com KPIs reais |
| `https://reservas.parilla8187.antrop-ia.com/admin/reservas` | CRUD de reservas + WhatsApp |
| `https://reservas.parilla8187.antrop-ia.com/admin/configuracoes` | Identidade da marca + links para horários/bloqueios |
| `https://uptime.parilla8187.antrop-ia.com` | Monitoring interno (Uptime Kuma) |

## Defesas ativas em produção

- Captcha Turnstile no formulário público
- Rate limit em `/api/reservar/slots`, `/api/reservar`, `/api/beto/chat`, `requestLoginLink` (3/min por IP) e `resgatarReserva` (5/min por user)
- Validação de WhatsApp (10–13 dígitos + prefixo 55)
- Limite de 3 reservas futuras ativas por número
- Audit log persistindo eventos de bloqueio (`rate_limit_*`, `reservation_rejected_*`)
- Backup diário com restore testado
- Middleware protegendo `/admin/*` e `/minhas-reservas/*`
- RLS Postgres: cliente logado só enxerga reservas com `user_id = auth.uid()`
- TLS via Let's Encrypt com renovação automática

## Última atualização

21/04/2026 (tarde) — por AntropIA. Mudanças desde a atualização anterior do dia: fechamento do Sprint 8 com commits `47ff6eb` (feat I-05 a I-10) e `31caa35` (docs — SHA preenchido em `plane-comments`). Build passou local (`next build` 10.8s). Deploy da imagem `sprint8.2` e aplicação do template de email pendentes.

## Próxima revisão

28/04/2026 _(pós-demo com o cliente — registrar feedback recebido e iterar Sprint 4/5)_
