-- ============================================================
-- Sistema OBA — Schema da Fase 2 (Torneios ao Vivo & Arenas)
-- Aplique via: Supabase SQL Editor ou supabase db push
-- ============================================================

-- ─── Tabela: arenas ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.arenas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id    UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  display_order    INTEGER NOT NULL DEFAULT 1 CHECK (display_order > 0),
  status           TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_match', 'maintenance')),
  current_match_id UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, name)
);

COMMENT ON TABLE public.arenas IS 'Arenas físicas (Beystadiums) alocadas por torneio durante o evento.';

-- ─── Tabela: matches ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.matches (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  arena_id       UUID REFERENCES public.arenas(id) ON DELETE SET NULL,
  round          INTEGER NOT NULL DEFAULT 1 CHECK (round > 0),
  match_number   INTEGER NOT NULL DEFAULT 1 CHECK (match_number > 0),
  stage          TEXT NOT NULL DEFAULT 'swiss' CHECK (stage IN ('swiss', 'top_cut')),
  bracket_label  TEXT,
  player1_id     UUID REFERENCES public.bladers(id) ON DELETE SET NULL,
  player2_id     UUID REFERENCES public.bladers(id) ON DELETE SET NULL,
  player1_score  INTEGER NOT NULL DEFAULT 0 CHECK (player1_score >= 0),
  player2_score  INTEGER NOT NULL DEFAULT 0 CHECK (player2_score >= 0),
  target_score   INTEGER NOT NULL DEFAULT 4 CHECK (target_score > 0),
  winner_id      UUID REFERENCES public.bladers(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'finished', 'cancelled')),
  is_bye         BOOLEAN NOT NULL DEFAULT false,
  started_at     TIMESTAMPTZ,
  finished_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT matches_distinct_players CHECK (
    player1_id IS NULL OR player2_id IS NULL OR player1_id <> player2_id
  ),
  CONSTRAINT matches_valid_winner CHECK (
    winner_id IS NULL OR winner_id = player1_id OR winner_id = player2_id
  )
);

COMMENT ON TABLE public.matches IS 'Partidas oficiais de torneio (Fase Suíça ou Top Cut Mata-mata).';

-- FK circular: arenas.current_match_id -> matches.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'arenas_current_match_id_fkey'
      AND conrelid = 'public.arenas'::regclass
  ) THEN
    ALTER TABLE public.arenas
      ADD CONSTRAINT arenas_current_match_id_fkey
      FOREIGN KEY (current_match_id)
      REFERENCES public.matches(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ─── Tabela: match_games (lance a lance) ──────────────────────
CREATE TABLE IF NOT EXISTS public.match_games (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id          UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  round_number      INTEGER NOT NULL CHECK (round_number > 0),
  scoring_player_id UUID REFERENCES public.bladers(id) ON DELETE SET NULL,
  finish_type       TEXT NOT NULL CHECK (finish_type IN ('spin', 'over', 'burst', 'xtreme', 'draw')),
  points_awarded    INTEGER NOT NULL CHECK (points_awarded >= 0 AND points_awarded <= 3),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(match_id, round_number),
  CONSTRAINT match_games_valid_finish_points CHECK (
    (finish_type = 'draw' AND points_awarded = 0)
    OR (finish_type <> 'draw' AND scoring_player_id IS NOT NULL AND points_awarded > 0)
  )
);

COMMENT ON TABLE public.match_games IS 'Histórico lance a lance de cada batalha dentro de uma partida Beyblade X.';

-- ─── Triggers de updated_at ──────────────────────────────────
DROP TRIGGER IF EXISTS arenas_updated_at ON public.arenas;
CREATE TRIGGER arenas_updated_at
  BEFORE UPDATE ON public.arenas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS matches_updated_at ON public.matches;
CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── Índices de performance ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_arenas_tournament
  ON public.arenas (tournament_id);

CREATE INDEX IF NOT EXISTS idx_arenas_status
  ON public.arenas (tournament_id, status);

CREATE INDEX IF NOT EXISTS idx_matches_tournament_stage_round
  ON public.matches (tournament_id, stage, round, match_number);

CREATE INDEX IF NOT EXISTS idx_matches_arena
  ON public.matches (arena_id);

CREATE INDEX IF NOT EXISTS idx_matches_status
  ON public.matches (tournament_id, status);

CREATE INDEX IF NOT EXISTS idx_matches_player1
  ON public.matches (player1_id);

CREATE INDEX IF NOT EXISTS idx_matches_player2
  ON public.matches (player2_id);

CREATE INDEX IF NOT EXISTS idx_match_games_match_round
  ON public.match_games (match_id, round_number);

-- ─── Permissões de Schema/Tabela (GRANTs) ────────────────────
GRANT ALL ON public.arenas, public.matches, public.match_games
  TO postgres, anon, authenticated, service_role;

-- ─── RLS (Row Level Security) ────────────────────────────────
ALTER TABLE public.arenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_games ENABLE ROW LEVEL SECURITY;

-- Leitura pública irrestrita (vitrine ao vivo, telão e Realtime)
DROP POLICY IF EXISTS "public can read arenas" ON public.arenas;
CREATE POLICY "public can read arenas"
  ON public.arenas FOR SELECT USING (true);

DROP POLICY IF EXISTS "public can read matches" ON public.matches;
CREATE POLICY "public can read matches"
  ON public.matches FOR SELECT USING (true);

DROP POLICY IF EXISTS "public can read match_games" ON public.match_games;
CREATE POLICY "public can read match_games"
  ON public.match_games FOR SELECT USING (true);

-- Acesso total para administradores
DROP POLICY IF EXISTS "admin full access arenas" ON public.arenas;
CREATE POLICY "admin full access arenas"
  ON public.arenas FOR ALL
  USING (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin');

DROP POLICY IF EXISTS "admin full access matches" ON public.matches;
CREATE POLICY "admin full access matches"
  ON public.matches FOR ALL
  USING (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin');

DROP POLICY IF EXISTS "admin full access match_games" ON public.match_games;
CREATE POLICY "admin full access match_games"
  ON public.match_games FOR ALL
  USING (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin');

-- Acesso operacional preparatório para Juízes (Fase 3)
DROP POLICY IF EXISTS "judge can update arenas" ON public.arenas;
CREATE POLICY "judge can update arenas"
  ON public.arenas FOR UPDATE
  USING (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'judge')
  WITH CHECK (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'judge');

DROP POLICY IF EXISTS "judge can update matches" ON public.matches;
CREATE POLICY "judge can update matches"
  ON public.matches FOR UPDATE
  USING (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'judge')
  WITH CHECK (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'judge');

DROP POLICY IF EXISTS "judge can insert match_games" ON public.match_games;
CREATE POLICY "judge can insert match_games"
  ON public.match_games FOR INSERT
  WITH CHECK (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'judge');

DROP POLICY IF EXISTS "judge can delete match_games" ON public.match_games;
CREATE POLICY "judge can delete match_games"
  ON public.match_games FOR DELETE
  USING (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'judge');

-- ─── Supabase Realtime ───────────────────────────────────────
ALTER TABLE public.arenas REPLICA IDENTITY FULL;
ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.match_games REPLICA IDENTITY FULL;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY ARRAY['arenas', 'matches', 'match_games']
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
