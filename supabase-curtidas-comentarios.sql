-- Tabela de curtidas
CREATE TABLE public.curtidas (
  id          bigint primary key generated always as identity,
  reclamacao_id bigint not null references public.reclamacoes(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  UNIQUE(reclamacao_id, user_id)
);
ALTER TABLE public.curtidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "curtidas_select" ON public.curtidas FOR SELECT USING (true);
CREATE POLICY "curtidas_insert" ON public.curtidas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "curtidas_delete" ON public.curtidas FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Tabela de comentários
CREATE TABLE public.comentarios (
  id          bigint primary key generated always as identity,
  reclamacao_id bigint not null references public.reclamacoes(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  texto       text not null,
  created_at  timestamptz not null default now()
);
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comentarios_select" ON public.comentarios FOR SELECT USING (true);
CREATE POLICY "comentarios_insert" ON public.comentarios FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Tabela de contatos da empresa
CREATE TABLE public.contatos_empresa (
  id          bigint primary key generated always as identity,
  nome        text not null,
  email       text not null,
  mensagem    text not null,
  created_at  timestamptz not null default now()
);
ALTER TABLE public.contatos_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contatos_insert" ON public.contatos_empresa FOR INSERT WITH CHECK (true);
CREATE POLICY "contatos_select_admin" ON public.contatos_empresa FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
