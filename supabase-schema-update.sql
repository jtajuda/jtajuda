-- ============================================================
-- ATUALIZAÇÃO DO SCHEMA — rode no SQL Editor do Supabase
-- Só precisa rodar se já tinha rodado o schema anterior
-- ============================================================

-- Adicionar coluna email nos perfis (se não existir)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Garantir unicidade de telefone e CPF
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_telefone_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_telefone_key UNIQUE (telefone);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_cpf_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_cpf_key UNIQUE (cpf);

-- ============================================================
-- PARA CRIAR CONTA ADMIN — após criar conta pelo site:
-- UPDATE public.profiles SET is_admin = true 
-- WHERE email = 'SEU_EMAIL_AQUI';
-- ============================================================
