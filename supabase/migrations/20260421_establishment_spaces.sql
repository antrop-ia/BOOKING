-- Sprint 7 (extra) — Espacos do estabelecimento
-- Permite que o cliente escolha onde quer sentar (Salao / Varanda / etc).
-- Cada establishment pode cadastrar seus espacos via admin.
-- Rodar no Supabase Dashboard -> SQL Editor -> Run.

-- ─────────────────────────────────────────────────────────────────
-- Tabela establishment_spaces
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.establishment_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (establishment_id, slug)
);

COMMENT ON TABLE public.establishment_spaces IS
  'Espacos cadastrados por estabelecimento (Salao, Varanda, Mezanino, etc).';
COMMENT ON COLUMN public.establishment_spaces.icon IS
  'Emoji ou identificador curto para ilustrar o espaco na UI publica.';

CREATE INDEX IF NOT EXISTS establishment_spaces_establishment_order
  ON public.establishment_spaces (establishment_id, sort_order, is_active);

DROP TRIGGER IF EXISTS establishment_spaces_touch_updated_at
  ON public.establishment_spaces;

CREATE TRIGGER establishment_spaces_touch_updated_at
  BEFORE UPDATE ON public.establishment_spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.establishment_spaces ENABLE ROW LEVEL SECURITY;

-- Espacos ativos sao lidos publicamente (necessario para o fluxo de reserva).
DROP POLICY IF EXISTS "public can read active spaces"
  ON public.establishment_spaces;

CREATE POLICY "public can read active spaces"
  ON public.establishment_spaces
  FOR SELECT
  USING (is_active = true);

-- ─────────────────────────────────────────────────────────────────
-- Coluna space_id em reservations
-- ─────────────────────────────────────────────────────────────────
-- Nullable por retrocompatibilidade: reservas antigas continuam validas.
-- ON DELETE SET NULL: apagar um espaco no admin nao apaga historico.
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS space_id uuid
  REFERENCES public.establishment_spaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS reservations_space_id
  ON public.reservations (space_id)
  WHERE space_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────
-- Seed para Parrilla 8187 (Boa Viagem)
-- Inserts idempotentes: usa slug unico por establishment.
-- ─────────────────────────────────────────────────────────────────
WITH parrilla AS (
  SELECT t.id AS tenant_id, e.id AS establishment_id
  FROM public.tenants t
  JOIN public.establishments e ON e.tenant_id = t.id
  WHERE t.slug = 'parrilla8187' AND e.slug = 'boa-viagem'
)
INSERT INTO public.establishment_spaces
  (tenant_id, establishment_id, name, slug, description, icon, sort_order, is_active)
SELECT
  p.tenant_id,
  p.establishment_id,
  v.name,
  v.slug,
  v.description,
  v.icon,
  v.sort_order,
  true
FROM parrilla p,
(VALUES
  ('Salão interno', 'salao-interno',
   'Climatizado, ideal para grupos e para fugir do calor.',
   '🏛️', 0),
  ('Varanda externa', 'varanda-externa',
   'Ao ar livre, mesas altas, ótima para happy hour e drinks.',
   '🌿', 1)
) AS v(name, slug, description, icon, sort_order)
ON CONFLICT (establishment_id, slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- Verificacao
-- ─────────────────────────────────────────────────────────────────
SELECT
  'establishment_spaces ready' AS status,
  count(*) AS total_spaces
FROM public.establishment_spaces;

SELECT name, slug, icon, description
FROM public.establishment_spaces
ORDER BY establishment_id, sort_order;
