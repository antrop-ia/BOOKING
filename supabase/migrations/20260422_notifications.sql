-- Sprint 9 — Notificações WhatsApp via Evolution API
--
-- Duas tabelas:
--   1. notification_settings: 1 linha por tenant com config (toggle, numeros
--      do staff, template, credenciais da Evolution). RLS permite leitura
--      pra qualquer membro; updates vao pelo service_role (server actions).
--   2. notification_log: audit trail de cada tentativa de envio. Escrito via
--      service_role no hook best-effort; membros leem pra ver historico +
--      status no admin.
--
-- Rodar no Supabase Dashboard -> SQL Editor -> Run. Idempotente.

-- ─────────────────────────────────────────────────────────────────
-- notification_settings
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  -- Nome da instancia Evolution que representa o WhatsApp deste tenant.
  -- URL e API key do Evolution ficam em env vars do servidor (nao no banco)
  -- pra nunca expor o segredo via RLS. Multi-tenant futuro pode migrar pra
  -- colunas dedicadas quando precisar.
  instance_name text,
  -- Numeros que recebem notificacao de nova reserva. Array permite
  -- ter gestor + salonero + etc desde o dia 1.
  staff_numbers text[] NOT NULL DEFAULT '{}',
  template_new_reservation text NOT NULL DEFAULT
    E'🎉 Nova reserva\n\n{nome} ({pessoas} pessoas)\n📅 {data} às {hora}\n📍 {espaco}\n💬 {ocasiao}\n\nCódigo: {codigo}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notification_settings IS
  'Sprint 9: config de notificacoes WhatsApp via Evolution API (1 linha por tenant).';

-- Trigger de updated_at reaproveita padrao dos outros schemas
CREATE OR REPLACE FUNCTION public.notification_settings_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notification_settings_touch_updated_at ON public.notification_settings;
CREATE TRIGGER notification_settings_touch_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.notification_settings_touch_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- notification_log
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  event_type text NOT NULL,               -- new_reservation, test, (futuros: confirmed, cancelled)
  target_number text NOT NULL,
  status text NOT NULL,                   -- queued, sent, failed
  error text,
  response jsonb,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notification_log IS
  'Sprint 9: trilha de cada tentativa de envio de notificacao (best-effort, nao bloqueia).';

CREATE INDEX IF NOT EXISTS notification_log_tenant_time
  ON public.notification_log (tenant_id, attempted_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────
-- Padrao do projeto: admin (via membership) le; server actions escrevem
-- via service_role.

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read notification_settings"
  ON public.notification_settings;
CREATE POLICY "members read notification_settings"
  ON public.notification_settings
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_memberships
       WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "members read notification_log"
  ON public.notification_log;
CREATE POLICY "members read notification_log"
  ON public.notification_log
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_memberships
       WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────
-- Verificacao
-- ─────────────────────────────────────────────────────────────────

SELECT
  'notification tables ready' AS status,
  (SELECT count(*) FROM public.notification_settings) AS settings_count,
  (SELECT count(*) FROM public.notification_log)      AS log_count;
