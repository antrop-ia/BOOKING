# Resumo do Projeto

Documento de referência principal do projeto. Deve permitir que qualquer pessoa entenda rapidamente o que é o projeto, seu objetivo, escopo, responsáveis e status atual.

---

## Nome do cliente

Parrilla 8187 — Bar e Churrascaria (Boa Viagem, Recife)

## Nome do projeto

Plataforma de Reservas Online + Atendente IA "Beto"

## Objetivo principal

Substituir o atendimento manual de reservas por uma plataforma web pública que permita aos clientes do restaurante reservar mesa em segundos (sem precisar ligar ou conversar via WhatsApp), e oferecer um atendente IA — o **Beto** — que tira dúvidas sobre o cardápio, sugere harmonizações e direciona para a reserva. O resultado esperado é reduzir a fricção de reserva, liberar a equipe de sala para operações presenciais e centralizar todas as reservas em um painel administrativo único.

## Escopo inicial

O que está incluído no projeto nesta fase:

- **Fluxo público de reserva** (mobile-first, 4 telas: data/pessoas → horários → dados → confirmação)
- **Atendente IA "Beto"** integrado ao Groq (Llama 3.3-70B) com cardápio completo e personalidade local
- **Painel administrativo** (`/admin`) com login, dashboard de KPIs, listagem de reservas, configurações
- **Autenticação** via Supabase Auth (email/senha) com proteção de rotas via middleware
- **Banco de dados** PostgreSQL (Supabase) com RLS, schema multi-tenant pronto para escala
- **Infraestrutura de produção**: Docker Swarm + Traefik + HTTPS automático (Let's Encrypt) no servidor AntropIA
- **Domínio dedicado**: `reservas.parilla8187.antrop-ia.com`
- **Documentação base** do projeto (este conjunto de 4 documentos)

## Fora do escopo

O que **não** será tratado neste projeto (para evitar ambiguidade):

- Integração com WhatsApp Business API oficial (Beto e confirmações via WhatsApp ficam para fase posterior)
- Aplicativo móvel nativo (iOS/Android) — a plataforma é web responsiva
- Sistema de pagamento online / pré-pagamento de reserva
- Integração com sistema de PDV/caixa do restaurante
- Multi-tenancy ativa para outros restaurantes (arquitetura está pronta, mas nesta fase só o Parrilla 8187 está provisionado)
- Cardápio editável pelo cliente (hoje é hardcoded no código — edição visual fica para fase posterior)
- Histórico persistente das conversas com o Beto
- Programa de fidelidade, gestão de comandas, controle de estoque

## Responsáveis — lado AntropIA

| Nome | Papel | Contato |
|------|-------|---------|
| [a definir] | Líder do projeto / PO | accounts@antrop-ia.com |
| Claude Code (assistente) | Desenvolvimento e infraestrutura | — |
| [a definir] | Operação / suporte ao cliente | — |

## Responsáveis — lado Cliente

| Nome | Papel | Contato |
|------|-------|---------|
| [a confirmar] | Ponto focal Parrilla 8187 | [a confirmar] |
| [a confirmar] | Aprovador (proprietário/gestor) | [a confirmar] |
| [a confirmar] | Operação de sala / uso diário do admin | [a confirmar] |

## Data de início

14/04/2026 _(commit inicial: `aa26f27` — Initial commit from Create Next App)_

## Status atual

**Em execução** — MVP público em produção, painel administrativo em fase de saneamento (UI pronta, conexão com dados reais pendente).

Última atualização: 19/04/2026

## Observações gerais

- **Stack técnica**: Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + Supabase (PostgreSQL + Auth) + Groq AI (Llama 3.3-70B)
- **URL de produção**: https://reservas.parilla8187.antrop-ia.com
- **Login admin atual**: `admin@parrilla8187.com.br` / `Parrilla8187!` (senha provisória — deve ser trocada antes do go-live com o cliente)
- **Tenant fixo nesta fase**: slug `parrilla8187`, estabelecimento `boa-viagem`
- **Marca**: cor primária `#F5C042` (amarelo Parrilla), aplicada via CSS variable no painel
- **Documentos relacionados**: `02_Status-e-Andamento.md`, `03_Roadmap-e-Proximos-Passos.md`, `04_Decisoes-e-Alinhamentos.md`
- **Repositório**: https://github.com/antrop-ia/BOOKING (branch `master`)
