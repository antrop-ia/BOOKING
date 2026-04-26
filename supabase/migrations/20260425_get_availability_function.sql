-- Sprint 4 (D.1) — public.get_availability(): substitui as 3 queries de
-- app/lib/availability.ts por uma function PL/pgSQL.
--
-- Comportamento intencionalmente identico ao TS atual:
--   - dayISO interpretado em UTC (server roda em UTC, weekday vem do UTC date)
--   - business_hours.opens_at/closes_at interpretados em UTC
--   - reservas com status 'confirmed' OU 'pending' bloqueiam o slot
--   - slot_blocks da mesma data bloqueiam tambem
--
-- Timezone-awareness real (usar establishments.timezone) fica como follow-up
-- — exige deslocar slot_starts existentes em 3h, e isso e um data migration
-- separado do escopo desta entrega.
--
-- Idempotente: CREATE OR REPLACE + DROP IF EXISTS antes de GRANTs.

CREATE OR REPLACE FUNCTION public.get_availability(
  p_establishment_id uuid,
  p_date date
)
RETURNS TABLE (
  slot_start timestamptz,
  slot_end timestamptz,
  available boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weekday smallint;
  v_opens_at time;
  v_closes_at time;
  v_duration_minutes integer;
  v_open_ts timestamptz;
  v_close_ts timestamptz;
  v_day_start timestamptz;
  v_day_end timestamptz;
BEGIN
  v_weekday := EXTRACT(DOW FROM p_date)::smallint;

  SELECT bh.opens_at, bh.closes_at, bh.slot_duration_minutes
    INTO v_opens_at, v_closes_at, v_duration_minutes
  FROM public.business_hours bh
  WHERE bh.establishment_id = p_establishment_id
    AND bh.weekday = v_weekday
  LIMIT 1;

  IF v_opens_at IS NULL THEN
    RETURN;
  END IF;

  -- Igual ao TS: combina date + time interpretando como UTC.
  v_open_ts  := (p_date::timestamp + v_opens_at)  AT TIME ZONE 'UTC';
  v_close_ts := (p_date::timestamp + v_closes_at) AT TIME ZONE 'UTC';
  v_day_start := (p_date::timestamp) AT TIME ZONE 'UTC';
  v_day_end   := v_day_start + INTERVAL '1 day';

  RETURN QUERY
  WITH gen AS (
    SELECT
      s::timestamptz AS s_start,
      (s + (v_duration_minutes || ' minutes')::interval)::timestamptz AS s_end
    FROM generate_series(
      v_open_ts,
      v_close_ts - (v_duration_minutes || ' minutes')::interval,
      (v_duration_minutes || ' minutes')::interval
    ) AS s
  ),
  taken AS (
    SELECT r.slot_start
      FROM public.reservations r
     WHERE r.establishment_id = p_establishment_id
       AND r.status IN ('confirmed', 'pending')
       AND r.slot_start >= v_day_start
       AND r.slot_start <  v_day_end
    UNION
    SELECT b.slot_start
      FROM public.slot_blocks b
     WHERE b.establishment_id = p_establishment_id
       AND b.slot_start >= v_day_start
       AND b.slot_start <  v_day_end
  )
  SELECT
    g.s_start,
    g.s_end,
    NOT EXISTS (SELECT 1 FROM taken t WHERE t.slot_start = g.s_start)
  FROM gen g
  ORDER BY g.s_start;
END;
$$;

COMMENT ON FUNCTION public.get_availability(uuid, date) IS
  'Sprint 4: retorna slots de um dia respeitando business_hours, reservas (confirmed/pending) e slot_blocks. Timezone-naive (UTC) por compatibilidade com app/lib/availability.ts.';

REVOKE ALL ON FUNCTION public.get_availability(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_availability(uuid, date) TO anon, authenticated, service_role;

-- Indices que ajudam a function (idempotentes). Faz binary search por data
-- ao inves de scan completo da tabela.
CREATE INDEX IF NOT EXISTS reservations_establishment_slot_start
  ON public.reservations (establishment_id, slot_start)
  WHERE status IN ('confirmed', 'pending');

CREATE INDEX IF NOT EXISTS slot_blocks_establishment_slot_start
  ON public.slot_blocks (establishment_id, slot_start);

-- Validacao manual apos rodar:
--   SELECT * FROM public.get_availability(
--     '86198aba-e929-4d71-9ef5-88383f7ea730',
--     CURRENT_DATE
--   );
-- Deve retornar 12 linhas (11:00Z a 22:00Z) com available=true salvo onde ha
-- reserva ou bloqueio.
