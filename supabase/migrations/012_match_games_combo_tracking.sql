-- ============================================================
-- Sistema OBA — Fase 4A: Rastreamento de Combos por Round (012)
-- Migration idempotente para execução no Supabase SQL Editor.
-- ============================================================

-- ─── 1. Colunas opcionais em match_games ─────────────────────────────────────
ALTER TABLE public.match_games
  ADD COLUMN IF NOT EXISTS player1_combo_id UUID REFERENCES public.registration_combos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS player2_combo_id UUID REFERENCES public.registration_combos(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.match_games.player1_combo_id IS
  'Combo da decklist (registration_combos) utilizado pelo player1 neste round (opcional).';
COMMENT ON COLUMN public.match_games.player2_combo_id IS
  'Combo da decklist (registration_combos) utilizado pelo player2 neste round (opcional).';

-- ─── 2. Índices parciais para agregação de performance de peças ──────────────
CREATE INDEX IF NOT EXISTS idx_match_games_player1_combo
  ON public.match_games (player1_combo_id)
  WHERE player1_combo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_match_games_player2_combo
  ON public.match_games (player2_combo_id)
  WHERE player2_combo_id IS NOT NULL;

-- ─── 3. Leitura somente de decklists aprovadas em torneios ativos para Juiz ──
DROP POLICY IF EXISTS "judge can read approved active tournament_registrations" ON public.tournament_registrations;
CREATE POLICY "judge can read approved active tournament_registrations"
  ON public.tournament_registrations FOR SELECT
  TO authenticated
  USING (
    status = 'approved'
    AND ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'judge'
    AND EXISTS (
      SELECT 1
      FROM public.tournaments t
      WHERE t.id = tournament_registrations.tournament_id
        AND t.status IN ('ongoing', 'finished')
    )
  );

DROP POLICY IF EXISTS "judge can read approved active registration_combos" ON public.registration_combos;
CREATE POLICY "judge can read approved active registration_combos"
  ON public.registration_combos FOR SELECT
  TO authenticated
  USING (
    ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'judge'
    AND EXISTS (
      SELECT 1
      FROM public.tournament_registrations tr
      JOIN public.tournaments t ON t.id = tr.tournament_id
      WHERE tr.id = registration_combos.registration_id
        AND tr.status = 'approved'
        AND t.status IN ('ongoing', 'finished')
    )
  );
