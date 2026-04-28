# Material de divulgação — Parrilla 8187

Pra quando bater o martelo de "vamos divulgar", já está tudo pronto pra colar.

> **URL atual:** `https://reservas.parilla8187.antrop-ia.com/reservar`
>
> Se trocar por domínio próprio (ex `reservas.parrilla8187.com.br`), atualizar
> abaixo + regerar QR code.

---

## 1. QR Code

Gerar com qualquer ferramenta livre (sem app, sem login):
- https://www.qr-code-generator.com/
- https://www.qrcode-monkey.com/ (custom com logo no centro)

**URL pra codificar:**
```
https://reservas.parilla8187.antrop-ia.com/reservar
```

**Settings recomendados:**
- Tamanho: 1024x1024 px (alta resolução pra impressão)
- Formato: PNG (mais compatível) + SVG (vetor pra grandes formatos)
- Margem: padrão (4 módulos)
- Cor: preto sobre branco (mais robusto pra leitura — emoji/cor decorativos quebram em câmeras antigas)

**Onde colar:**
- Cardápio impresso (canto inferior direito ou contracapa)
- Mesas individuais (adesivo discreto)
- Vitrine externa
- Bio do Instagram (link direto, não precisa QR)

---

## 2. Texto pro Instagram (bio + post)

### Bio
```
Parrilla 8187 · Bar e Churrascaria
Boa Viagem, Recife · Reserve sua mesa →
```

### Link da bio
```
https://reservas.parilla8187.antrop-ia.com/reservar
```

### Post de lançamento (sugestão)

> Reserva online, em 30 segundos.
>
> Agora você reserva sua mesa pelo nosso site, escolhe espaço (Salão central, Área externa ou Área verde) e recebe a confirmação no WhatsApp na hora.
>
> Link na bio 🔗
>
> #parrilla8187 #boaviagem #recife #churrascaria

### Stories — frame 1
```
"E agora dá pra reservar mesa pelo nosso site!"
[Print da tela inicial /reservar]
"Arraste pra cima 👆"
```

### Stories — frame 2
```
"Você escolhe data, pessoas e espaço.
A gente confirma no WhatsApp."
[Print da tela de confirmação com código destacado]
"Link na bio"
```

---

## 3. Mensagem padrão pro WhatsApp do restaurante

Resposta rápida quando cliente pergunta "como reservo?":

```
Oi! Você reserva direto no nosso site, leva ~30s:

🔗 https://reservas.parilla8187.antrop-ia.com/reservar

Lá você escolhe data, horário, espaço e número de pessoas.
A confirmação chega aqui no WhatsApp na hora!

Qualquer dúvida estou aqui 🥩
```

---

## 4. Texto pra cardápio impresso

Pequeno destaque no rodapé:

```
RESERVE SUA MESA NA NOSSA WEB
reservas.parilla8187.antrop-ia.com
[QR code]
```

---

## 5. Email de lançamento (se tiver mailing existente)

**Subject:** `Reserva online na Parrilla 8187 — agora ficou bem mais fácil`

**Body:**
```
Olá!

Hoje colocamos no ar nosso novo sistema de reservas online.

Em menos de um minuto você:
• Escolhe a data e o horário
• Seleciona o espaço (Salão central, Área externa ou Área verde coberta)
• Recebe a confirmação no WhatsApp na hora
• Pode consultar ou cancelar a qualquer momento

🔗 Reserve sua mesa: https://reservas.parilla8187.antrop-ia.com/reservar

Te esperamos!

Parrilla 8187 — Bar e Churrascaria
Boa Viagem, Recife
```

---

## 6. Checklist de lançamento

Marca quando fizer:

- [ ] Smoke test completo passou (ver [smoke-checklist.md](smoke-checklist.md))
- [ ] Templates Supabase aplicados (ver [supabase-email-templates.md](supabase-email-templates.md))
- [ ] Uptime Kuma configurado e alertando (ver [uptime-kuma-config.md](uptime-kuma-config.md))
- [ ] WhatsApp do restaurante setado em `RESTAURANT_INFO.whatsapp` (botão "Falar com restaurante" aparece)
- [ ] QR code gerado e impresso
- [ ] Bio do Instagram atualizada com link da bio
- [ ] Post de lançamento agendado/publicado
- [ ] Staff treinado (entrar em /admin/login, ver reservas, confirmar/cancelar, criar manualmente)
- [ ] Backup do dia validado (`tail -20 /var/log/parrilla-backup.log`)
- [ ] Status check final: `https://reservas.parilla8187.antrop-ia.com/reservar` → HTTP 200

Quando todas as caixinhas estiverem marcadas, pode divulgar com tranquilidade.

---

## 7. Pós-lançamento — primeiras 48h

Monitorar ativamente:

- **Dashboard admin** (`/admin`): banner amber de "eventos suspeitos" deve mostrar volume normal (~5-10 rate_limits ao dia, 0 burst_detected)
- **Audit log** (`/admin/audit`): scrollar nas primeiras horas pra ver se há padrões inesperados
- **Uptime Kuma**: se algum monitor cair, investigar
- **WhatsApp do restaurante**: cliente pode mandar mensagem dizendo que algo não funcionou — responder rápido

Em caso de problema crítico (site fora, reservas falhando, WhatsApp parado), seguir [docs/runbook.md](../runbook.md).
