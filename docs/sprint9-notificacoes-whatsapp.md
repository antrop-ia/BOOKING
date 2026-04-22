# Sprint 9 — Notificações WhatsApp via Evolution API

> **Status**: planejado, não iniciado.
> **Prazo estimado**: 10-12h de dev (core) + 2h de infra.
> **Pré-requisitos**: Sprint 8 entregue (Área do Cliente ✅).

---

## Objetivo

Dar ao admin da Parrilla 8187 autonomia para:

1. Receber notificação no WhatsApp **quando chega reserva nova**
2. (Fase 2, opcional) Notificar o **cliente** após confirmação/cancelamento
3. Configurar tudo pela UI do admin (número, template, toggle on/off) **sem precisar de dev**

Para isso, subir **stack Evolution API dedicada** pra Parrilla (isolada da instância SmartFlow que já roda no servidor).

---

## Estado atual editável pelo admin

Já pronto (Sprint 5 + extras):

- ✅ Identidade (nome, cor, logo) — `/admin/configuracoes`
- ✅ Horários de funcionamento — `/admin/configuracoes/horarios`
- ✅ Bloqueios manuais — `/admin/configuracoes/bloqueios`
- ✅ Espaços do restaurante — `/admin/configuracoes/espacos`

Pendente (fora deste Sprint):

- 🟡 Cardápio do Beto (Sprint 6.C, ~8h) — tabelas `menu_categories` + `menu_items` + CRUD
- 🟡 Templates de WhatsApp já existentes (mensagem do botão "WhatsApp" no admin) — hoje hardcoded em `app/lib/reservations.ts`, seria um bom add-on desta Sprint

---

## Arquitetura proposta

### Stack Evolution API dedicada (Sprint 9.A)

Stack nova no Swarm com container dedicado pra Parrilla:

```
parrilla-evolution_api        → evoapicloud/evolution-api:2.3.7
parrilla-evolution_postgres   → postgres:15 (state da Evolution, não do Next)
parrilla-evolution_redis      → redis:7-alpine (sessão WhatsApp)
```

**Exposição**: somente via Traefik em `evolution.parilla8187.antrop-ia.com` com Basic Auth. A API propriamente dita fica **só na rede interna** `minha_rede` — o Next acessa por hostname de container (`http://parrilla-evolution-api:8080`).

**Volumes persistentes**:
- `parrilla_evolution_instances` (sessão WhatsApp — crítico, não pode zerar)
- `parrilla_evolution_postgres` (state)
- `parrilla_evolution_redis` (cache)

**Segurança**:
- `AUTHENTICATION_API_KEY` em `/etc/parrilla-booking/evolution.env` (0600, só root)
- Nunca logada, nunca exposta ao client
- Backup diário da sessão junto com o Supabase

### Schema no Supabase (Sprint 9.B)

Migration `supabase/migrations/20260422_notifications.sql`:

```sql
-- Configuração por tenant
CREATE TABLE public.notification_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  evolution_url text NOT NULL DEFAULT 'http://parrilla-evolution-api:8080',
  evolution_api_key text,
  instance_name text,
  -- Número(s) que RECEBEM notificação de nova reserva (staff do restaurante)
  staff_numbers text[] NOT NULL DEFAULT '{}',
  template_new_reservation text NOT NULL DEFAULT E'🎉 Nova reserva\n\n{nome} ({pessoas} pessoas)\n📅 {data} às {hora}\n📍 {espaco}\n💬 {ocasiao}\n\nCódigo: {codigo}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trilha de auditoria (débito técnico: sem tabela = sem troubleshoot)
CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  event_type text NOT NULL,               -- new_reservation, test, future: confirmed/cancelled
  target_number text NOT NULL,
  status text NOT NULL,                   -- queued, sent, failed
  error text,
  response jsonb,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notification_log_tenant_time
  ON public.notification_log (tenant_id, attempted_at DESC);

-- RLS: admin (membership) lê, service_role escreve
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read settings"
  ON public.notification_settings FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()));

CREATE POLICY "members read log"
  ON public.notification_log FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()));
```

### Admin UI (Sprint 9.B continuação)

Nova rota `/admin/configuracoes/notificacoes`:

- Toggle on/off global
- Lista de números staff (adicionar/remover, validação WhatsApp com `normalizeWhatsapp` já existente)
- Textarea de template com **variáveis listadas** e **preview em tempo real** usando dados fake
- Botão **"Enviar teste"** — manda uma mensagem real pro primeiro número staff, mostra status
- Card de status da instância (conectado / desconectado com QR code pra parear — iframe ou link pro Manager UI em `evolution.parilla8187.antrop-ia.com`)

### Hook no fluxo de reserva (Sprint 9.C)

- `app/lib/notifications.ts` (novo): `sendWhatsAppText(params)` que faz `POST` pra Evolution API
- `notifyNewReservation(reservationId)` chamado **após** insert bem-sucedido em `createReservation`, dentro de `try/catch` — se falhar, grava em `notification_log` com `status='failed'` e **não derruba** o fluxo da reserva
- Best-effort (mesma filosofia do `audit.ts`): notificação é valor adicional, falha silenciosa não pode bloquear a reserva

### Quem compõe a mensagem

Função `renderTemplate(template, reservation)` substitui `{nome}`, `{data}`, `{hora}`, `{pessoas}`, `{espaco}`, `{ocasiao}`, `{codigo}`. Usa `friendlyDate` de `app/lib/date.ts` e `parseGuestContact` de `app/lib/reservations.ts`.

---

## Fora de escopo deste Sprint

- Notificar o **cliente** após confirmação/cancelamento (seria Sprint 9.D, +4h)
- Lembrete 24h antes da reserva (precisa de cron / scheduler — +6h)
- Botões de ação no WhatsApp ("Confirmar presença", "Cancelar") — Evolution suporta mas é complexidade maior
- CI/CD pra Evolution API (deploy manual via compose)

Se o cliente pedir depois, viram Sprint 10.

---

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| WhatsApp Web banir a conta por automação | Usar número de staff dedicado, volume baixo (só nova reserva). Evitar templates promocionais. |
| QR code expira e ninguém percebe | Card de status na tela de config + monitor Uptime Kuma no endpoint `/instance/connectionState` |
| Evolution API derrubada = reservas param | Hook é best-effort, nunca bloqueia. Failed fica em `notification_log` pra reenvio manual. |
| Template mal formatado quebra envio | Validar variáveis no save (client + server), preview em tempo real |
| Vazamento da API key | Env file `0600`, nunca no bundle, nunca no log |

---

## Decisões pendentes (pedir ao cliente antes de implementar)

1. **Número(s) que recebem notificação**: um único número (gestor) ou uma lista (ex: gestor + salonero)?
2. **Template padrão**: aprovar o texto inicial ou o cliente quer escrever do zero?
3. **Notificação pro cliente final**: é escopo dessa sprint ou fica pra fase 2?
4. **Domínio da Manager UI**: expor em subdomínio público (com Basic Auth) ou manter só via SSH tunnel?

---

## Breakdown de issues

Ver `plane-import-sprint9.csv` na raiz do repo — 8 issues prontas pra importar no Plane (módulo "Admin editável & notificações", cycle "Sprint 9 - Notificações WhatsApp").
