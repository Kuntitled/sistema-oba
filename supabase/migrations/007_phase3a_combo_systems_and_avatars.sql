-- ============================================================
-- Sistema OBA — Etapa 3A.5: Unificação de Vagas, Sistemas BX/UX/CX (+Expand) & Avatares (007)
-- Migration idempotente para execução no Supabase SQL Editor.
-- ============================================================

-- ─── 1. Unificação de vagas em public.tournaments (max_participants -> max_players) ───
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tournaments'
      AND column_name = 'max_participants'
  ) THEN
    UPDATE public.tournaments
    SET max_players = max_participants
    WHERE max_players IS NULL
      AND max_participants IS NOT NULL;

    ALTER TABLE public.tournaments
      DROP CONSTRAINT IF EXISTS tournaments_max_participants_check;

    ALTER TABLE public.tournaments
      DROP COLUMN IF EXISTS max_participants;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tournaments_max_players_check'
      AND conrelid = 'public.tournaments'::regclass
  ) THEN
    ALTER TABLE public.tournaments
      ADD CONSTRAINT tournaments_max_players_check
      CHECK (max_players IS NULL OR max_players > 0);
  END IF;
END $$;

-- ─── 2. Expandir public.parts_catalog para 8 tipos, 6 sistemas (+ NULL universal) e regras ───
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.parts_catalog'::regclass
      AND contype = 'c'
      AND (
        pg_get_constraintdef(oid) ILIKE '%part_type%'
        OR pg_get_constraintdef(oid) ILIKE '%line%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.parts_catalog DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.parts_catalog
  ALTER COLUMN line DROP NOT NULL,
  ALTER COLUMN line DROP DEFAULT;

ALTER TABLE public.parts_catalog
  ADD CONSTRAINT parts_catalog_part_type_check
  CHECK (
    part_type IN (
      'blade',
      'main_blade',
      'metal_blade',
      'over_blade',
      'lock_chip',
      'assist_blade',
      'ratchet',
      'bit'
    )
  );

ALTER TABLE public.parts_catalog
  ADD CONSTRAINT parts_catalog_line_check
  CHECK (
    line IS NULL
    OR line IN ('BX', 'BXE', 'UX', 'UXE', 'CX', 'CXE')
  );

ALTER TABLE public.parts_catalog
  ADD COLUMN IF NOT EXISTS is_simple_ratchet BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_simple_ratchet BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocks_bit BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.parts_catalog.is_simple_ratchet IS 'Ratchets Simples com O-type joint (nome terminado em 5, ex: 9-65, 4-55, 3-85).';
COMMENT ON COLUMN public.parts_catalog.requires_simple_ratchet IS 'Blades que aceitam exclusivamente Ratchets Simples (ex: ClockMirage).';
COMMENT ON COLUMN public.parts_catalog.blocks_bit IS 'Ratchets compostas/integradas que bloqueiam seleção de Bit separada (ex: Operate, Turbo).';

-- ─── 3. Atualizar colunas de Combo Favorito em public.bladers ─────────────────
ALTER TABLE public.bladers
  ADD COLUMN IF NOT EXISTS favorite_system TEXT,
  ADD COLUMN IF NOT EXISTS favorite_lock_chip_id UUID REFERENCES public.parts_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS favorite_over_blade_id UUID REFERENCES public.parts_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS favorite_assist_blade_id UUID REFERENCES public.parts_catalog(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bladers_favorite_system_check'
      AND conrelid = 'public.bladers'::regclass
  ) THEN
    ALTER TABLE public.bladers
      ADD CONSTRAINT bladers_favorite_system_check
      CHECK (
        favorite_system IS NULL
        OR favorite_system IN ('BX', 'BXE', 'UX', 'UXE', 'CX', 'CXE')
      );
  END IF;
END $$;

-- Backfill seguro de favorite_system quando já houver favorite_blade_id preenchido
UPDATE public.bladers b
SET favorite_system = p.line
FROM public.parts_catalog p
WHERE b.favorite_blade_id = p.id
  AND b.favorite_system IS NULL
  AND p.line IN ('BX', 'BXE', 'UX', 'UXE', 'CX', 'CXE');

-- ─── 4. Atualizar public.registration_combos (preparo Etapa 3B) ──────────────
ALTER TABLE public.registration_combos
  ADD COLUMN IF NOT EXISTS system TEXT,
  ADD COLUMN IF NOT EXISTS over_blade_id UUID REFERENCES public.parts_catalog(id) ON DELETE SET NULL;

ALTER TABLE public.registration_combos
  ALTER COLUMN ratchet_id DROP NOT NULL,
  ALTER COLUMN bit_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'registration_combos_system_check'
      AND conrelid = 'public.registration_combos'::regclass
  ) THEN
    ALTER TABLE public.registration_combos
      ADD CONSTRAINT registration_combos_system_check
      CHECK (
        system IS NULL
        OR system IN ('BX', 'BXE', 'UX', 'UXE', 'CX', 'CXE')
      );
  END IF;
END $$;

-- ─── 5. Storage Bucket 'avatars' & RLS Policies ─────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  524288,
  ARRAY['image/webp', 'image/jpeg', 'image/png']::TEXT[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "public can read avatars" ON storage.objects;
CREATE POLICY "public can read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "user can upload own avatar" ON storage.objects;
CREATE POLICY "user can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND name = auth.uid()::text || '/avatar.webp'
  );

DROP POLICY IF EXISTS "user can update own avatar" ON storage.objects;
CREATE POLICY "user can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND name = auth.uid()::text || '/avatar.webp'
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND name = auth.uid()::text || '/avatar.webp'
  );

DROP POLICY IF EXISTS "user can delete own avatar" ON storage.objects;
CREATE POLICY "user can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND name = auth.uid()::text || '/avatar.webp'
  );
