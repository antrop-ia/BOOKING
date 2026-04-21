-- Sprint 6.A.2 — Log de eventos suspeitos
-- Registra rejeicoes (rate limit, limite de reservas por numero) e sinais
-- de abuso que mereceriam investigacao humana. Rodar no Supabase Dashboard
-- -> SQL Editor -> Run. Seguro para re-executar (IF NOT EXISTS em tudo).

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  establishment_id uuid REFERENCES public.establishments(id) ON DELETE CASCADE,
  ip text,
  event_type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.audit_log IS
  'Eventos relevantes para auditoria: rejeicoes de reserva, rate limit, etc.';
COMMENT ON COLUMN public.audit_log.event_type IS
  'Identificador curto: rate_limit_reserve, rate_limit_slots, rate_limit_beto, reservation_rejected_over_limit, reservation_rejected_invalid_phone, etc.';
COMMENT ON COLUMN public.audit_log.details IS
  'Payload livre em JSON: path, whatsapp normalizado, motivo, etc.';

CREATE INDEX IF NOT EXISTS audit_log_tenant_ts
  ON public.audit_log (tenant_id, ts DESC);

CREATE INDEX IF NOT EXISTS audit_log_event_ts
  ON public.audit_log (event_type, ts DESC);

CREATE INDEX IF NOT EXISTS audit_log_ip_ts
  ON public.audit_log (ip, ts DESC)
  WHERE ip IS NOT NULL;

-- Row Level Security: apenas service_role escreve; membros do tenant leem.
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members can read their tenant audit"
  ON public.audit_log;

CREATE POLICY "members can read their tenant audit"
  ON public.audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships m
      WHERE m.user_id = auth.uid()
        AND m.tenant_id = public.audit_log.tenant_id
    )
  );

-- Verificacao
SELECT
  'audit_log created' AS status,
  (SELECT count(*) FROM public.audit_log) AS current_rows;
