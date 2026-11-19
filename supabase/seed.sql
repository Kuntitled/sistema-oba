-- ============================================================
-- Dados de seed para desenvolvimento local
-- Execute APENAS em ambiente de desenvolvimento
-- ============================================================

-- Bladers de exemplo
INSERT INTO public.bladers (name, nickname, city, bio) VALUES
  ('Ryu Costa', 'RyuBX', 'Manaus', 'Top 1 da região Norte. Especialista em Xtreme Finish.'),
  ('Lara Pinheiro', 'LaraVolt', 'Manaus', 'Campeã do Amazonas 2024. Joga com Dran Sword.'),
  ('Carlos Medeiros', 'CarlosFury', 'Manaus', 'Veterano da liga, 3 anos competindo.'),
  ('Ana Silva', 'AnaBlade', 'Parintins', 'Representante do interior. Subindo no ranking.'),
  ('Bruno Torres', 'BrunoX', 'Manaus', 'Especialista em combos de Over Finish.');

-- Torneio de exemplo (encerrado)
INSERT INTO public.tournaments (name, slug, description, location, event_date, format, status, max_players) VALUES
  (
    'OBA Cup #1 — Abertura 2025',
    'oba-cup-1-abertura-2025',
    'Primeiro torneio oficial da temporada 2025 da Liga OBA.',
    'Arena BX Manaus — Shopping Amazonas',
    '2025-03-15',
    'swiss',
    'finished',
    32
  );
