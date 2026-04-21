-- Sprint 8 — Area do Cliente (I-01)
-- Vincula reservas ao auth.users para o fluxo de "Minhas reservas".
-- Nullable: reservas anonimas continuam validas (user_id vazio).
-- Rodar no Supabase Dashboard -> SQL Editor -> Run. Idempotente.

-- ─────────────────────────────────────────────────────────────────
-- Coluna user_id em reservations
-- ─────────────────────────────────────────────────────────────────
-- ON DELETE SET NULL: apagar um usuario nao apaga historico da reserva
-- (preserva audit + nome do hospede). Migration retrocompativel —
-- reservas existentes nao sao tocadas.
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS user_id uuid
  REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index parcial: so as reservas vinculadas a uma conta entram no indice,
-- mantendo ele pequeno e focado na query mais comum (Minhas reservas).
CREATE INDEX IF NOT EXISTS reservations_user_id
  ON public.reservations (user_id, slot_start DESC)
  WHERE user_id IS NOT NULL;

COMMENT ON COLUMN public.reservations.user_id IS
  'Usuario autenticado dono da reserva (auth.users). Null para reservas anonimas (fluxo publico sem login).';

-- ─────────────────────────────────────────────────────────────────
-- Row Level Security — cliente ve suas proprias reservas
-- ─────────────────────────────────────────────────────────────────
-- Politica ADITIVA: nao substitui a politica de admin (membership).
-- Admin continua lendo tudo via admin/service_role; usuario autenticado
-- so ve linhas onde user_id bate com auth.uid().
--
-- Nao adicionamos policies de INSERT/UPDATE/DELETE aqui: essas mutacoes
-- seguem acontecendo pelo service_role (server actions validam ownership).

DROP POLICY IF EXISTS "users see own reservations"
  ON public.reservations;

CREATE POLICY "users see own reservations"
  ON public.reservations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────
-- Verificacao
-- ─────────────────────────────────────────────────────────────────
SELECT
  'reservations.user_id ready' AS status,
  count(*)                              AS total_reservations,
  count(user_id)                        AS with_user,
  count(*) FILTER (WHERE user_id IS NULL) AS anonymous
FROM public.reservations;
