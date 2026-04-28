# Pasta `docs/producao/` — guia rápido

Documentos pra preparar e operar a divulgação pública do sistema.
Ordem de leitura/execução **antes** de divulgar:

1. **[smoke-checklist.md](smoke-checklist.md)** — Roteiro de ~30min pra testar o produto inteiro num celular real. **Faz isso antes de qualquer coisa.**
2. **[supabase-email-templates.md](supabase-email-templates.md)** — HTML pronto pra colar no Supabase Dashboard (magic link cliente + reset password admin). ~5min.
3. **[uptime-kuma-config.md](uptime-kuma-config.md)** — Passo a passo pra cadastrar 3 monitores + canal Telegram. ~30min.
4. **[divulgacao.md](divulgacao.md)** — Material de marketing (QR, post Instagram, mensagem WhatsApp, email) + checklist final.

## Status atual (28/04/2026)

### Entregue em produção
- ✅ Fluxo público completo (5 telas, captcha, Beto AI, capacidade por pessoas)
- ✅ Admin completo (CRUD, identidade, horários, bloqueios, espaços, notificações, auditoria)
- ✅ Área cliente (login magic link, minhas reservas, cancelamento, .ics)
- ✅ Notificações WhatsApp (staff + cliente, Evolution API)
- ✅ Backup diário Supabase + Evolution (rotação 30 dias)
- ✅ Compliance LGPD (Política, Termos, disclaimer no submit, footer)
- ✅ Audit log + detecção burst + UI `/admin/audit`
- ✅ Páginas SEO (404 custom, robots.txt, sitemap.xml, manifest PWA, OG image)
- ✅ Timezone-aware (slots em horário BR correto)
- ✅ Vuln Dependabot resolvida

### Pendente do user
- ⏳ Aplicar templates Supabase (5min, doc 2)
- ⏳ Configurar Uptime Kuma (30min, doc 3)
- ⏳ Smoke checklist no celular real (30min, doc 1)
- ⏳ WhatsApp público do restaurante (passar número)
- ⏳ Decidir custom domain (opcional)
- ⏳ Logo oficial PNG/SVG (opcional, atualmente usa selo "8187" gerado)

### Pendente futuro (sem prazo)
- GitHub billing → CI rodando
- Restore test do backup em sandbox
- Error tracking dedicado (Sentry-like)
- Beto cardápio em DB (hoje hardcoded)
- 2º tenant de demonstração (validar multi-tenancy ativa)

## Como deployar mudanças (referência)

Documentado em detalhe em [../runbook.md](../runbook.md). Resumo:

```bash
cd /root/BOOKING && set -a && source .env && set +a && \
  docker build \
    --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY="$NEXT_PUBLIC_TURNSTILE_SITE_KEY" \
    -t parrilla-booking:latest . && \
  docker service update --image parrilla-booking:latest --force parrilla-booking_app
```

## Contatos importantes

- **AntropIA** (mantém o sistema): contato@antrop-ia.com
- **Servidor**: AntropIA, Docker Swarm, Traefik v3.4
- **Supabase**: `db426261-9f09-4eec-9c59-ed2ac2ecdeed` (tenant Parrilla 8187)
- **Domínio atual**: `reservas.parilla8187.antrop-ia.com`
