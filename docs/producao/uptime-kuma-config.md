# Uptime Kuma — configuração inicial

Uptime Kuma já está deployado no servidor. Falta a configuração inicial via UI: criar conta admin, cadastrar monitores e configurar canal de notificação.

## 1. Criar conta admin (1ª vez)

1. Acessa a UI do Uptime Kuma (URL configurada no Traefik — confirmar com `docker service inspect`)
2. Na primeira visita, ele pede pra criar conta admin. **Salva user/senha em gerenciador de senha** — não tem reset por email.
3. Já no painel, vai em **Settings → General**:
   - Time zone: `America/Recife`
   - Theme: dark (cara mais alinhada com produto)

## 2. Cadastrar 3 monitores

### Monitor 1 — App principal (HTTPS)
- **Type:** HTTP(s)
- **Name:** `Parrilla — App público`
- **URL:** `https://reservas.parilla8187.antrop-ia.com/reservar`
- **Heartbeat interval:** 60 segundos
- **Retries:** 2 (evita alerta em rollout passageiro)
- **Method:** GET
- **Accepted Status Codes:** `200-299`
- **Tags:** `producao`, `critico`

### Monitor 2 — API de slots (verifica banco indiretamente)
- **Type:** HTTP(s) — **JSON Query** (Pro feature; se não tiver, usar HTTP simples)
- **Name:** `Parrilla — API slots`
- **URL:** `https://reservas.parilla8187.antrop-ia.com/api/reservar/slots?date=2026-12-31&turno=jantar&space_id=35bd9c85-d761-48ff-9530-b25b643ca8f8&party_size=1`
  > Nota: o `space_id` acima é o **Salão central**. Se mudar de banco, atualizar.
- **Heartbeat interval:** 120 segundos
- **Retries:** 2
- **Accepted Status Codes:** `200-299`
- **Tags:** `producao`, `banco`

### Monitor 3 — Evolution API (WhatsApp)
- **Type:** HTTP(s)
- **Name:** `Parrilla — Evolution WhatsApp`
- **URL:** `http://parrilla-evolution_api:8080/instance/connectionState/parrilla-8187`
  > Se URL interna não funcionar (Uptime Kuma fora da network swarm), usar URL externa do Evolution se houver.
- **Heartbeat interval:** 300 segundos (5 min — não é tão crítico ter alta granularidade)
- **Headers (custom):**
  ```
  apikey: <EVOLUTION_API_KEY do .env>
  ```
- **Accepted Status Codes:** `200-299`
- **Tags:** `producao`, `notificacao`

## 3. Canal de notificação

Recomendo **Telegram** ou **Discord webhook** — ambos gratuitos e sem fricção.

### Opção A — Telegram (recomendado)

1. No Telegram, fala com `@BotFather` → `/newbot` → escolhe nome e username (ex: `parrilla8187_uptime_bot`)
2. BotFather devolve um **token** (formato `123456:ABC-DEF...`)
3. Manda `/start` pro seu novo bot
4. Pega seu **chat_id**: acessa `https://api.telegram.org/bot<TOKEN>/getUpdates`, procura `"chat":{"id":12345...`. Esse número é o chat_id.
5. No Uptime Kuma → **Settings → Notifications → Setup Notification**:
   - Type: Telegram
   - Bot Token: o do BotFather
   - Chat ID: o que você pegou
   - Default Enabled: ✓
   - Apply on all existing monitors: ✓

### Opção B — Discord webhook

1. Cria um servidor Discord pessoal (ou usa um existente)
2. Channel → **Edit** → **Integrations** → **Webhooks** → **New Webhook**
3. Copia a URL do webhook
4. Uptime Kuma → Notifications → Discord:
   - Webhook URL: cola
   - Username: `Parrilla Uptime`
   - Apply: ✓

## 4. Status page pública (opcional)

Útil pra mostrar pro cliente que o produto é monitorado:

1. Uptime Kuma → **Status Pages** → **New Status Page**
2. Slug: `parrilla`
3. Title: `Parrilla 8187 — Status`
4. Adiciona os 3 monitores
5. URL fica em `<uptime-kuma-domain>/status/parrilla`

## 5. Validação

1. Pausa um monitor manualmente (clica no botão pause). Deve gerar alerta no canal escolhido em ~1 min.
2. Reativa. Deve gerar "Resolved".
3. Deixa rodar por 24h e confere o histórico — uptime > 99%.

## Operação contínua

- Se receber alerta, primeiro consulta o monitor afetado.
- Para `App principal`: provavelmente container caiu. Verificar `docker service ps parrilla-booking_app`.
- Para `API slots`: pode ser banco. Verificar Supabase Dashboard.
- Para `Evolution`: pode ser Whatsapp despareado. Ir em `/admin/configuracoes/notificacoes` e re-parear.

Detalhes operacionais em [docs/runbook.md](../runbook.md) seções 7 (auth) e 9 (Evolution).
