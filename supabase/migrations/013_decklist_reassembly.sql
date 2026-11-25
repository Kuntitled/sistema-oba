-- ============================================================
-- Sistema OBA — Remontagem de Combos Entre Rodadas (013)
-- Migration idempotente para execução no Supabase SQL Editor.
-- ============================================================

-- ─── 1. Pool imutável de peças originais da inscrição ────────────────────────
ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS original_part_ids UUID[];

COMMENT ON COLUMN public.tournament_registrations.original_part_ids IS
  'Multiset imutável das peças originalmente cadastradas na inscrição aprovada para este torneio (preserva quantidade de cópias).';

-- ─── 2. Versionamento de combos sem quebrar histórico de match_games ─────────
ALTER TABLE public.registration_combos
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.registration_combos.is_active IS
  'Indica se este combo faz parte da montagem ativa atual do Blader no torneio (false = versão anterior preservada para histórico de rounds).';

DO $$
DECLARE
  c_name TEXT;
BEGIN
  -- Remove constraint UNIQUE(registration_id, slot_number) antiga para permitir versionamento por slot
  FOR c_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.registration_combos'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.registration_combos DROP CONSTRAINT %I', c_name);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_registration_combos_active_slot
  ON public.registration_combos (registration_id, slot_number)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_registration_combos_reg_active
  ON public.registration_combos (registration_id, is_active);

-- ─── 3. Backfill idempotente do pool original para inscrições já aprovadas ───
UPDATE public.tournament_registrations tr
SET original_part_ids = (
  SELECT COALESCE(array_agg(part_id), ARRAY[]::UUID[])
  FROM (
    SELECT unnest(
      ARRAY_REMOVE(
        ARRAY[
          rc.lock_chip_id,
          rc.over_blade_id,
          rc.blade_id,
          rc.assist_blade_id,
          rc.ratchet_id,
          rc.bit_id
        ],
        NULL
      )
    ) AS part_id
    FROM public.registration_combos rc
    WHERE rc.registration_id = tr.id
      AND rc.is_active = true
    ORDER BY rc.slot_number ASC
  ) parts_sub
)
WHERE tr.status = 'approved'
  AND tr.original_part_ids IS NULL;
