-- ============================================================
-- Sistema OBA — Campos de Divulgação e Localização em Torneios (010)
-- Adiciona horário(s), link do Google Maps e premiação opcional
-- em public.tournaments para cards de divulgação e página pública.
-- ============================================================

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS event_time TEXT,
  ADD COLUMN IF NOT EXISTS location_url TEXT,
  ADD COLUMN IF NOT EXISTS prize_info TEXT;

COMMENT ON COLUMN public.tournaments.event_time IS 'Horário(s) do evento para divulgação e página pública (ex: Check-in 13h30 • Início 14h00).';
COMMENT ON COLUMN public.tournaments.location_url IS 'URL segura (http/https) do Google Maps para o local do torneio.';
COMMENT ON COLUMN public.tournaments.prize_info IS 'Descrição livre da premiação exibida na página pública e no card de divulgação.';
