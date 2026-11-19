-- ============================================================
-- Sistema OBA — Permissões de Acesso (GRANTs)
-- Necessário para permitir que os clientes Supabase (anon e authenticated)
-- acessem as tabelas e obedeçam às políticas de RLS.
-- ============================================================

-- 1. Garante permissão de uso no schema public
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Concede permissões nas tabelas existentes
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 3. Concede permissões em sequências e rotinas
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 4. Garante que futuras tabelas criadas herdem essas permissões
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;
