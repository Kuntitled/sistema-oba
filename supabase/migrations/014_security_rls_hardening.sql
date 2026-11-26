-- ============================================================
-- Sistema OBA — Hardening de Segurança RLS & app_metadata (014)
-- Corrige alertas do Supabase Security Advisor:
--   1) Habilita RLS em bladers, tournaments, tournament_results e ranking.
--   2) Remove 100% das referências a user_metadata em policies e triggers,
--      passando a ler exclusivamente app_metadata.role via helpers seguros.
--   3) Migra papéis (admin / judge) de raw_user_meta_data -> raw_app_meta_data.
-- ============================================================

-- ─── 1. Funções Helper Seguras (lêem exclusivamente app_metadata) ────────────
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.get_user_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_judge()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.get_user_role() = 'judge';
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role(), public.is_admin(), public.is_judge()
  TO anon, authenticated, service_role;

-- Harden search_path das funções existentes
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_blader_registration_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  is_admin_user BOOLEAN;
BEGIN
  is_admin_user := public.is_admin();

  IF auth.uid() IS NOT NULL AND NOT is_admin_user THEN
    IF NEW.tournament_id <> OLD.tournament_id OR NEW.blader_id <> OLD.blader_id THEN
      RAISE EXCEPTION 'Não é permitido alterar torneio ou blader da inscrição.';
    END IF;

    IF NEW.status <> 'pending' THEN
      RAISE EXCEPTION 'Bladers podem apenas manter ou reenviar a inscrição para análise (pending).';
    END IF;

    IF NEW.payment_verified = true AND OLD.payment_verified = false THEN
      RAISE EXCEPTION 'Apenas administradores podem marcar o pagamento como verificado.';
    END IF;

    IF NEW.decks_verified = true AND OLD.decks_verified = false THEN
      RAISE EXCEPTION 'Apenas administradores podem marcar a decklist como verificada.';
    END IF;

    IF NEW.payment_verified = false THEN
      NEW.payment_verified_at := NULL;
      NEW.payment_verified_by := NULL;
    ELSE
      NEW.payment_verified_at := OLD.payment_verified_at;
      NEW.payment_verified_by := OLD.payment_verified_by;
    END IF;

    IF NEW.rejection_reason IS NOT NULL THEN
      RAISE EXCEPTION 'Não é permitido definir motivo de rejeição nesta operação.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ─── 2. Habilitar RLS em todas as tabelas do schema public ───────────────────
ALTER TABLE public.bladers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.arenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_games ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.parts_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rulesets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruleset_banned_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blader_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blader_claim_requests ENABLE ROW LEVEL SECURITY;

-- ─── 3. Policies Fase 1 (Leitura pública + escrita restrita a admin) ─────────
DROP POLICY IF EXISTS "public can read bladers" ON public.bladers;
CREATE POLICY "public can read bladers"
  ON public.bladers FOR SELECT USING (true);

DROP POLICY IF EXISTS "public can read tournaments" ON public.tournaments;
CREATE POLICY "public can read tournaments"
  ON public.tournaments FOR SELECT USING (true);

DROP POLICY IF EXISTS "public can read tournament_results" ON public.tournament_results;
CREATE POLICY "public can read tournament_results"
  ON public.tournament_results FOR SELECT USING (true);

DROP POLICY IF EXISTS "public can read ranking" ON public.ranking;
CREATE POLICY "public can read ranking"
  ON public.ranking FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin full access bladers" ON public.bladers;
CREATE POLICY "admin full access bladers"
  ON public.bladers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin full access tournaments" ON public.tournaments;
CREATE POLICY "admin full access tournaments"
  ON public.tournaments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin full access tournament_results" ON public.tournament_results;
CREATE POLICY "admin full access tournament_results"
  ON public.tournament_results FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin full access ranking" ON public.ranking;
CREATE POLICY "admin full access ranking"
  ON public.ranking FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── 4. Policies Fase 2 (Arenas, Matches, Match Games, Seasons, Participants) ─
DROP POLICY IF EXISTS "admin full access arenas" ON public.arenas;
CREATE POLICY "admin full access arenas"
  ON public.arenas FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin full access matches" ON public.matches;
CREATE POLICY "admin full access matches"
  ON public.matches FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin full access match_games" ON public.match_games;
CREATE POLICY "admin full access match_games"
  ON public.match_games FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin full access seasons" ON public.seasons;
CREATE POLICY "admin full access seasons"
  ON public.seasons FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin full access tournament_participants" ON public.tournament_participants;
CREATE POLICY "admin full access tournament_participants"
  ON public.tournament_participants FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "judge can update arenas" ON public.arenas;
CREATE POLICY "judge can update arenas"
  ON public.arenas FOR UPDATE
  USING (public.is_judge())
  WITH CHECK (public.is_judge());

DROP POLICY IF EXISTS "judge can update matches" ON public.matches;
CREATE POLICY "judge can update matches"
  ON public.matches FOR UPDATE
  USING (public.is_judge())
  WITH CHECK (public.is_judge());

DROP POLICY IF EXISTS "judge can insert match_games" ON public.match_games;
CREATE POLICY "judge can insert match_games"
  ON public.match_games FOR INSERT
  WITH CHECK (public.is_judge());

DROP POLICY IF EXISTS "judge can delete match_games" ON public.match_games;
CREATE POLICY "judge can delete match_games"
  ON public.match_games FOR DELETE
  USING (public.is_judge());

-- ─── 5. Policies Fase 3 & Fase 4 (Catálogo, Formatos, Inscrições, Juízes) ────
DROP POLICY IF EXISTS "admin full access parts_catalog" ON public.parts_catalog;
CREATE POLICY "admin full access parts_catalog"
  ON public.parts_catalog FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin full access rulesets" ON public.rulesets;
CREATE POLICY "admin full access rulesets"
  ON public.rulesets FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin full access ruleset_banned_parts" ON public.ruleset_banned_parts;
CREATE POLICY "admin full access ruleset_banned_parts"
  ON public.ruleset_banned_parts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin full access league_settings" ON public.league_settings;
CREATE POLICY "admin full access league_settings"
  ON public.league_settings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin full access blader_inventory" ON public.blader_inventory;
CREATE POLICY "admin full access blader_inventory"
  ON public.blader_inventory FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin full access tournament_registrations" ON public.tournament_registrations;
CREATE POLICY "admin full access tournament_registrations"
  ON public.tournament_registrations FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin full access registration_combos" ON public.registration_combos;
CREATE POLICY "admin full access registration_combos"
  ON public.registration_combos FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin full access blader_claim_requests" ON public.blader_claim_requests;
CREATE POLICY "admin full access blader_claim_requests"
  ON public.blader_claim_requests FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "judge can read approved active tournament_registrations" ON public.tournament_registrations;
CREATE POLICY "judge can read approved active tournament_registrations"
  ON public.tournament_registrations FOR SELECT
  TO authenticated
  USING (
    status = 'approved'
    AND public.is_judge()
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
    public.is_judge()
    AND EXISTS (
      SELECT 1
      FROM public.tournament_registrations tr
      JOIN public.tournaments t ON t.id = tr.tournament_id
      WHERE tr.id = registration_combos.registration_id
        AND tr.status = 'approved'
        AND t.status IN ('ongoing', 'finished')
    )
  );

-- ─── 6. Storage Bucket 'receipts' (Admin) ────────────────────────────────────
DROP POLICY IF EXISTS "admin full access receipts" ON storage.objects;
CREATE POLICY "admin full access receipts"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'receipts'
    AND public.is_admin()
  );

-- ─── 7. Migração dos papéis existentes para auth.users.raw_app_meta_data ─────
UPDATE auth.users
SET
  raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', raw_user_meta_data ->> 'role'),
  raw_user_meta_data = raw_user_meta_data - 'role'
WHERE (raw_user_meta_data ->> 'role') IN ('admin', 'judge')
  AND COALESCE(raw_app_meta_data ->> 'role', '') NOT IN ('admin', 'judge');

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'role'
WHERE raw_user_meta_data ? 'role';
