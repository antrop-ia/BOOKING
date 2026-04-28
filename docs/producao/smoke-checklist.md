# Smoke checklist pré-divulgação

Roteiro completo pro PM (e/ou cliente) executar antes de bater o martelo de "agora pode divulgar". Cada item leva 1-3 minutos. Total: ~30 minutos.

> **Pré-requisito:** abrir num celular real (iOS Safari + Chrome Android), não desktop. Maioria dos clientes vai vir por mobile.

## 1. Fluxo público completo (10 min)

### 1.1 — Home
- [ ] Abrir https://reservas.parilla8187.antrop-ia.com/reservar
- [ ] Logo + "Parrilla 8187" + "Boa Viagem, Recife" carregam
- [ ] Pills 1-6 + "+" aparecem
- [ ] Campo "Mais de 6 pessoas" embaixo, **desativado** com placeholder "desativado"
- [ ] Datas (cards horizontais com Hoje/Amanhã/...): scrollam horizontalmente
- [ ] Pills "Almoço" e "Jantar" funcionam
- [ ] Banner amber "A melhor picanha da cidade"
- [ ] Botão "Ver horários disponíveis" → vai pra próxima
- [ ] Link "Já tenho reserva — consultar" no rodapé

### 1.2 — Pessoas mais de 6
- [ ] Tocar pill "+" — campo numérico se ilumina, foca cursor
- [ ] Digitar `12` — pill mostra "12"
- [ ] Tocar pill "4" — campo volta apagado, pill 4 selecionado
- [ ] Voltar pra "+", digitar `3` e tirar dedo — pula pra `7` (mín)
- [ ] Digitar `99` e tirar dedo — pula pra `30` (máx)

### 1.3 — Espaço
- [ ] Após "Ver horários", vai pra tela de espaço
- [ ] 3 espaços ATIVOS aparecem: **Salão central** / **Área externa** / **Área verde (coberta)**
- [ ] Espaços inativos NÃO aparecem (Salão interno, Varanda externa)
- [ ] Cada um tem ícone + descrição
- [ ] Selecionar um → próxima tela

### 1.4 — Horários
- [ ] Subtítulo mostra "{data} · {pessoas} pessoas · {turno} · {espaço}"
- [ ] **Almoço:** mostra slots 11:00, 12:00, 13:00, 14:00, 15:00
- [ ] **Jantar:** mostra slots 17:00, 18:00, 19:00, 20:00, 21:00, 22:00
- [ ] Slot ocupado (se houver) aparece riscado e desabilitado
- [ ] Selecionar um → "Confirmar 19:00" → próxima

### 1.5 — Dados (DadosScreen)
- [ ] Subtítulo mostra "Sex 1 mai · 19:00 · 7 pessoas · Área verde (coberta)"
- [ ] **Tocar no campo Email — NÃO deve haver zoom** (iOS Safari)
- [ ] Tocar em outros campos — também sem zoom
- [ ] Mensagens de validação aparecem se WhatsApp inválido (ex: 1234)
- [ ] Cloudflare Turnstile carrega (verde "Sucesso!")
- [ ] Disclaimer no rodapé: "Ao confirmar, você concorda com os Termos e a Política de Privacidade"
- [ ] Links **Termos** e **Política de Privacidade** abrem em aba nova
- [ ] Botão "Confirmar reserva" → submete

### 1.6 — Confirmação
- [ ] Tela de sucesso com checkmark animado
- [ ] **Código em destaque grande** (ex `#P8187-A1B2`) com fonte mono
- [ ] Botão "📋 Copiar código" — clica, vira "✓ Copiado"
- [ ] Botão grande primário "CONSULTAR RESERVA" — clica, abre ficha
- [ ] Botão secundário "📤 Compartilhar" — no celular abre share nativo (iOS/Android)
- [ ] Botão "Fazer nova reserva" — volta pro início

### 1.7 — WhatsApp do cliente recebido
- [ ] Recebeu WhatsApp confirmando a reserva (instância `parrilla-8187` precisa estar ativa)
- [ ] Mensagem tem nome, data, horário, pessoas, espaço, código
- [ ] **Horário no WhatsApp bate com o que apareceu na tela** (esse é o teste do timezone fix)

### 1.8 — Footer LGPD
- [ ] Pílula no rodapé centralizada com "Privacidade · Termos" durante todo o fluxo

## 2. Consulta pública por código (5 min)

- [ ] Abrir `/reservar/consultar` direto (ou via botão da confirmação)
- [ ] Tela escura com input "P8187-XXXX"
- [ ] Digitar código inválido (ex `P8187-ZZZZ`) → mensagem "Formato inválido"
- [ ] Digitar código real (ex `P8187-A1B2`) → vai pra ficha
- [ ] Ficha mostra: badge status, código grande, copiar, info, botão calendário (.ics), botão WhatsApp do restaurante (se config)

## 3. Área logada do cliente (Sprint 8) (5 min)

- [ ] Acessa `/entrar` direto
- [ ] Digita um email novo, recebe magic link em ~30s
- [ ] Clica no link, cai logado em `/minhas-reservas`
- [ ] Lista vazia se 1ª vez. Resgate via I-10 popula auto se WhatsApp bater.
- [ ] Clica em uma reserva → abre ficha (NÃO deve cair em "não encontrada" — bug ILIKE corrigido em commit `cc4c166`)
- [ ] Botão cancelar funciona se status confirmed

## 4. Admin (10 min)

### 4.1 — Login
- [ ] Acessa `/admin/login`
- [ ] Email + senha do admin (`dev@antrop-ia.com` / `Antrop1a` ou outro)
- [ ] Login → cai em `/admin` (dashboard)
- [ ] "Esqueci minha senha" → tela `/admin/esqueci-senha` → email recebido com cara da Parrilla (após templates aplicados)

### 4.2 — Reservas
- [ ] `/admin/reservas` → lista as reservas reais
- [ ] Filtros (Hoje/Amanhã/Semana/Todos) funcionam
- [ ] Confirmar/cancelar funciona (clica e atualiza)
- [ ] Botão WhatsApp do cliente abre conversa com mensagem pré-formatada
- [ ] "Nova reserva" — modal abre, form com todos campos. **Espaço é obrigatório** (sem ele dá erro)

### 4.3 — Configurações
- [ ] `/admin/configuracoes/espacos` — 5 espaços (3 ativos, 2 inativos)
- [ ] Editar Salão central — campo "Capacidade (pessoas)" mostra `60`. Mudar pra `50`, salvar.
- [ ] Volta pro fluxo público, vê que Salão central agora tem 50 vagas.
- [ ] Reverter pra 60.

### 4.4 — Notificações WhatsApp
- [ ] `/admin/configuracoes/notificacoes` — instância `parrilla-8187` mostra "Conectado" (verde)
- [ ] Botão "Enviar teste" — número do owner recebe um WhatsApp com mensagem padrão
- [ ] Toggle "Notificar cliente após reserva" → on/off

### 4.5 — Auditoria
- [ ] `/admin/audit` — lista eventos do tenant
- [ ] Filtro por janela (7 dias) e tipo de evento (reservation_created)
- [ ] Cada linha: timestamp, badge colorido, IP, detalhes (json on-demand)

## 5. Capacidade end-to-end (5 min)

Esse é o teste do F.3.

- [ ] Reservar **Área externa** (cap 30) em uma data X às 19:00, 20 pessoas
- [ ] Voltar e tentar reservar mesma data, mesmo horário, Área externa, 11 pessoas → slot deve estar **desabilitado** (riscado)
- [ ] Tentar 10 pessoas → ainda disponível (resto = 30 - 20 = 10)
- [ ] Reservar Salão central (cap 60) na mesma data e horário, 30 pessoas → permitido (espaço diferente)

## 6. Bloqueadores conhecidos

| Item | Status | Impacto |
|---|---|---|
| WhatsApp público do restaurante | ⏳ aguarda número | Botão "Falar com restaurante" não aparece na ficha pública. Não bloqueia divulgação. |
| GitHub Actions CI | ⏳ billing | Pushes futuros não são validados automaticamente. Validar manualmente com `npx tsc --noEmit`. |
| Domínio custom | ⏳ não decidido | Hoje em `parilla8187.antrop-ia.com`. Não bloqueia mas a comunicação fica mais profissional com `reservas.parrilla8187.com.br`. |
| Templates de email Supabase | ⏳ aguarda você aplicar | Magic link e reset password ainda em inglês. Conteúdo pronto em [supabase-email-templates.md](supabase-email-templates.md). |
| Uptime Kuma config | ⏳ aguarda você | Sem alertas se algo cair. Instruções em [uptime-kuma-config.md](uptime-kuma-config.md). |
| Restore test do backup | ⏳ aguarda agendar com Claude | Backups acontecem mas não foram testados de fato. |

Quando todos os itens da seção 1-5 passarem **e** os bloqueadores acima estiverem ou resolvidos ou conscientemente aceitos como "v1 sem isso", o produto está pronto pra divulgação.
