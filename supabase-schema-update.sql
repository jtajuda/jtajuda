-- PASSO 1: Adicionar coluna email
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- PASSO 2: Unique constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_telefone_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_telefone_key UNIQUE (telefone);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_cpf_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_cpf_key UNIQUE (cpf);
