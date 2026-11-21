-- ============================================================
-- Sistema OBA — Etapa 3B: Inscrições Online, Decklists & Comprovantes PIX (009)
-- Migration idempotente para execução no Supabase SQL Editor.
-- ============================================================

-- ─── 1. Storage Bucket Privado 'receipts' & RLS Policies ─────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  5242880,
  ARRAY['image/webp', 'image/jpeg', 'image/png', 'application/pdf']::TEXT[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "blader can read own receipts" ON storage.objects;
CREATE POLICY "blader can read own receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND array_length(storage.foldername(name), 1) = 2
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "blader can upload own receipts" ON storage.objects;
CREATE POLICY "blader can upload own receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND array_length(storage.foldername(name), 1) = 2
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "blader can update own receipts" ON storage.objects;
CREATE POLICY "blader can update own receipts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND array_length(storage.foldername(name), 1) = 2
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'receipts'
    AND array_length(storage.foldername(name), 1) = 2
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "blader can delete own receipts" ON storage.objects;
CREATE POLICY "blader can delete own receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND array_length(storage.foldername(name), 1) = 2
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "admin full access receipts" ON storage.objects;
CREATE POLICY "admin full access receipts"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin'
  )
  WITH CHECK (
    bucket_id = 'receipts'
    AND ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role') = 'admin'
  );

-- ─── 2. Políticas & Integridade em tournament_registrations ──────────────────
DROP POLICY IF EXISTS "blader can insert own registration" ON public.tournament_registrations;
CREATE POLICY "blader can insert own registration"
  ON public.tournament_registrations FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'pending'
    AND payment_verified = false
    AND decks_verified = false
    AND payment_verified_at IS NULL
    AND payment_verified_by IS NULL
    AND rejection_reason IS NULL
    AND EXISTS (
      SELECT 1 FROM public.bladers b
      WHERE b.id = tournament_registrations.blader_id
        AND b.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_registrations.tournament_id
        AND t.registration_status = 'open'
    )
  );

DROP POLICY IF EXISTS "blader can update own pending registration" ON public.tournament_registrations;
DROP POLICY IF EXISTS "blader can update own pending or rejected registration" ON public.tournament_registrations;
CREATE POLICY "blader can update own pending or rejected registration"
  ON public.tournament_registrations FOR UPDATE
  TO authenticated
  USING (
    status IN ('pending', 'rejected')
    AND EXISTS (
      SELECT 1 FROM public.bladers b
      WHERE b.id = tournament_registrations.blader_id
        AND b.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_registrations.tournament_id
        AND t.registration_status = 'open'
    )
  )
  WITH CHECK (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.bladers b
      WHERE b.id = tournament_registrations.blader_id
        AND b.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_registrations.tournament_id
        AND t.registration_status = 'open'
    )
  );

CREATE OR REPLACE FUNCTION public.guard_blader_registration_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  is_admin := COALESCE(((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role'), '') = 'admin';

  IF auth.uid() IS NOT NULL AND NOT is_admin THEN
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

DROP TRIGGER IF EXISTS trg_guard_blader_registration_update ON public.tournament_registrations;
CREATE TRIGGER trg_guard_blader_registration_update
  BEFORE UPDATE ON public.tournament_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_blader_registration_update();

DROP POLICY IF EXISTS "blader can delete own unverified registration" ON public.tournament_registrations;
CREATE POLICY "blader can delete own unverified registration"
  ON public.tournament_registrations FOR DELETE
  TO authenticated
  USING (
    status IN ('pending', 'rejected')
    AND payment_verified = false
    AND EXISTS (
      SELECT 1 FROM public.bladers b
      WHERE b.id = tournament_registrations.blader_id
        AND b.user_id = auth.uid()
    )
  );

-- ─── 3. Políticas em registration_combos (pending e rejected) ────────────────
DROP POLICY IF EXISTS "blader can manage own pending registration_combos" ON public.registration_combos;
DROP POLICY IF EXISTS "blader can manage own editable registration_combos" ON public.registration_combos;
CREATE POLICY "blader can manage own editable registration_combos"
  ON public.registration_combos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tournament_registrations tr
      JOIN public.tournaments t ON t.id = tr.tournament_id
      JOIN public.bladers b ON b.id = tr.blader_id
      WHERE tr.id = registration_combos.registration_id
        AND tr.status IN ('pending', 'rejected')
        AND t.registration_status = 'open'
        AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tournament_registrations tr
      JOIN public.tournaments t ON t.id = tr.tournament_id
      JOIN public.bladers b ON b.id = tr.blader_id
      WHERE tr.id = registration_combos.registration_id
        AND tr.status IN ('pending', 'rejected')
        AND t.registration_status = 'open'
        AND b.user_id = auth.uid()
    )
  );
