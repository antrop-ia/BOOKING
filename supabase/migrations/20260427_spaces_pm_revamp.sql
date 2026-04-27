-- F.1 (PM revamp 27/04/2026) — espacos pedidos pelo PM:
--   Salao central, Area externa, Area verde (coberta).
--
-- Mantem as 5 reservas atuais funcionando: os 2 espacos antigos (Salao interno,
-- Varanda externa) ficam com is_active=false em vez de delete, entao reservas
-- existentes continuam mostrando o nome certo na ficha.
--
-- Idempotente: UPDATE filtrado por nome + ON CONFLICT/UPDATE no INSERT.

DO $$
DECLARE
  v_establishment_id uuid := '86198aba-e929-4d71-9ef5-88383f7ea730';
BEGIN
  -- 1. Inativa os antigos (so se ainda estiverem ativos)
  UPDATE public.establishment_spaces
     SET is_active = false
   WHERE establishment_id = v_establishment_id
     AND name IN ('Salão interno', 'Varanda externa', 'Salao interno', 'Varanda Externa');

  -- 2. Insere os 3 novos pedidos pelo PM. Slug e estavel (idempotente via UNIQUE).
  --    capacity_pessoas e usado pelo F.3 (capacidade por pessoas) — ja deixo
  --    semeado pra evitar uma 2a migration.
  INSERT INTO public.establishment_spaces
    (establishment_id, name, slug, icon, description, sort_order, is_active)
  VALUES
    (v_establishment_id, 'Salão central',         'salao-central', '🏛️', 'Coracao do restaurante, mesas tradicionais.', 0, true),
    (v_establishment_id, 'Área externa',          'area-externa',  '☀️', 'Mesas ao ar livre, ideal pra dias amenos.',   1, true),
    (v_establishment_id, 'Área verde (coberta)',  'area-verde',    '🌿', 'Coberta, com plantas, sensacao de frescor.',  2, true)
  ON CONFLICT (establishment_id, slug) DO UPDATE
    SET name = EXCLUDED.name,
        icon = EXCLUDED.icon,
        description = EXCLUDED.description,
        sort_order = EXCLUDED.sort_order,
        is_active = true;
END $$;

-- Validacao: deve retornar 5 espacos (2 inativos antigos + 3 ativos novos)
SELECT name, slug, is_active, sort_order
  FROM public.establishment_spaces
 WHERE establishment_id = '86198aba-e929-4d71-9ef5-88383f7ea730'
 ORDER BY is_active DESC, sort_order;
