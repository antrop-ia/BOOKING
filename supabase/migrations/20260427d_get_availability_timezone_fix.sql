-- Fase 0 (27/04/2026) — fix do bug de timezone em get_availability_v2.
--
-- Bug: a v1 da funcao interpretava business_hours.opens_at e closes_at
-- em UTC. Resultado: opens_at='11:00' gerava slot 11:00Z (= 08:00 BR).
-- Cliente em browser BR via os primeiros slots do almoco como 08:00,
-- e os ultimos do jantar so iam ate 19:00 BR (em vez de 22:00 BR).
--
-- Fix: ler establishments.timezone e usar `(p_date + opens_at) AT TIME
-- ZONE est.timezone`. Slot 11:00 BR vira 14:00Z. Slot 22:00 BR vira
-- 01:00Z (proximo dia UTC). Cliente BR vê o que o restaurante configurou.
--
-- Reservas existentes ja gravadas em UTC representam o slot que o
-- browser BR exibia. Apos o fix, novos slots gerados continuam batendo
-- com os slot_starts antigos quando o horario "BR" coincide. Reservas
-- em horarios fora da grade nova (ex 11:00Z = 08:00 BR) ficam orfas
-- mas nao quebram — apenas nao aparecem em /admin nem em consulta
-- de disponibilidade.
--
-- Idempotente: CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.get_availability_v2(
  p_establishment_id uuid,
  p_date date,
  p_space_id uuid,
  p_party_size integer
)
RETURNS TABLE (
  slot_start timestamptz,
  slot_end timestamptz,
  available boolean,
  remaining_pessoas integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz text;
  v_weekday smallint;
  v_opens_at time;
  v_closes_at time;
  v_duration_minutes integer;
  v_capacity integer;
  v_open_ts timestamptz;
  v_close_ts timestamptz;
  v_day_start timestamptz;
  v_day_end timestamptz;
BEGIN
  -- Pega timezone do establishment (default America/Recife se null).
  SELECT COALESCE(timezone, 'America/Recife')
    INTO v_tz
    FROM public.establishments
   WHERE id = p_establishment_id
   LIMIT 1;

  IF v_tz IS NULL THEN
    RETURN;
  END IF;

  -- Weekday do p_date interpretado como dia local. EXTRACT(DOW FROM date)
  -- nao depende de timezone — date ja e um dia calendario.
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

  -- Capacidade do espaco selecionado.
  SELECT capacity_pessoas INTO v_capacity
    FROM public.establishment_spaces
   WHERE id = p_space_id
     AND establishment_id = p_establishment_id
     AND is_active = true
   LIMIT 1;

  IF v_capacity IS NULL THEN
    RETURN;
  END IF;

  -- Interpreta opens_at/closes_at como hora LOCAL do estabelecimento.
  -- (date + time) AT TIME ZONE 'America/Recife' devolve timestamptz UTC
  -- correto. Ex: ('2026-05-01' + '11:00:00') AT TIME ZONE 'America/Recife'
  -- = '2026-05-01 14:00:00+00'.
  v_open_ts  := (p_date::timestamp + v_opens_at)  AT TIME ZONE v_tz;
  v_close_ts := (p_date::timestamp + v_closes_at) AT TIME ZONE v_tz;

  -- day_start e day_end usados pra filtrar reservas/blocks do dia local.
  v_day_start := (p_date::timestamp) AT TIME ZONE v_tz;
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
  taken_per_slot AS (
    SELECT r.slot_start, COALESCE(SUM(r.party_size), 0) AS total_taken
      FROM public.reservations r
     WHERE r.establishment_id = p_establishment_id
       AND r.space_id = p_space_id
       AND r.status IN ('confirmed', 'pending')
       AND r.slot_start >= v_day_start
       AND r.slot_start <  v_day_end
     GROUP BY r.slot_start
  ),
  blocks AS (
    SELECT b.slot_start
      FROM public.slot_blocks b
     WHERE b.establishment_id = p_establishment_id
       AND b.slot_start >= v_day_start
       AND b.slot_start <  v_day_end
  )
  SELECT
    g.s_start,
    g.s_end,
    NOT EXISTS (SELECT 1 FROM blocks bl WHERE bl.slot_start = g.s_start)
      AND (v_capacity - COALESCE((SELECT total_taken FROM taken_per_slot t WHERE t.slot_start = g.s_start), 0)) >= p_party_size
      AS is_available,
    GREATEST(0, v_capacity - COALESCE((SELECT total_taken FROM taken_per_slot t WHERE t.slot_start = g.s_start), 0))::integer
      AS remaining
  FROM gen g
  ORDER BY g.s_start;
END;
$$;

COMMENT ON FUNCTION public.get_availability_v2(uuid, date, uuid, integer) IS
  'Sprint F.3 + timezone fix (27/04/2026): retorna slots respeitando capacidade do espaco em pessoas E timezone do estabelecimento (opens_at/closes_at sao hora local). Default America/Recife.';

-- Validacao apos rodar:
-- SELECT slot_start, slot_end, available, remaining_pessoas FROM
--   public.get_availability_v2(
--     '86198aba-e929-4d71-9ef5-88383f7ea730',
--     CURRENT_DATE,
--     (SELECT id FROM establishment_spaces WHERE slug='salao-central'),
--     1
--   );
-- Esperado em 2026-04-28: slot_start = '2026-04-28 14:00:00+00' (= 11:00
-- BR) ate '2026-04-29 01:00:00+00' (= 22:00 BR), 12 slots de 1h.
