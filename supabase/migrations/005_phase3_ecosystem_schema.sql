-- ============================================================
-- Sistema OBA — Ecossistema do Blader, Peças, Formatos & Inscrições (005)
-- Base completa para a Fase 3 (Etapas 3A, 3B e 3C), mantendo total
-- compatibilidade com as Fases 1 e 2.
-- ============================================================

-- ─── A. Tabela: parts_catalog (Catálogo de Peças BX / UX / CX) ─────────────
CREATE TABLE IF NOT EXISTS public.parts_catalog (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  aliases    TEXT[] NOT NULL DEFAULT '{}',
  part_type  TEXT NOT NULL CHECK (part_type IN ('blade', 'ratchet', 'bit', 'lock_chip', 'assist_blade', 'over_blade')),
  line       TEXT NOT NULL DEFAULT 'BX' CHECK (line IN ('BX', 'UX', 'CX')),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT parts_catalog_name_type_unique UNIQUE (name, part_type)
);

COMMENT ON TABLE public.parts_catalog IS 'Catálogo oficial de peças competitivas (Takara Tomy como canônico e aliases Hasbro).';

DROP TRIGGER IF EXISTS parts_catalog_updated_at ON public.parts_catalog;
CREATE TRIGGER parts_catalog_updated_at
  BEFORE UPDATE ON public.parts_catalog
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_parts_catalog_type_line
  ON public.parts_catalog (part_type, line);

CREATE INDEX IF NOT EXISTS idx_parts_catalog_name
  ON public.parts_catalog (name);

CREATE INDEX IF NOT EXISTS idx_parts_catalog_aliases
  ON public.parts_catalog USING GIN (aliases);

-- ─── B. Alterações em public.bladers ────────────────────────────────────────
-- Garante que bios legadas não quebrem a nova constraint de 160 caracteres
UPDATE public.bladers
SET bio = left(bio, 160)
WHERE bio IS NOT NULL AND char_length(bio) > 160;

ALTER TABLE public.bladers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS favorite_anime TEXT,
  ADD COLUMN IF NOT EXISTS favorite_blade_id UUID REFERENCES public.parts_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS favorite_ratchet_id UUID REFERENCES public.parts_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS favorite_bit_id UUID REFERENCES public.parts_catalog(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bladers_user_id_unique'
      AND conrelid = 'public.bladers'::regclass
  ) THEN
    ALTER TABLE public.bladers
      ADD CONSTRAINT bladers_user_id_unique UNIQUE (user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bladers_bio_length_check'
      AND conrelid = 'public.bladers'::regclass
  ) THEN
    ALTER TABLE public.bladers
      ADD CONSTRAINT bladers_bio_length_check CHECK (bio IS NULL OR char_length(bio) <= 160);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bladers_user_id
  ON public.bladers (user_id);

-- ─── C. Formatos & Ban-lists Independentes (rulesets / ruleset_banned_parts) ─
CREATE TABLE IF NOT EXISTS public.rulesets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rulesets IS 'Formatos competitivos e conjuntos de regras da OBA (ex: Livre, Limitado OBA).';

DROP TRIGGER IF EXISTS rulesets_updated_at ON public.rulesets;
CREATE TRIGGER rulesets_updated_at
  BEFORE UPDATE ON public.rulesets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.ruleset_banned_parts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruleset_id UUID NOT NULL REFERENCES public.rulesets(id) ON DELETE CASCADE,
  part_id    UUID NOT NULL REFERENCES public.parts_catalog(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ruleset_id, part_id)
);

COMMENT ON TABLE public.ruleset_banned_parts IS 'Lista independente de peças banidas por formato (ruleset).';

CREATE INDEX IF NOT EXISTS idx_ruleset_banned_parts_ruleset
  ON public.ruleset_banned_parts (ruleset_id);

CREATE INDEX IF NOT EXISTS idx_ruleset_banned_parts_part
  ON public.ruleset_banned_parts (part_id);

-- Seed inicial do formato padrão Livre (sem banimentos)
INSERT INTO public.rulesets (name, description, is_active)
VALUES (
  'Livre',
  'Formato oficial padrão sem banimentos. Todas as peças competitivas BX, UX e CX liberadas.',
  true
)
ON CONFLICT (name) DO NOTHING;

-- ─── D. Alterações em public.tournaments ────────────────────────────────────
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS ruleset_id UUID REFERENCES public.rulesets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS registration_status TEXT NOT NULL DEFAULT 'closed',
  ADD COLUMN IF NOT EXISTS entry_fee NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_participants INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tournaments_registration_status_check'
      AND conrelid = 'public.tournaments'::regclass
  ) THEN
    ALTER TABLE public.tournaments
      ADD CONSTRAINT tournaments_registration_status_check
      CHECK (registration_status IN ('closed', 'open', 'finished'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tournaments_entry_fee_check'
      AND conrelid = 'public.tournaments'::regclass
  ) THEN
    ALTER TABLE public.tournaments
      ADD CONSTRAINT tournaments_entry_fee_check
      CHECK (entry_fee IS NULL OR entry_fee >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tournaments_max_participants_check'
      AND conrelid = 'public.tournaments'::regclass
  ) THEN
    ALTER TABLE public.tournaments
      ADD CONSTRAINT tournaments_max_participants_check
      CHECK (max_participants IS NULL OR max_participants > 0);
  END IF;
END $$;

-- Backfill de torneios existentes para o formato Livre
UPDATE public.tournaments
SET ruleset_id = (
  SELECT id FROM public.rulesets WHERE name = 'Livre' LIMIT 1
)
WHERE ruleset_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_tournaments_ruleset
  ON public.tournaments (ruleset_id);

-- ─── E. Configuração Global da Liga (league_settings singleton) ──────────────
CREATE TABLE IF NOT EXISTS public.league_settings (
  id                INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pix_key           TEXT,
  pix_receiver_name TEXT,
  pix_city          TEXT DEFAULT 'MANAUS',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.league_settings IS 'Configurações globais singleton da Liga OBA (dados PIX para inscrições).';

DROP TRIGGER IF EXISTS league_settings_updated_at ON public.league_settings;
CREATE TRIGGER league_settings_updated_at
  BEFORE UPDATE ON public.league_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.league_settings (id, pix_city)
VALUES (1, 'MANAUS')
ON CONFLICT (id) DO NOTHING;

-- ─── F. Inventário, Inscrições, Combos e Solicitações de Vínculo ─────────────
CREATE TABLE IF NOT EXISTS public.blader_inventory (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blader_id  UUID NOT NULL REFERENCES public.bladers(id) ON DELETE CASCADE,
  part_id    UUID NOT NULL REFERENCES public.parts_catalog(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blader_id, part_id)
);

COMMENT ON TABLE public.blader_inventory IS 'Coleção pessoal de peças pertencentes a cada Blader.';

CREATE INDEX IF NOT EXISTS idx_blader_inventory_blader
  ON public.blader_inventory (blader_id);

CREATE INDEX IF NOT EXISTS idx_blader_inventory_part
  ON public.blader_inventory (part_id);

CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id       UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  blader_id           UUID NOT NULL REFERENCES public.bladers(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  payment_verified    BOOLEAN NOT NULL DEFAULT false,
  payment_verified_at TIMESTAMPTZ,
  payment_verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  receipt_path        TEXT,
  decks_verified      BOOLEAN NOT NULL DEFAULT false,
  rejection_reason    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, blader_id)
);

COMMENT ON TABLE public.tournament_registrations IS 'Inscrições de Bladers em torneios (com status, pagamento PIX e conferência de decklist).';

DROP TRIGGER IF EXISTS tournament_registrations_updated_at ON public.tournament_registrations;
CREATE TRIGGER tournament_registrations_updated_at
  BEFORE UPDATE ON public.tournament_registrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament
  ON public.tournament_registrations (tournament_id, status);

CREATE INDEX IF NOT EXISTS idx_tournament_registrations_blader
  ON public.tournament_registrations (blader_id);

CREATE TABLE IF NOT EXISTS public.registration_combos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.tournament_registrations(id) ON DELETE CASCADE,
  slot_number     INTEGER NOT NULL CHECK (slot_number >= 1 AND slot_number <= 4),
  blade_id        UUID REFERENCES public.parts_catalog(id) ON DELETE SET NULL,
  ratchet_id      UUID REFERENCES public.parts_catalog(id) ON DELETE SET NULL,
  bit_id          UUID REFERENCES public.parts_catalog(id) ON DELETE SET NULL,
  lock_chip_id    UUID REFERENCES public.parts_catalog(id) ON DELETE SET NULL,
  assist_blade_id UUID REFERENCES public.parts_catalog(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (registration_id, slot_number)
);

COMMENT ON TABLE public.registration_combos IS 'Combos da decklist (até 4 slots) submetidos na inscrição do torneio.';

CREATE INDEX IF NOT EXISTS idx_registration_combos_registration
  ON public.registration_combos (registration_id);

CREATE TABLE IF NOT EXISTS public.blader_claim_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blader_id       UUID NOT NULL REFERENCES public.bladers(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email      TEXT,
  user_name       TEXT,
  user_avatar_url TEXT,
  note            TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.blader_claim_requests IS 'Solicitações de vínculo de conta autenticada com perfis de Bladers pré-cadastrados.';

DROP TRIGGER IF EXISTS blader_claim_requests_updated_at ON public.blader_claim_requests;
CREATE TRIGGER blader_claim_requests_updated_at
  BEFORE UPDATE ON public.blader_claim_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS idx_blader_claim_requests_pending_user
  ON public.blader_claim_requests (user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_blader_claim_requests_blader
  ON public.blader_claim_requests (blader_id, status);

-- ─── G. GRANTs & RLS (Row Level Security) ────────────────────────────────────
GRANT ALL ON
  public.parts_catalog,
  public.rulesets,
  public.ruleset_banned_parts,
  public.league_settings,
  public.blader_inventory,
  public.tournament_registrations,
  public.registration_combos,
  public.blader_claim_requests
TO postgres, anon, authenticated, service_role;

ALTER TABLE public.parts_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rulesets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruleset_banned_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blader_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blader_claim_requests ENABLE ROW LEVEL SECURITY;

-- Leitura pública de catálogo de peças, formatos e ban-lists
DROP POLICY IF EXISTS "public can read parts_catalog" ON public.parts_catalog;
CREATE POLICY "public can read parts_catalog"
  ON public.parts_catalog FOR SELECT USING (true);

DROP POLICY IF EXISTS "public can read rulesets" ON public.rulesets;
CREATE POLICY "public can read rulesets"
  ON public.rulesets FOR SELECT USING (true);

DROP POLICY IF EXISTS "public can read ruleset_banned_parts" ON public.ruleset_banned_parts;
CREATE POLICY "public can read ruleset_banned_parts"
  ON public.ruleset_banned_parts FOR SELECT USING (true);

-- Leitura autenticada de configurações da liga (PIX para inscrições)
DROP POLICY IF EXISTS "authenticated can read league_settings" ON public.league_settings;
CREATE POLICY "authenticated can read league_settings"
  ON public.league_settings FOR SELECT
  TO authenticated
  USING (true);

-- Auto-serviço do Blader em seu próprio perfil
DROP POLICY IF EXISTS "blader can insert own profile" ON public.bladers;
CREATE POLICY "blader can insert own profile"
  ON public.bladers FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.bladers b WHERE b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "blader can update own profile" ON public.bladers;
CREATE POLICY "blader can update own profile"
  ON public.bladers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Auto-serviço do Blader em seu inventário pessoal
DROP POLICY IF EXISTS "blader can manage own inventory" ON public.blader_inventory;
CREATE POLICY "blader can manage own inventory"
  ON public.blader_inventory FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bladers b
      WHERE b.id = blader_inventory.blader_id
        AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bladers b
      WHERE b.id = blader_inventory.blader_id
        AND b.user_id = auth.uid()
    )
  );

-- Auto-serviço do usuário autenticado nas solicitações de vínculo
DROP POLICY IF EXISTS "user can read own claim requests" ON public.blader_claim_requests;
CREATE POLICY "user can read own claim requests"
  ON public.blader_claim_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user can create own claim request" ON public.blader_claim_requests;
CREATE POLICY "user can create own claim request"
  ON public.blader_claim_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "user can cancel own pending claim request" ON public.blader_claim_requests;
CREATE POLICY "user can cancel own pending claim request"
  ON public.blader_claim_requests FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

-- Auto-serviço do Blader em suas inscrições e decklists (base para 3B)
DROP POLICY IF EXISTS "blader can read own registrations" ON public.tournament_registrations;
CREATE POLICY "blader can read own registrations"
  ON public.tournament_registrations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bladers b
      WHERE b.id = tournament_registrations.blader_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "blader can insert own registration" ON public.tournament_registrations;
CREATE POLICY "blader can insert own registration"
  ON public.tournament_registrations FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'pending'
    AND payment_verified = false
    AND EXISTS (
      SELECT 1 FROM public.bladers b
      WHERE b.id = tournament_registrations.blader_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "blader can update own pending registration" ON public.tournament_registrations;
CREATE POLICY "blader can update own pending registration"
  ON public.tournament_registrations FOR UPDATE
  TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.bladers b
      WHERE b.id = tournament_registrations.blader_id
        AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    status = 'pending'
    AND payment_verified = false
    AND EXISTS (
      SELECT 1 FROM public.bladers b
      WHERE b.id = tournament_registrations.blader_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "blader can read own registration_combos" ON public.registration_combos;
CREATE POLICY "blader can read own registration_combos"
  ON public.registration_combos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tournament_registrations tr
      JOIN public.bladers b ON b.id = tr.blader_id
      WHERE tr.id = registration_combos.registration_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "blader can manage own pending registration_combos" ON public.registration_combos;
CREATE POLICY "blader can manage own pending registration_combos"
  ON public.registration_combos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tournament_registrations tr
      JOIN public.bladers b ON b.id = tr.blader_id
      WHERE tr.id = registration_combos.registration_id
        AND tr.status = 'pending'
        AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tournament_registrations tr
      JOIN public.bladers b ON b.id = tr.blader_id
      WHERE tr.id = registration_combos.registration_id
        AND tr.status = 'pending'
        AND b.user_id = auth.uid()
    )
  );

-- Acesso total para administradores em todas as novas tabelas
DROP POLICY IF EXISTS "admin full access parts_catalog" ON public.parts_catalog;
CREATE POLICY "admin full access parts_catalog"
  ON public.parts_catalog FOR ALL
  USING (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin');

DROP POLICY IF EXISTS "admin full access rulesets" ON public.rulesets;
CREATE POLICY "admin full access rulesets"
  ON public.rulesets FOR ALL
  USING (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin');

DROP POLICY IF EXISTS "admin full access ruleset_banned_parts" ON public.ruleset_banned_parts;
CREATE POLICY "admin full access ruleset_banned_parts"
  ON public.ruleset_banned_parts FOR ALL
  USING (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin');

DROP POLICY IF EXISTS "admin full access league_settings" ON public.league_settings;
CREATE POLICY "admin full access league_settings"
  ON public.league_settings FOR ALL
  USING (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin');

DROP POLICY IF EXISTS "admin full access blader_inventory" ON public.blader_inventory;
CREATE POLICY "admin full access blader_inventory"
  ON public.blader_inventory FOR ALL
  USING (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin');

DROP POLICY IF EXISTS "admin full access tournament_registrations" ON public.tournament_registrations;
CREATE POLICY "admin full access tournament_registrations"
  ON public.tournament_registrations FOR ALL
  USING (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin');

DROP POLICY IF EXISTS "admin full access registration_combos" ON public.registration_combos;
CREATE POLICY "admin full access registration_combos"
  ON public.registration_combos FOR ALL
  USING (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin');

DROP POLICY IF EXISTS "admin full access blader_claim_requests" ON public.blader_claim_requests;
CREATE POLICY "admin full access blader_claim_requests"
  ON public.blader_claim_requests FOR ALL
  USING (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin');
