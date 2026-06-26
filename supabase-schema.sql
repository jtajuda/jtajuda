-- ============================================================
-- SCHEMA: Lesados J&T Express
-- Cole este SQL no editor SQL do Supabase (Database > SQL Editor)
-- ============================================================

-- TABELA: perfis de usuários (complementa auth.users do Supabase)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  cpf         text not null,
  endereco    text not null,
  telefone    text not null unique,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- TABELA: reclamações
create table public.reclamacoes (
  id          bigint primary key generated always as identity,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  titulo      text not null,
  site        text not null,
  tipo        text not null,
  valor       numeric(10,2) not null default 0,
  descricao   text not null,
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at  timestamptz not null default now()
);

-- TABELA: imagens das reclamações (armazenadas no Storage do Supabase)
create table public.reclamacao_imagens (
  id             bigint primary key generated always as identity,
  reclamacao_id  bigint not null references public.reclamacoes(id) on delete cascade,
  storage_path   text not null,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.profiles       enable row level security;
alter table public.reclamacoes     enable row level security;
alter table public.reclamacao_imagens enable row level security;

-- profiles: usuário lê/edita só o próprio; admin lê todos
create policy "usuario lê próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "usuario atualiza próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "insert próprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- reclamacoes: qualquer um vê aprovadas; dono vê as suas; admin vê todas
create policy "público vê aprovadas"
  on public.reclamacoes for select
  using (status = 'approved' or auth.uid() = user_id);

create policy "usuário insere própria reclamação"
  on public.reclamacoes for insert
  with check (auth.uid() = user_id);

create policy "admin atualiza qualquer reclamação"
  on public.reclamacoes for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- imagens: mesmas regras da reclamação pai
create policy "imagens visíveis junto com reclamação"
  on public.reclamacao_imagens for select
  using (
    exists (
      select 1 from public.reclamacoes r
      where r.id = reclamacao_id
        and (r.status = 'approved' or r.user_id = auth.uid())
    )
  );

create policy "usuário insere imagens da própria reclamação"
  on public.reclamacao_imagens for insert
  with check (
    exists (
      select 1 from public.reclamacoes r
      where r.id = reclamacao_id and r.user_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE BUCKET: reclamacoes-imagens
-- Crie manualmente em Storage > New bucket:
--   Nome: reclamacoes-imagens
--   Public: true
-- Depois adicione esta policy:
-- ============================================================

-- insert para usuários autenticados
-- (configure via UI do Supabase: Storage > Policies > reclamacoes-imagens)
-- allowed operation: INSERT
-- target roles: authenticated
-- policy: true

-- ============================================================
-- PARA TORNAR UM USUÁRIO ADMIN:
-- UPDATE public.profiles SET is_admin = true WHERE telefone = '11999999999';
-- ============================================================
