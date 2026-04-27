-- F.3 (PM revamp 27/04/2026) — capacidade de espaco em PESSOAS.
--
-- Hoje 1 reserva ocupa um slot inteiro. PM quer que multiplas reservas
-- caibam em um mesmo slot ate o limite de pessoas configurado por espaco.
-- Ex: Area externa cap=30. Reserva de 20 → restam 10 vagas. Slot some
-- pra reservas de 11+ pessoas.
--
-- Mudancas idempotentes (CREATE OR REPLACE, IF NOT EXISTS, IF EXISTS):
--   1. establishment_spaces.capacity_pessoas
--   2. reservations.party_size + backfill via regex
--   3. drop UNIQUE (establishment_id, slot_start) — descoberto via pg_catalog
--   4. get_availability_v2(uuid, date, uuid, integer) — mantem v1 vivo
--   5. try_create_reservation(...) com pg_advisory_xact_lock por slot+espaco
--   6. indice em reservations (space_id, slot_start) WHERE status ativo

-- ─────────────────────────────────────────────────────────────────
-- 1. capacity_pessoas em establishment_spaces
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.establishment_spaces
  ADD COLUMN IF NOT EXISTS capacity_pessoas integer NOT NULL DEFAULT 30
  CHECK (capacity_pessoas > 0 AND capacity_pessoas <= 500);

COMMENT ON COLUMN public.establishment_spaces.capacity_pessoas IS
  'Capacidade total de pessoas no espaco. get_availability_v2 soma party_size das reservas ativas no slot e marca disponivel se (taken + nova_reserva) <= capacity.';

-- Capacidades pedidas pelo PM (idempotente — UPDATE so muda se valor mudou)
UPDATE public.establishment_spaces SET capacity_pessoas = 60 WHERE slug = 'salao-central'  AND capacity_pessoas <> 60;
UPDATE public.establishment_spaces SET capacity_pessoas = 30 WHERE slug = 'area-externa'   AND capacity_pessoas <> 30;
UPDATE public.establishment_spaces SET capacity_pessoas = 40 WHERE slug = 'area-verde'     AND capacity_pessoas <> 40;

-- ─────────────────────────────────────────────────────────────────
-- 2. party_size em reservations + backfill
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS party_size integer;

-- Backfill: extrai "pessoas: N" do guest_contact. Se nao bater, fica null
-- (sera setado pra 1 no NOT NULL DEFAULT abaixo).
UPDATE public.reservations
   SET party_size = CAST(substring(guest_contact FROM 'pessoas:\s*(\d+)') AS integer)
 WHERE party_size IS NULL
   AND guest_contact ~ 'pessoas:\s*\d+';

-- Default + NOT NULL pra novas linhas. CHECK valida limite.
ALTER TABLE public.reservations
  ALTER COLUMN party_size SET DEFAULT 1;
UPDATE public.reservations SET party_size = 1 WHERE party_size IS NULL;
ALTER TABLE public.reservations
  ALTER COLUMN party_size SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.reservations'::regclass
       AND conname = 'reservations_party_size_check'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_party_size_check
      CHECK (party_size > 0 AND party_size <= 50);
  END IF;
END $$;

COMMENT ON COLUMN public.reservations.party_size IS
  'Numero de pessoas na reserva. Necessario pra calcular capacidade em get_availability_v2.';

-- ─────────────────────────────────────────────────────────────────
-- 3. Drop UNIQUE (establishment_id, slot_start) — descoberto dinamicamente
-- ─────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_cname text;
BEGIN
  SELECT c.conname INTO v_cname
    FROM pg_constraint c
   WHERE c.conrelid = 'public.reservations'::regclass
     AND c.contype = 'u'
     AND array_length(c.conkey, 1) = 2
     AND EXISTS (
       SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'establishment_id'
     )
     AND EXISTS (
       SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND a.attname = 'slot_start'
     );
  IF v_cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.reservations DROP CONSTRAINT %I', v_cname);
    RAISE NOTICE 'Dropped UNIQUE constraint: %', v_cname;
  ELSE
    RAISE NOTICE 'No UNIQUE on (establishment_id, slot_start) — nada a dropar';
  END IF;
END $$;

-- Indice util pra contagem rapida em try_create_reservation/get_availability_v2.
CREATE INDEX IF NOT EXISTS reservations_space_slot_active
  ON public.reservations (space_id, slot_start)
  WHERE space_id IS NOT NULL AND status IN ('confirmed', 'pending');

-- ─────────────────────────────────────────────────────────────────
-- 4. get_availability_v2 — assinatura nova com space_id + party_size
-- ─────────────────────────────────────────────────────────────────

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

  -- Capacidade do espaco selecionado. Se o espaco nao existir ou estiver
  -- inativo, retorna nada (fluxo nao deveria nem chegar aqui pq a UI ja
  -- filtra is_active=true).
  SELECT capacity_pessoas INTO v_capacity
    FROM public.establishment_spaces
   WHERE id = p_space_id
     AND establishment_id = p_establishment_id
     AND is_active = true
   LIMIT 1;

  IF v_capacity IS NULL THEN
    RETURN;
  END IF;

  -- Igual ao v1: TZ-naive UTC pra preservar slot_starts ja gravados.
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
    -- slot indisponivel se ha bloqueio admin OU se nao cabe a nova reserva
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
  'Sprint F.3: retorna slots de um dia respeitando capacidade do espaco em pessoas. available=true so se (capacity - taken) >= party_size E nao ha slot_block. remaining e a folga atual independente do party_size.';

REVOKE ALL ON FUNCTION public.get_availability_v2(uuid, date, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_availability_v2(uuid, date, uuid, integer) TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────
-- 5. try_create_reservation — insert com advisory lock anti-race
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.try_create_reservation(
  p_tenant_id uuid,
  p_establishment_id uuid,
  p_space_id uuid,
  p_slot_start timestamptz,
  p_slot_end timestamptz,
  p_guest_name text,
  p_guest_contact text,
  p_status text,
  p_source text,
  p_user_id uuid,
  p_party_size integer
)
RETURNS TABLE (
  ok boolean,
  reservation_id uuid,
  error_code text,
  remaining_pessoas integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capacity integer;
  v_taken integer;
  v_remaining integer;
  v_id uuid;
  v_lock_key bigint;
BEGIN
  -- Lock por slot+espaco. Dois requests concorrentes pro mesmo slot+espaco
  -- serializam. O lock e liberado no commit/rollback da transacao.
  v_lock_key := hashtextextended(p_space_id::text || ':' || p_slot_start::text, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Capacidade do espaco
  SELECT capacity_pessoas INTO v_capacity
    FROM public.establishment_spaces
   WHERE id = p_space_id
     AND establishment_id = p_establishment_id
     AND is_active = true
   LIMIT 1;

  IF v_capacity IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'space_not_found'::text, NULL::integer;
    RETURN;
  END IF;

  -- Bloqueio admin ganha sempre
  IF EXISTS (
    SELECT 1 FROM public.slot_blocks
     WHERE establishment_id = p_establishment_id
       AND slot_start = p_slot_start
  ) THEN
    RETURN QUERY SELECT false, NULL::uuid, 'slot_blocked'::text, 0::integer;
    RETURN;
  END IF;

  -- Soma pessoas ja reservadas nesse slot + espaco
  SELECT COALESCE(SUM(party_size), 0) INTO v_taken
    FROM public.reservations
   WHERE establishment_id = p_establishment_id
     AND space_id = p_space_id
     AND slot_start = p_slot_start
     AND status IN ('confirmed', 'pending');

  v_remaining := v_capacity - v_taken;

  IF v_remaining < p_party_size THEN
    RETURN QUERY SELECT false, NULL::uuid, 'over_capacity'::text, v_remaining;
    RETURN;
  END IF;

  -- Insert e captura do id
  INSERT INTO public.reservations (
    tenant_id, establishment_id, slot_start, slot_end, guest_name,
    guest_contact, status, source, space_id, user_id, party_size
  ) VALUES (
    p_tenant_id, p_establishment_id, p_slot_start, p_slot_end, p_guest_name,
    p_guest_contact, p_status, p_source, p_space_id, p_user_id, p_party_size
  ) RETURNING id INTO v_id;

  RETURN QUERY SELECT true, v_id, NULL::text, (v_remaining - p_party_size);
END;
$$;

COMMENT ON FUNCTION public.try_create_reservation IS
  'Sprint F.3: cria reserva com advisory lock por (space_id, slot_start). Retorna ok=false + error_code in (over_capacity, slot_blocked, space_not_found) sem inserir. error_code=NULL significa sucesso.';

REVOKE ALL ON FUNCTION public.try_create_reservation FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_create_reservation TO service_role;

-- ─────────────────────────────────────────────────────────────────
-- Validacao
-- ─────────────────────────────────────────────────────────────────

-- Capacidades dos 3 espacos novos
SELECT name, slug, capacity_pessoas, is_active
  FROM public.establishment_spaces
 WHERE establishment_id = '86198aba-e929-4d71-9ef5-88383f7ea730'
 ORDER BY is_active DESC, sort_order;

-- party_size das reservas existentes
SELECT count(*) AS total_reservations,
       count(party_size) AS with_party_size,
       max(party_size) AS max_party,
       min(party_size) AS min_party
  FROM public.reservations
 WHERE establishment_id = '86198aba-e929-4d71-9ef5-88383f7ea730';

-- Smoke da funcao nova: Salao central, hoje, 5 pessoas
SELECT * FROM public.get_availability_v2(
  '86198aba-e929-4d71-9ef5-88383f7ea730',
  CURRENT_DATE,
  (SELECT id FROM public.establishment_spaces
    WHERE establishment_id = '86198aba-e929-4d71-9ef5-88383f7ea730'
      AND slug = 'salao-central' LIMIT 1),
  5
);
