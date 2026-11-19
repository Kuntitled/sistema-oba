-- ============================================================
-- Sistema OBA — Schema da Fase 1 (MVP)
-- Aplique via: Supabase SQL Editor ou supabase db push
-- ============================================================

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Tabela: bladers ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bladers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  nickname    TEXT UNIQUE NOT NULL,
  city        TEXT,
  avatar_url  TEXT,
  bio         TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bladers IS 'Perfis dos jogadores (Bladers) da liga OBA.';

-- ─── Tabela: tournaments ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tournaments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  location    TEXT,
  event_date  DATE NOT NULL,
  format      TEXT NOT NULL CHECK (format IN ('swiss', 'single_elim', 'double_elim')),
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'ongoing', 'finished')),
  max_players INTEGER,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tournaments IS 'Torneios da liga OBA.';

-- ─── Tabela: tournament_results ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.tournament_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  blader_id       UUID NOT NULL REFERENCES public.bladers(id) ON DELETE CASCADE,
  final_position  INTEGER NOT NULL CHECK (final_position > 0),
  points_earned   INTEGER NOT NULL DEFAULT 0 CHECK (points_earned >= 0),
  UNIQUE(tournament_id, blader_id),
  UNIQUE(tournament_id, final_position)
);

COMMENT ON TABLE public.tournament_results IS 'Resultados finais por torneio (posição e pontos de ranking ganhos).';

-- ─── Tabela: ranking ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ranking (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blader_id          UUID NOT NULL UNIQUE REFERENCES public.bladers(id) ON DELETE CASCADE,
  total_points       INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  tournaments_played INTEGER NOT NULL DEFAULT 0 CHECK (tournaments_played >= 0),
  best_position      INTEGER CHECK (best_position > 0),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ranking IS 'Ranking acumulado geral da liga por Blader.';

-- ─── Função: atualiza updated_at automaticamente ─────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at
CREATE TRIGGER bladers_updated_at
  BEFORE UPDATE ON public.bladers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── RLS (Row Level Security) ────────────────────────────────

ALTER TABLE public.bladers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking ENABLE ROW LEVEL SECURITY;

-- Leitura pública irrestrita
CREATE POLICY "public can read bladers"
  ON public.bladers FOR SELECT USING (true);

CREATE POLICY "public can read tournaments"
  ON public.tournaments FOR SELECT USING (true);

CREATE POLICY "public can read tournament_results"
  ON public.tournament_results FOR SELECT USING (true);

CREATE POLICY "public can read ranking"
  ON public.ranking FOR SELECT USING (true);

-- Escrita apenas para admins (role definido em user_metadata)
CREATE POLICY "admin full access bladers"
  ON public.bladers FOR ALL
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

CREATE POLICY "admin full access tournaments"
  ON public.tournaments FOR ALL
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

CREATE POLICY "admin full access tournament_results"
  ON public.tournament_results FOR ALL
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

CREATE POLICY "admin full access ranking"
  ON public.ranking FOR ALL
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

-- ─── Índices de performance ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bladers_nickname ON public.bladers (nickname);
CREATE INDEX IF NOT EXISTS idx_tournaments_slug ON public.tournaments (slug);
CREATE INDEX IF NOT EXISTS idx_tournaments_event_date ON public.tournaments (event_date DESC);
CREATE INDEX IF NOT EXISTS idx_tournament_results_tournament ON public.tournament_results (tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_results_blader ON public.tournament_results (blader_id);
CREATE INDEX IF NOT EXISTS idx_ranking_total_points ON public.ranking (total_points DESC);
