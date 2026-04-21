-- Sprint 3 — Chat persistente do Beto
-- Cria a tabela que guarda o historico de conversas do chatbot por sessao.
-- Rodar no Supabase Dashboard → SQL Editor → Run.
-- Seguro para re-executar (IF NOT EXISTS em tudo).

-- ─────────────────────────────────────────────────────────────────
-- Tabela
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.beto_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.beto_conversations IS
  'Historico de conversas do atendente Beto. Uma linha por sessao do navegador.';
COMMENT ON COLUMN public.beto_conversations.session_id IS
  'Identificador opaco gerado no cookie beto_session; nao ligado a usuario autenticado.';
COMMENT ON COLUMN public.beto_conversations.messages IS
  'Array de UIMessage do ai-sdk (parts, role, id, metadata).';

-- ─────────────────────────────────────────────────────────────────
-- Indices
-- ─────────────────────────────────────────────────────────────────

-- Lookup da conversa de uma sessao (unique: 1 conversa por session_id/tenant)
CREATE UNIQUE INDEX IF NOT EXISTS beto_conversations_tenant_session
  ON public.beto_conversations (tenant_id, session_id);

-- Listagem por data no admin (Sprint 5)
CREATE INDEX IF NOT EXISTS beto_conversations_tenant_updated
  ON public.beto_conversations (tenant_id, updated_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- Trigger para manter updated_at
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS beto_conversations_touch_updated_at
  ON public.beto_conversations;

CREATE TRIGGER beto_conversations_touch_updated_at
  BEFORE UPDATE ON public.beto_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────
-- Politica: admin users podem LER conversas do proprio tenant.
-- Escrita (INSERT/UPDATE) so via service_role (admin client no server),
-- por isso nao ha policy de INSERT/UPDATE para usuarios autenticados.

ALTER TABLE public.beto_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members can read conversations"
  ON public.beto_conversations;

CREATE POLICY "members can read conversations"
  ON public.beto_conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships m
      WHERE m.user_id = auth.uid()
        AND m.tenant_id = public.beto_conversations.tenant_id
    )
  );

-- Verificacao: a tabela existe?
SELECT
  'beto_conversations created' AS status,
  (SELECT count(*) FROM public.beto_conversations) AS current_rows;
