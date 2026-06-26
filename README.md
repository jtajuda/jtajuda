# Lesados J&T Express

Landing page de ação coletiva com sistema de reclamações, autenticação e painel admin.

**Stack:** Vite + React + Supabase + Vercel

---

## 1. Supabase — configuração inicial

### 1.1 Criar projeto
1. Acesse [supabase.com](https://supabase.com) → New Project
2. Anote a **URL** e a **anon key** (Settings → API)

### 1.2 Executar o schema
1. Vá em **Database → SQL Editor**
2. Cole o conteúdo de `supabase-schema.sql` e execute

### 1.3 Criar o Storage Bucket
1. Vá em **Storage → New bucket**
2. Nome: `reclamacoes-imagens`
3. Marque **Public bucket: ON**
4. Vá em **Storage → Policies → reclamacoes-imagens → New policy**
5. Selecione "For full customization" e crie uma policy de INSERT:
   - Allowed operation: `INSERT`
   - Target roles: `authenticated`
   - Policy expression: `true`

### 1.4 Tornar-se admin
Após criar sua conta no site, execute no SQL Editor:
```sql
UPDATE public.profiles SET is_admin = true WHERE telefone = 'SEU_TELEFONE';
-- Ex: WHERE telefone = '11999999999'
```

---

## 2. Configurar variáveis de ambiente

Copie `.env.example` para `.env`:
```bash
cp .env.example .env
```

Preencha com seus valores do Supabase:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 3. Rodar localmente

```bash
npm install
npm run dev
```

Acesse: http://localhost:5173

---

## 4. Deploy no Vercel

### 4.1 Via Vercel CLI
```bash
npm i -g vercel
vercel
```

### 4.2 Via GitHub (recomendado)
1. Faça push do projeto para um repositório GitHub
2. Acesse [vercel.com](https://vercel.com) → Import Project → selecione o repositório
3. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` → sua URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` → sua anon key
4. Clique em **Deploy**

---

## 5. Autenticação — como funciona

O Supabase Auth usa e-mail/senha. Como queremos login por telefone, o sistema converte o telefone em um e-mail fictício no formato:

```
11999999999 → 11999999999@jt-lesados.app
```

O usuário nunca vê isso — do ponto de vista dele, basta digitar telefone + senha.

---

## 6. Fluxo do usuário

1. Acessa a landing page → vê reclamações aprovadas e contadores
2. Clica em "Cadastrar" → preenche nome, CPF, endereço, telefone, senha
3. Após cadastro, já fica logado automaticamente
4. Clica em "Nova reclamação" → preenche o formulário com até 5 imagens
5. Reclamação vai para fila "Pendente" no painel admin
6. Admin aprova → aparece instantaneamente na lista pública via Realtime

## 7. Painel admin

- Acesse `/admin` (só visível para is_admin = true)
- Três abas: Pendentes / Aprovadas / Rejeitadas
- Dados completos do usuário visíveis apenas para o admin (nome, telefone, CPF)
- Nome mascarado na lista pública (ex: "João S***")
