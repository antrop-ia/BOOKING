-- F.3 fix (27/04/2026) — drop do UNIQUE em reservations falhou.
--
-- O constraint original e em 3 colunas (tenant_id, establishment_id,
-- slot_start) e tem nome "reservations_unique_slot". A migration anterior
-- procurou so por 2 colunas e nao achou, entao nao dropou.
--
-- Confirmado em log de producao:
--   error 23505 duplicate key value violates unique constraint
--   "reservations_unique_slot"
--   Key (tenant_id, establishment_id, slot_start)=(...) already exists.
--
-- Drop direto pelo nome conhecido (idempotente via IF EXISTS).

ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_unique_slot;

-- Validacao: deve retornar 0 linhas (constraint dropado)
SELECT conname, pg_get_constraintdef(oid) AS def
  FROM pg_constraint
 WHERE conrelid = 'public.reservations'::regclass
   AND contype = 'u';
