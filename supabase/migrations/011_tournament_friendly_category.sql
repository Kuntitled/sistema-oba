-- ============================================================
-- Sistema OBA — Modalidade Amistoso em Torneios (011)
-- Permite cadastrar torneios da categoria 'amistoso', que utilizam
-- o fluxo completo de inscrição, arenas, chaveamento e resultados
-- sem contabilizar pontos, vitórias ou pódios no ranking oficial.
-- ============================================================

DO $$
DECLARE
  c_name TEXT;
BEGIN
  FOR c_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.tournaments'::regclass
      AND contype = 'c'
      AND (
        conname = 'tournaments_category_check'
        OR pg_get_constraintdef(oid) LIKE '%category%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.tournaments DROP CONSTRAINT %I', c_name);
  END LOOP;

  ALTER TABLE public.tournaments
    ADD CONSTRAINT tournaments_category_check
    CHECK (category IN ('semanal', 'oficial', 'amistoso'));
END $$;

COMMENT ON COLUMN public.tournaments.category IS 'Modalidade do torneio: semanal (100/75/50 pts), oficial (200/150/100 pts) ou amistoso (não conta pontos nem vitórias no ranking oficial).';
