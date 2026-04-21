# Status e Andamento

Painel textual de acompanhamento do projeto. Deve ser atualizado semanalmente e permitir leitura rápida do estado atual por sócios, equipe e parceiros.

---

## Nome do cliente

Parrilla 8187 — Bar e Churrascaria

## Nome do projeto

Plataforma de Reservas Online + Atendente IA "Beto"

## Status geral

**Em atenção**

_Frontend público funcional em produção; painel administrativo entregue em modo demonstração (mock) e precisa ser conectado aos dados reais antes do go-live operacional. Há também 2 endpoints de debug expostos sem autenticação que precisam ser removidos antes da divulgação pública._

## Etapa atual

**Desenvolvimento — Sprint final do MVP / preparação para go-live**

## Resumo rápido

A frente pública está pronta e recebe reservas reais (testada end-to-end: data → horário → dados → confirmação com código `#P8187-XXXX` gravado no banco). O atendente Beto responde com streaming via Groq usando o cardápio completo da Parrilla. O painel admin está com a UI 100% pronta (dashboard, listagem de reservas com filtros e busca, configurações), mas a tela de reservas usa um array mock de 12 reservas fictícias e os botões de ação (Confirmar, Cancelar, WhatsApp) ainda não têm handler. Próximo passo é o Sprint 1 (saneamento de segurança) seguido do Sprint 2 (admin conectado ao banco), que juntos transformam o sistema de "demo bonita" em "produto operável pelo restaurante".

## O que já foi feito

- ✅ **Infraestrutura**: deploy em Docker Swarm + Traefik no servidor AntropIA, HTTPS automático via Let's Encrypt, healthcheck, restart policy, rollback em caso de falha
- ✅ **Domínio**: `reservas.parilla8187.antrop-ia.com` apontando para o servidor (DNS corrigido de Vercel para servidor próprio)
- ✅ **Fluxo público de reserva**: 4 telas mobile-first com gravação real no Supabase, geração de código de reserva, conflict detection (slot duplicado)
- ✅ **API de disponibilidade**: `/api/reservar/slots` calcula horários livres a partir de `business_hours`, `reservations` e `slot_blocks`
- ✅ **Atendente Beto**: integração com Groq (Llama 3.3-70B), streaming, system prompt com personalidade local, cardápio completo (~80 itens) hardcoded
- ✅ **Botão flutuante do Beto** com correções específicas para mobile (z-index alto, safe-area-inset, viewport-fit=cover)
- ✅ **Autenticação admin**: Supabase Auth, middleware de proteção de rotas, login/logout funcional
- ✅ **Usuário admin provisionado**: `admin@parrilla8187.com.br` com role `owner` no tenant
- ✅ **Painel admin (UI)**: shell com sidebar e header, dashboard com KPIs e próximas reservas, listagem de reservas com filtros (Hoje/Amanhã/Semana/Todos), busca, badges de status, expansão de detalhes; tela de configurações
- ✅ **Documentação base**: 4 documentos padrão de projeto preenchidos com o estado real

## O que está em andamento

- 🔧 **Auditoria e roadmap**: relatório de auditoria entregue (em `~/.claude/plans/twinkly-enchanting-tide.md`); aguardando aprovação para iniciar Sprint 1 — responsável: AntropIA — previsão: 19/04
- 🔧 **Validação dos templates de planejamento** preenchidos com o estado real do projeto — responsável: AntropIA — previsão: 19/04

## O que falta

### Bloqueante para go-live (curto prazo)

- 🔴 **Sprint 1 — Saneamento de segurança** (1-2h): remover/proteger `/api/debug/*`, corrigir metadata default ("Create Next App"), rate limiting básico em endpoints públicos — previsão: 21/04
- 🔴 **Sprint 2 — Admin funcional** (4-6h): converter `reservas/page.tsx` para ler do banco, conectar KPIs do dashboard a queries reais, implementar handlers de Confirmar/Cancelar/WhatsApp, modal de criação manual de reserva — previsão: 23/04
- 🔴 **Trocar senha do admin** antes de entregar credenciais ao cliente — previsão: junto com Sprint 2

### Melhorias planejadas (médio prazo)

- 🟡 **Sprint 3 — Persistência do chat do Beto** (3-4h): tabela `beto_conversations`, retomada de conversa via session cookie — previsão: a definir
- 🟡 **Sprint 4 — Otimização de disponibilidade** (2-3h): migrar cálculo para função PL/pgSQL, timezone-aware, cache de 60s — previsão: a definir
- 🟡 **Sprint 5 — Configurações editáveis** (2h): editar nome/cor/logo do tenant, gerenciar `business_hours` e `slot_blocks` — previsão: a definir
- 🟡 **Sprint 6 — Anti-abuso** (2-3h): captcha (Cloudflare Turnstile), limite de reservas por telefone, log de eventos suspeitos — previsão: a definir

## Bloqueios

Nenhum bloqueio técnico no momento.

**Aguardando do lado cliente**: confirmação dos pontos focais (nome/contato dos responsáveis Parrilla 8187 — proprietário, gestor de sala, ponto focal técnico) e definição da data oficial de go-live público.

## Última atualização

19/04/2026 — por AntropIA

## Próxima revisão

26/04/2026 _(após conclusão dos Sprints 1 e 2)_
