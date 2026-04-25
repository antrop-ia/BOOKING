# Runbook operacional — Parrilla 8187

> **Para quando algo quebrar em producao.** Este documento e escrito para ser usado **em panico**: comandos sao copy-paste, contexto e minimo, decisao-arvore e linear. Cada secao explica quando usar, o que fazer e como verificar que voltou ao normal.

URL de producao: `https://reservas.parilla8187.antrop-ia.com`
Infra: servidor AntropIA (`185.182.184.175`), Docker Swarm, Traefik v3.4, Supabase (dados).

---

## Arvore de decisao rapida

```
Algo quebrou em producao.
│
├── Usuarios nao conseguem abrir o site (timeout, 502, 504)?
│   └── ver [1. App nao responde]
│
├── Site abre mas erro 500/400 em alguma rota apos deploy?
│   └── ver [2. Rollback de deploy recente]
│
├── Dados sumiram / tabela corrompida / reservas erradas?
│   └── ver [3. Restore do banco a partir de backup]
│
├── Admin nao consegue logar (senha errada / conta travada)?
│   └── ver [4. Reset de senha do admin]
│
├── Certificado HTTPS expirou?
│   └── ver [5. Certificado Let's Encrypt]
│
├── Uptime Kuma sumiu / esta offline?
│   └── ver [6. Uptime Kuma]
│
└── Notificacao WhatsApp parou (staff/cliente)?
    └── ver [9. Evolution API — notificacoes WhatsApp]
```

---

## 1. App nao responde

### 1.1 Diagnostico (30 segundos)

```bash
# 1. O servico Swarm esta rodando?
docker service ls | grep parrilla-booking

# 2. Quantas replicas saudaveis?
docker service ps parrilla-booking_app --no-trunc | head -5

# 3. Logs recentes do container
docker service logs parrilla-booking_app --tail 50

# 4. Traefik esta rodando e roteando?
docker service ls | grep traefik
curl -sI https://reservas.parilla8187.antrop-ia.com/ | head -3
```

**Sinais:**
- `0/1 replicas` → container morreu, nao reiniciou
- `1/1` mas HTTP 000 → Traefik nao esta roteando
- `1/1` mas HTTP 502 → container vivo mas app travado
- `Task failed: unhealthy` → healthcheck falhando

### 1.2 Tentativa 1: forcar restart

```bash
docker service update --force parrilla-booking_app
# Aguardar convergencia (~1 minuto)
docker service ps parrilla-booking_app | head -3
```

Se voltar a `1/1 Running (healthy)`, testar:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://reservas.parilla8187.antrop-ia.com/reservar
# Esperado: 200
```

### 1.3 Tentativa 2: nao resolveu, rollback para versao anterior

Ver secao [2. Rollback de deploy recente].

---

## 2. Rollback de deploy recente

**Quando usar:** o ultimo `docker service update --image ...` quebrou algo. Usuarios reportam erros apos o deploy.

### 2.1 Rollback de 1 versao (via Swarm, rapido)

Swarm mantem `PreviousSpec` — a config imediatamente anterior.

```bash
# Ver se ha rollback disponivel
docker service inspect parrilla-booking_app --format '{{if .PreviousSpec}}OK rollback disponivel{{else}}SEM previous spec{{end}}'

# Executar rollback
docker service rollback parrilla-booking_app

# Aguardar convergencia
docker service ps parrilla-booking_app | head -3
```

**Limitacao:** so volta 1 passo. Se o problema veio de 2+ deploys atras, usar secao 2.2.

### 2.2 Rollback via rebuild de commit antigo (robusto)

```bash
cd /root/BOOKING

# 1. Ver historico de commits recentes
git log --oneline --decorate -10

# 2. Identificar o ultimo commit bom (ex: abc1234)
# 3. Sem mudar a branch, construir imagem desse commit especifico
git stash  # se houver mudancas locais
git checkout <SHA_BOM>

source .env
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -t parrilla-booking:rollback \
  .

# 4. Deploy
docker service update --image parrilla-booking:rollback parrilla-booking_app --force

# 5. Voltar pra master e recuperar mudancas (depois que estabilizar)
git checkout master
git stash pop  # se aplicavel
```

Verificacao:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://reservas.parilla8187.antrop-ia.com/reservar
# Esperado: 200
```

### 2.3 Prevencao: tags timestamped

O pipeline ideal faz `docker build -t parrilla-booking:deploy-YYYYMMDDHHMMSS .` antes de promover para `:latest`. Hoje so temos `:latest` — quando o Sprint 4 entregar CI/CD, esse fluxo fica automatico. Ate la, antes de cada deploy significativo:

```bash
TAG="manual-$(date -u +%Y%m%d-%H%M%S)"
docker build ... -t parrilla-booking:$TAG -t parrilla-booking:latest .
# Guarda a tag anterior antes de promover
```

---

## 3. Restore do banco a partir de backup

**Quando usar:** perda de dados (tabela wipeada, corrupcao, reservas duplicadas em massa). O backup e diario as 03:30 -03, retido por 30 dias em `/var/backups/parrilla-booking/`.

### 3.1 Escolher o backup

```bash
ls -lh /var/backups/parrilla-booking/
# Ex: parrilla-20260421-064500.tar.gz → backup de 21/04 as 06:45 UTC

# Ver conteudo de um backup sem restaurar
mkdir -p /tmp/inspect && cd /tmp/inspect
tar -xzf /var/backups/parrilla-booking/parrilla-YYYYMMDD-HHMMSS.tar.gz
cat MANIFEST.txt
python3 -c "import json; d=json.load(open('reservations.json')); print(f'{len(d)} reservations')"
cd - && rm -rf /tmp/inspect
```

### 3.2 Dry-run

```bash
/root/BOOKING/scripts/restore-supabase.sh /var/backups/parrilla-booking/parrilla-YYYYMMDD-HHMMSS.tar.gz --dry-run
```

So mostra o que seria feito, sem gravar.

### 3.3 Restore real

```bash
/root/BOOKING/scripts/restore-supabase.sh /var/backups/parrilla-booking/parrilla-YYYYMMDD-HHMMSS.tar.gz
# Vai pedir confirmacao digitando "YES"
```

**Comportamento:** usa `Prefer: resolution=ignore-duplicates`. Se voce quer **substituir** dados existentes (nao apenas adicionar faltantes), precisa TRUNCAR as tabelas antes via Supabase SQL Editor:

```sql
-- No Supabase dashboard → SQL Editor (rodar com cuidado, idealmente em horario de baixa)
TRUNCATE TABLE public.reservations, public.slot_blocks CASCADE;
-- Tenants e establishments normalmente nao devem ser truncados (referencia FK)
```

Depois rodar o restore-supabase.sh normalmente.

### 3.4 Auth.users nao e restaurado automaticamente

Usuarios admin (`auth.users`) estao no backup so como lista (email, metadata) — senhas hashadas nao vem pela API publica. Se perder auth.users, recriar:

```bash
source /root/BOOKING/.env
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@parrilla8187.com.br","password":"NOVA_SENHA","email_confirm":true}'

# E o membership para esse user:
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/tenant_memberships" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<UUID_DO_USER>","tenant_id":"db426261-9f09-4eec-9c59-ed2ac2ecdeed","role":"owner"}'
```

---

## 4. Reset de senha do admin

**Quando usar:** admin perdeu a senha, cliente quer trocar, senha possivelmente vazou.

```bash
# 1. Gerar senha forte
NEW_PASS=$(openssl rand -hex 8 | fold -w4 | paste -sd'-' -)
echo "Nova senha: $NEW_PASS"

# 2. Pegar USER_ID do admin
source /root/BOOKING/.env
USER_ID=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users?email=admin@parrilla8187.com.br" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['users'][0]['id'])")
echo "User ID: $USER_ID"

# 3. Atualizar senha
curl -s -X PUT "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users/$USER_ID" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$NEW_PASS\"}" | python3 -m json.tool | head -5

# 4. Validar
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@parrilla8187.com.br\",\"password\":\"$NEW_PASS\"}" | head -c 100
# Esperado: JSON com "access_token"
```

Passar a nova senha ao cliente por canal seguro (Vaultwarden, 1Password, WhatsApp com mensagem efemera).

---

## 5. Certificado Let's Encrypt

Traefik renova certificados automaticamente ~30 dias antes de expirar. Se algo der errado:

### 5.1 Verificar validade do cert atual

```bash
echo | openssl s_client -connect reservas.parilla8187.antrop-ia.com:443 \
  -servername reservas.parilla8187.antrop-ia.com 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
```

### 5.2 Forcar renovacao

Se o cert nao renovou automaticamente, remove ele do cache e Traefik pega de novo:

```bash
TRAEFIK=$(docker ps --filter "name=traefik_traefik" --format "{{.Names}}" | head -1)

# Backup do acme.json antes de mexer
docker exec "$TRAEFIK" cp /etc/traefik/letsencrypt/acme.json /etc/traefik/letsencrypt/acme.backup.json

# Remover cert especifico (ajustar dominio)
docker exec "$TRAEFIK" sh -c 'python3 -c "
import json
with open(\"/etc/traefik/letsencrypt/acme.json\") as f: d=json.load(f)
certs = d[\"letsencryptresolver\"][\"Certificates\"]
d[\"letsencryptresolver\"][\"Certificates\"] = [c for c in certs if c[\"domain\"][\"main\"]!=\"reservas.parilla8187.antrop-ia.com\"]
with open(\"/etc/traefik/letsencrypt/acme.json\",\"w\") as f: json.dump(d,f)
"'

# Forcar Traefik a pegar novo cert
docker service update --force traefik_traefik
```

### 5.3 Se DNS estiver errado

Ver `cat /var/log/traefik/traefik.log | grep "invalid authorization"`. Se for NXDOMAIN, DNS precisa ser corrigido antes — Traefik vai ficar tentando ate conseguir.

---

## 6. Uptime Kuma

URL: `https://uptime.parilla8187.antrop-ia.com`

### 6.1 Servico caiu

```bash
docker service ls | grep uptime-kuma
docker service logs uptime-kuma_kuma --tail 50
docker service update --force uptime-kuma_kuma
```

### 6.2 Perdeu o acesso ao dashboard (senha / 2FA)

O Uptime Kuma guarda tudo em `/app/data` (SQLite). Reset de senha:

```bash
KUMA=$(docker ps --filter "name=uptime-kuma_kuma" --format "{{.Names}}")
docker exec -it "$KUMA" node extra/reset-password.js
# Interativo: segue o prompt
```

### 6.3 Backup / restore dos configs do Uptime Kuma

O volume `uptime-kuma_uptime-kuma-data` tem toda config (monitores, notificacoes, usuarios):

```bash
# Backup manual
docker run --rm -v uptime-kuma_uptime-kuma-data:/data -v $(pwd):/backup alpine \
  tar -czf /backup/uptime-kuma-$(date +%Y%m%d).tar.gz -C /data .

# Restore
docker run --rm -v uptime-kuma_uptime-kuma-data:/data -v $(pwd):/backup alpine \
  sh -c "rm -rf /data/* && tar -xzf /backup/uptime-kuma-YYYYMMDD.tar.gz -C /data"
docker service update --force uptime-kuma_kuma
```

---

## 7. Sprint 8 — pre-requisitos no Supabase Dashboard

A Sprint 8 (login do cliente final) introduz duas dependencias de configuracao
**no Dashboard do Supabase** (nao em env var). Sem elas, magic link nao
funciona.

### 7.1 Redirect URL do magic link

Authentication -> URL Configuration -> Redirect URLs deve conter:

```
https://reservas.parilla8187.antrop-ia.com/entrar/callback
```

Sem essa entrada, o `signInWithOtp` retorna erro silencioso e o cliente
recebe email cujo link aponta para a URL default (geralmente localhost).

### 7.2 Magic Link habilitado

Authentication -> Email Templates -> Magic Link deve estar **enabled**.

### 7.3 Migration `user_id` em reservations

Migration `supabase/migrations/20260421_reservations_user_id.sql` precisa
estar aplicada. Idempotente — pode rodar varias vezes sem efeito colateral.
Aplicacao manual: SQL Editor -> Run.

Validacao apos aplicar:

```sql
select count(*), count(user_id),
       count(*) filter (where user_id is null) as anonimas
  from reservations;
```

Reservas pre-Sprint 8 ficam com `user_id = null` (esperado).

---

## 8. Templates de email Supabase

### 8.1 Onde editar

Supabase Dashboard -> Authentication -> Email Templates.

Templates customizados pelo projeto (cole HTML do arquivo correspondente):

| Template | Arquivo versionado | Subject |
|---|---|---|
| Magic Link | `docs/email-templates/magic-link.html` | "Seu acesso à Parrilla 8187 está pronto" |

### 8.2 Como testar (sem mexer em producao)

1. Em producao, abrir `https://reservas.parilla8187.antrop-ia.com/entrar`
2. Submeter o form com um email pessoal que voce tenha acesso
3. Verificar caixa de entrada — deve chegar email com layout dark Parrilla,
   logo P 8187 amarelo, botao "Entrar na Parrilla"
4. Clicar no link -> deve cair em `/minhas-reservas` (ou no destino do
   `?redirect=` se houver)

### 8.3 Limites de envio

SMTP padrao do Supabase: ~3-4 emails/hora por endereco. Suficiente para
demo + uso individual. Para go-live publico real, configurar SMTP customizado
(Resend / SendGrid) em Project Settings -> Auth -> SMTP.

### 8.4 Se sobrescreverem o template no Dashboard

O HTML versionado em `docs/email-templates/` e a fonte da verdade. Reaplicar
copy-paste. Variavel obrigatoria do template: `{{ .ConfirmationURL }}` —
nao remover.

---

## 9. Evolution API — notificacoes WhatsApp

A stack `parrilla-evolution` (3 servicos: api, postgres, redis) hospeda a
instancia do Baileys que envia WhatsApp pro staff e pro cliente. Sessao
do WhatsApp persistida no Postgres da Evolution (volume
`parrilla_evolution_postgres`).

URL interna: `http://parrilla-evolution_api:8080`
Instancia ativa: `parrilla-8187`
API key: `EVOLUTION_API_KEY` em `/root/BOOKING/.env`

### 9.1 Diagnostico (30 segundos)

```bash
# Stack rodando?
docker service ls | grep parrilla-evolution

# API responde?
source /root/BOOKING/.env
docker exec $(docker ps --filter "name=parrilla-booking" -q | head -1) \
  wget -q -O- --timeout=5 --header="apikey: $EVOLUTION_API_KEY" \
  "$EVOLUTION_API_URL/" | head -c 200

# Estado da instancia (deve ser "open" se WhatsApp pareado)
docker exec $(docker ps --filter "name=parrilla-booking" -q | head -1) \
  wget -q -O- --header="apikey: $EVOLUTION_API_KEY" \
  "$EVOLUTION_API_URL/instance/connectionState/parrilla-8187"
```

**Sinais:**
- `state: open` → tudo certo
- `state: connecting` → aguardando QR ser escaneado
- `state: close` → sessao caiu, precisa parear de novo
- HTTP timeout → stack pode estar parada

### 9.2 Re-parear apos sessao cair

UI:
1. Login admin -> `/admin/configuracoes/notificacoes`
2. Botao **"Gerar QR code"** -> escaneia no WhatsApp do staff
3. Polling automatico atualiza o badge pra "Conectado" em 4-12s

Curl direto (se UI nao responder):
```bash
source /root/BOOKING/.env
docker exec $(docker ps --filter "name=parrilla-booking" -q | head -1) sh -c "
  wget -q -O- --header='apikey: $EVOLUTION_API_KEY' \
    '$EVOLUTION_API_URL/instance/connect/parrilla-8187'
" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('base64','sem QR retornado')[:80])"
```

### 9.3 Restart da stack Evolution

```bash
# Restart do servico API (mantem volumes)
docker service update --force parrilla-evolution_api

# Restart do postgres (cuidado, derruba sessao se sem backup)
docker service update --force parrilla-evolution_postgres
```

### 9.4 Backup da sessao

Backup diario as 03:45 -03 via systemd timer:

```bash
# Status do timer
systemctl list-timers parrilla-evolution-backup.timer

# Forcar backup agora (uso em emergencia ou pre-mudanca)
systemctl start parrilla-evolution-backup.service

# Validar arquivo
ls -lh /var/backups/parrilla-evolution/

# Inspecionar conteudo de um backup
mkdir /tmp/evobk && cd /tmp/evobk
tar -xzf /var/backups/parrilla-evolution/evolution-YYYYMMDD-HHMMSS.tar.gz
cat MANIFEST.txt
head -30 evolution.sql
cd - && rm -rf /tmp/evobk
```

Cada backup contem:
- `evolution.sql` — pg_dump completo (clean + if-exists, idempotente)
- `instances.tar.gz` — volume Baileys metadata
- `MANIFEST.txt`

Retencao: 30 dias. Local: `/var/backups/parrilla-evolution/`.

### 9.5 Restore da sessao (disaster recovery)

**Quando usar:** servidor migrou, postgres da Evolution corrompeu, ou perdeu
o pareamento e nao quer escanear QR de novo.

```bash
# 1. Pegar o backup mais recente
LATEST=$(ls -t /var/backups/parrilla-evolution/evolution-*.tar.gz | head -1)
echo "Restaurando de: $LATEST"

# 2. Extrair em sandbox
mkdir -p /tmp/evolution-restore && cd /tmp/evolution-restore
tar -xzf "$LATEST"
ls -la  # ver evolution.sql, instances.tar.gz, MANIFEST.txt

# 3. Restaurar pg_dump dentro do container postgres
PG=$(docker ps --filter "name=parrilla-evolution_postgres" --format "{{.Names}}" | head -1)
cat evolution.sql | docker exec -i "$PG" psql -U evo -d evolution

# 4. Restaurar volume instances (precisa parar o api antes)
docker service scale parrilla-evolution_api=0
docker run --rm \
  -v parrilla_evolution_instances:/dest \
  -v $(pwd):/backup \
  alpine sh -c "cd /dest && tar -xzf /backup/instances.tar.gz"
docker service scale parrilla-evolution_api=1

# 5. Validar — deve voltar pra "open" sem precisar de QR
sleep 10
source /root/BOOKING/.env
docker exec $(docker ps --filter "name=parrilla-booking" -q | head -1) \
  wget -q -O- --header="apikey: $EVOLUTION_API_KEY" \
  "$EVOLUTION_API_URL/instance/connectionState/parrilla-8187"

# Cleanup
cd / && rm -rf /tmp/evolution-restore
```

Se o `state` voltar `open`, a sessao foi restaurada com sucesso. Se vier
`close`, precisa parear de novo via UI (`/admin/configuracoes/notificacoes`).

### 9.6 Reset completo (recriar instancia do zero)

Como ultimo recurso, se nada acima resolver:

```bash
source /root/BOOKING/.env
# Deletar instancia
docker exec $(docker ps --filter "name=parrilla-booking" -q | head -1) sh -c "
  wget -q -O- --method=DELETE --header='apikey: $EVOLUTION_API_KEY' \
    '$EVOLUTION_API_URL/instance/delete/parrilla-8187'
"
# Recriar via UI: /admin/configuracoes/notificacoes -> "Gerar QR code"
```

### 9.7 Logs em caso de envio falhar

```bash
# Logs do container API
docker service logs parrilla-evolution_api --tail 50

# Logs do app principal (pra ver se notifyNewReservation foi chamado)
docker service logs parrilla-booking_app --tail 50 2>&1 | grep -i "notify\|evolution"

# Tabela notification_log (rastreia cada tentativa)
source /root/BOOKING/.env
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/notification_log?select=attempted_at,event_type,target_number,status,error&order=attempted_at.desc&limit=20" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | python3 -m json.tool
```

---

## Apendice — referencias rapidas

### Locais importantes

| O que | Onde |
|---|---|
| Codigo da aplicacao | `/root/BOOKING` |
| Env vars do app | `/root/BOOKING/.env` |
| Compose do app | `/root/BOOKING/docker-compose.yml` |
| Script de backup Supabase | `/root/BOOKING/scripts/backup-supabase.sh` |
| Script de restore Supabase | `/root/BOOKING/scripts/restore-supabase.sh` |
| Script de backup Evolution | `/root/BOOKING/scripts/backup-evolution.sh` |
| Credenciais do backup | `/etc/parrilla-booking/backup.env` (0600) |
| Backups Supabase | `/var/backups/parrilla-booking/` |
| Backups Evolution | `/var/backups/parrilla-evolution/` |
| Log do backup Supabase | `/var/log/parrilla-backup.log` |
| Log do backup Evolution | `/var/log/parrilla-evolution-backup.log` |
| Timer Supabase | `systemctl status parrilla-backup.timer` (03:30 -03) |
| Timer Evolution | `systemctl status parrilla-evolution-backup.timer` (03:45 -03) |
| Uptime Kuma compose | `/root/uptime-kuma/docker-compose.yml` |
| Traefik dynamic config | `/root/traefik-dynamic/` |
| Traefik certs storage | volume `volume_swarm_certificates` |
| Volumes Evolution | `parrilla_evolution_postgres`, `parrilla_evolution_instances`, `parrilla_evolution_redis` |

### Tenant IDs (para restore e queries manuais)

- **Tenant** Parrilla 8187: `db426261-9f09-4eec-9c59-ed2ac2ecdeed`
- **Admin user** atual: `admin@parrilla8187.com.br`

### Comandos que voce vai usar muito

```bash
# Status geral
docker service ls | grep -E "parrilla|uptime|traefik"

# Logs ao vivo do app
docker service logs -f parrilla-booking_app

# Logs ao vivo do Traefik (filtrado)
docker service logs traefik_traefik 2>&1 | grep -i "parrilla\|uptime"

# Rebuild + deploy rapido (sem git pull)
cd /root/BOOKING && source .env && \
  docker build --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    -t parrilla-booking:latest . && \
  docker service update --image parrilla-booking:latest parrilla-booking_app --force

# Forcar backup agora (fora do horario)
systemctl start parrilla-backup.service
tail -20 /var/log/parrilla-backup.log
```

### Historico deste runbook

- `2026-04-21` — versao inicial, cobrindo rollback do app, restore de banco, reset de senha admin, certificado Let's Encrypt e Uptime Kuma
- `2026-04-21` — Sprint 8: secao 7 (pre-requisitos Supabase para magic link) e secao 8 (templates de email customizados)
