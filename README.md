# Parrilla 8187 — Plataforma de Reservas + Atendente IA "Beto"

Sistema de reservas online + chatbot IA para o restaurante [Parrilla 8187](https://reservas.parilla8187.antrop-ia.com) (Bar e Churrascaria, Boa Viagem, Recife).

Stack: **Next.js 16** (App Router) · **React 19** · **Tailwind CSS 4** · **Supabase** (PostgreSQL + Auth) · **Groq** (Llama 3.3-70B).

---

## Onde achar as coisas

### Documentacao do projeto
- [00_Overview-da-Solucao.md](00_Overview-da-Solucao.md) — **Comece aqui.** Arquitetura, componentes e como tudo se conecta
- [01_Resumo-do-Projeto.md](01_Resumo-do-Projeto.md) — Ficha do projeto (cliente, escopo, responsaveis)
- [02_Status-e-Andamento.md](02_Status-e-Andamento.md) — Estado atual
- [03_Roadmap-e-Proximos-Passos.md](03_Roadmap-e-Proximos-Passos.md) — Fases, entregas, prioridades
- [04_Decisoes-e-Alinhamentos.md](04_Decisoes-e-Alinhamentos.md) — Decisoes tecnicas com justificativa

### Operacao
- [docs/runbook.md](docs/runbook.md) — **Runbook de emergencia** (rollback, restore, reset de senha, cert, etc.)
- `scripts/backup-supabase.sh` — Backup diario automatico (systemd timer as 03:30 -03)
- `scripts/restore-supabase.sh` — Restore a partir de um `.tar.gz` em `/var/backups/parrilla-booking/`

---

## Desenvolvimento local

```bash
npm install
cp .env.example .env.local  # preencher as 4 vars do Supabase + Groq
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000). Rotas principais:
- `/reservar` — fluxo publico de reserva (4 telas + botao flutuante do Beto)
- `/admin` — painel administrativo (requer login via Supabase Auth)

Variaveis de ambiente necessarias (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://idsghtonasceealbwjsw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GROQ_API_KEY=...
```

---

## Deploy em producao

Infra: **Docker Swarm + Traefik** no servidor AntropIA. Imagem `parrilla-booking:latest`, stack `parrilla-booking_app`, certificado HTTPS automatico via Let's Encrypt.

Rebuild + deploy rapido (a partir de `/root/BOOKING` no servidor):
```bash
source .env
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -t parrilla-booking:latest .
docker service update --image parrilla-booking:latest parrilla-booking_app --force
```

Se algo quebrar no deploy, ver [docs/runbook.md](docs/runbook.md) — secao **"Rollback de deploy recente"**.

---

## Estrutura de pastas relevantes

```
app/
├── reservar/          # fluxo publico (public-facing)
│   ├── _components/   # UI do booking flow + BetoChat
│   ├── BookingFlow.tsx
│   └── actions.ts     # server action createReservationAction
├── admin/
│   ├── login/         # tela e server actions de autenticacao
│   └── (shell)/       # painel protegido por middleware
│       ├── page.tsx            # dashboard
│       ├── reservas/           # listagem + acoes (confirm/cancel/whatsapp)
│       └── configuracoes/      # read-only por enquanto
├── api/
│   ├── beto/chat/     # endpoint Groq (edge runtime, streaming)
│   └── reservar/slots/ # disponibilidade
├── lib/
│   ├── supabase/      # clientes Supabase (browser, server, admin)
│   ├── beto/          # system prompt + cardapio hardcoded
│   ├── availability.ts
│   ├── reservations.ts
│   ├── rate-limit.ts
│   └── date.ts        # helpers timezone-aware
└── middleware.ts      # protecao de /admin/*
```

---

## Infraestrutura de monitoring

- **Uptime Kuma**: `https://uptime.parilla8187.antrop-ia.com` (self-hosted, monitores HTTP + notificacao Slack/Telegram/Discord)
- **Backup**: diario automatico as 03:30 -03, retencao 30 dias, armazenado em `/var/backups/parrilla-booking/` no servidor
- **Logs do app**: `docker service logs parrilla-booking_app`
- **Logs do Traefik**: dentro do container `traefik_traefik`, `/var/log/traefik/traefik.log`

Detalhes e comandos em [docs/runbook.md](docs/runbook.md).
