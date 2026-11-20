-- ============================================================
-- Sistema OBA — Regulamento Oficial & Motor de Chaveamento (004)
-- Temporadas anuais, categorias (semanal/oficial), formatos OBA,
-- desempate por Finishes, partida extra de liderança e Top Cut.
-- ============================================================

-- ─── A. Tabela: seasons (Temporadas Anuais) ──────────────────
CREATE TABLE IF NOT EXISTS public.seasons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year        INTEGER UNIQUE NOT NULL CHECK (year >= 2020 AND year <= 2100),
  name        TEXT NOT NULL,
  starts_at   DATE NOT NULL,
  ends_at     DATE NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT seasons_valid_dates CHECK (ends_at >= starts_at)
);

COMMENT ON TABLE public.seasons IS 'Temporadas anuais do ranking oficial da liga OBA.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_single_active
  ON public.seasons (is_active)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS seasons_updated_at ON public.seasons;
CREATE TRIGGER seasons_updated_at
  BEFORE UPDATE ON public.seasons
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed idempotente das temporadas já presentes em torneios + Temporada 2026
INSERT INTO public.seasons (year, name, starts_at, ends_at, is_active)
SELECT DISTINCT
  EXTRACT(YEAR FROM event_date)::INTEGER AS yr,
  'Temporada ' || EXTRACT(YEAR FROM event_date)::INTEGER AS name,
  make_date(EXTRACT(YEAR FROM event_date)::INTEGER, 1, 1) AS starts_at,
  make_date(EXTRACT(YEAR FROM event_date)::INTEGER, 12, 31) AS ends_at,
  false AS is_active
FROM public.tournaments
WHERE event_date IS NOT NULL
ON CONFLICT (year) DO NOTHING;

INSERT INTO public.seasons (year, name, starts_at, ends_at, is_active)
VALUES (2026, 'Temporada 2026', '2026-01-01', '2026-12-31', false)
ON CONFLICT (year) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.seasons WHERE is_active = true) THEN
    UPDATE public.seasons
    SET is_active = true
    WHERE year = 2026;
  END IF;
END $$;

-- ─── B. Alterações em public.tournaments ─────────────────────
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'semanal',
  ADD COLUMN IF NOT EXISTS swiss_rounds INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS top_cut_size INTEGER;

DO $$
DECLARE
  c_name TEXT;
BEGIN
  -- Remove constraint antiga de format (se existir) para permitir swiss_top_cut e swiss_only
  FOR c_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.tournaments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%format%'
  LOOP
    EXECUTE format('ALTER TABLE public.tournaments DROP CONSTRAINT %I', c_name);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tournaments_format_check'
      AND conrelid = 'public.tournaments'::regclass
  ) THEN
    ALTER TABLE public.tournaments
      ADD CONSTRAINT tournaments_format_check
      CHECK (format IN ('swiss_top_cut', 'swiss_only', 'swiss', 'single_elim', 'double_elim'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tournaments_category_check'
      AND conrelid = 'public.tournaments'::regclass
  ) THEN
    ALTER TABLE public.tournaments
      ADD CONSTRAINT tournaments_category_check
      CHECK (category IN ('semanal', 'oficial'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tournaments_swiss_rounds_check'
      AND conrelid = 'public.tournaments'::regclass
  ) THEN
    ALTER TABLE public.tournaments
      ADD CONSTRAINT tournaments_swiss_rounds_check
      CHECK (swiss_rounds >= 1 AND swiss_rounds <= 10);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tournaments_top_cut_size_check'
      AND conrelid = 'public.tournaments'::regclass
  ) THEN
    ALTER TABLE public.tournaments
      ADD CONSTRAINT tournaments_top_cut_size_check
      CHECK (top_cut_size IS NULL OR top_cut_size IN (4, 8, 16));
  END IF;
END $$;

ALTER TABLE public.tournaments
  ALTER COLUMN format SET DEFAULT 'swiss_top_cut';

-- Backfill season_id nos torneios existentes
UPDATE public.tournaments t
SET season_id = COALESCE(
  (
    SELECT s.id
    FROM public.seasons s
    WHERE s.year = EXTRACT(YEAR FROM t.event_date)::INTEGER
    LIMIT 1
  ),
  (
    SELECT s.id
    FROM public.seasons s
    WHERE s.is_active = true
    LIMIT 1
  )
)
WHERE t.season_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_tournaments_season
  ON public.tournaments (season_id);

-- ─── C. Tabela: tournament_participants ──────────────────────
CREATE TABLE IF NOT EXISTS public.tournament_participants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  blader_id      UUID NOT NULL REFERENCES public.bladers(id) ON DELETE CASCADE,
  seed           INTEGER,
  is_dropped     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, blader_id)
);

COMMENT ON TABLE public.tournament_participants IS 'Competidores inscritos/confirmados em cada torneio para o motor de chaveamento.';

CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament
  ON public.tournament_participants (tournament_id);

CREATE INDEX IF NOT EXISTS idx_tournament_participants_blader
  ON public.tournament_participants (blader_id);

-- ─── D. Alterações em public.matches ─────────────────────────
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS is_tiebreaker BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS next_match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_match_slot INTEGER,
  ADD COLUMN IF NOT EXISTS loser_next_match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS loser_next_match_slot INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'matches_next_match_slot_check'
      AND conrelid = 'public.matches'::regclass
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_next_match_slot_check
      CHECK (next_match_slot IS NULL OR next_match_slot IN (1, 2));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'matches_loser_next_match_slot_check'
      AND conrelid = 'public.matches'::regclass
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_loser_next_match_slot_check
      CHECK (loser_next_match_slot IS NULL OR loser_next_match_slot IN (1, 2));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matches_tiebreaker
  ON public.matches (tournament_id, stage, is_tiebreaker);

CREATE INDEX IF NOT EXISTS idx_matches_next_match
  ON public.matches (next_match_id);

-- ─── E. Alterações em public.tournament_results ──────────────
ALTER TABLE public.tournament_results
  ADD COLUMN IF NOT EXISTS swiss_wins INTEGER NOT NULL DEFAULT 0 CHECK (swiss_wins >= 0),
  ADD COLUMN IF NOT EXISTS swiss_points INTEGER NOT NULL DEFAULT 0 CHECK (swiss_points >= 0),
  ADD COLUMN IF NOT EXISTS is_swiss_leader BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS swiss_leader_bonus INTEGER NOT NULL DEFAULT 0 CHECK (swiss_leader_bonus >= 0),
  ADD COLUMN IF NOT EXISTS podium_points INTEGER NOT NULL DEFAULT 0 CHECK (podium_points >= 0);

-- ─── F. Alterações em public.ranking (Multi-Temporada OBA) ───
ALTER TABLE public.ranking
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS swiss_wins INTEGER NOT NULL DEFAULT 0 CHECK (swiss_wins >= 0),
  ADD COLUMN IF NOT EXISTS podiums_count INTEGER NOT NULL DEFAULT 0 CHECK (podiums_count >= 0),
  ADD COLUMN IF NOT EXISTS first_places INTEGER NOT NULL DEFAULT 0 CHECK (first_places >= 0),
  ADD COLUMN IF NOT EXISTS second_places INTEGER NOT NULL DEFAULT 0 CHECK (second_places >= 0),
  ADD COLUMN IF NOT EXISTS third_places INTEGER NOT NULL DEFAULT 0 CHECK (third_places >= 0),
  ADD COLUMN IF NOT EXISTS best_podium INTEGER CHECK (best_podium IS NULL OR best_podium IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.ranking r
SET
  season_id = COALESCE(
    r.season_id,
    (SELECT id FROM public.seasons WHERE is_active = true LIMIT 1),
    (SELECT id FROM public.seasons ORDER BY year DESC LIMIT 1)
  ),
  best_podium = CASE
    WHEN r.best_podium IS NOT NULL THEN r.best_podium
    WHEN r.best_position IN (1, 2, 3) THEN r.best_position
    ELSE NULL
  END,
  created_at = COALESCE(
    (SELECT b.created_at FROM public.bladers b WHERE b.id = r.blader_id),
    r.created_at,
    r.updated_at,
    now()
  )
WHERE r.season_id IS NULL;

ALTER TABLE public.ranking
  ALTER COLUMN season_id SET NOT NULL;

DO $$
DECLARE
  blader_attnum SMALLINT;
  u_name TEXT;
BEGIN
  SELECT attnum INTO blader_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.ranking'::regclass
    AND attname = 'blader_id';

  FOR u_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.ranking'::regclass
      AND contype = 'u'
      AND conkey = ARRAY[blader_attnum]
  LOOP
    EXECUTE format('ALTER TABLE public.ranking DROP CONSTRAINT %I', u_name);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ranking_season_blader_unique'
      AND conrelid = 'public.ranking'::regclass
  ) THEN
    ALTER TABLE public.ranking
      ADD CONSTRAINT ranking_season_blader_unique UNIQUE (season_id, blader_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ranking_season_oba_order
  ON public.ranking (
    season_id,
    total_points DESC,
    best_podium ASC NULLS LAST,
    podiums_count DESC,
    swiss_wins DESC,
    created_at ASC
  );

-- ─── G. Permissões (GRANTs), RLS & Realtime ──────────────────
GRANT ALL ON public.seasons, public.tournament_participants
  TO postgres, anon, authenticated, service_role;

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public can read seasons" ON public.seasons;
CREATE POLICY "public can read seasons"
  ON public.seasons FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin full access seasons" ON public.seasons;
CREATE POLICY "admin full access seasons"
  ON public.seasons FOR ALL
  USING (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin');

DROP POLICY IF EXISTS "public can read tournament_participants" ON public.tournament_participants;
CREATE POLICY "public can read tournament_participants"
  ON public.tournament_participants FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin full access tournament_participants" ON public.tournament_participants;
CREATE POLICY "admin full access tournament_participants"
  ON public.tournament_participants FOR ALL
  USING (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin');

ALTER TABLE public.seasons REPLICA IDENTITY FULL;
ALTER TABLE public.tournament_participants REPLICA IDENTITY FULL;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY ARRAY['seasons', 'tournament_participants']
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      END IF;
    END LOOP;
  END IF;
END $$;
