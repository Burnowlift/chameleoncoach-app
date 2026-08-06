# 🔐 Relatório de Segurança — Chameleon Coach

> **Data:** 06/08/2026
> **Escopo:** frontend (React/Vite), Supabase (Postgres, Auth, Storage, Realtime), Edge Functions (Deno), infraestrutura (Netlify) e scripts auxiliares.
> **Método:** revisão estática de código, migrations SQL, configurações e políticas de Row Level Security (RLS).

---

## 1. Resumo executivo

| Nível | Quantidade |
|---|---|
| 🔴 Crítico / Alto | 3 |
| 🟠 Médio | 5 |
| 🟡 Baixo | 6 |
| ✅ Boas práticas já presentes | 10+ |

**O que vai bem:** todas as **32 tabelas têm RLS habilitado**, a maioria das políticas restringe por `auth.uid()` e e-mail do treinador, as Edge Functions fazem verificação manual de JWT (`requireCoach`), não há chaves de API/service role em código, e o modelo de acesso aluno↔treinador segue o padrão "dono-ou-treinador".

**O que precisa de atenção imediata:** o bucket de anamnese (dados de saúde) foi tornado **público**, uma função `SECURITY DEFINER` de ranking expõe **dados de saúde/força de todos os alunos a qualquer usuário autenticado**, e o modelo de super-admin depende de um **e-mail fixo hardcoded**.

---

## 2. Escopo e metodologia

A análise cobriu:

- 59 migrations SQL em `supabase/migrations/` (+ 2 SQL soltos em `supabase/`)
- 4 Edge Functions em `supabase/functions/`
- Configuração `supabase/config.toml`
- Cliente Supabase e hooks de autenticação (`src/integrations/supabase/`, `src/hooks/useAuth.tsx`)
- Guards de rota (`CoachRoute`, `StudentRoute`, `AdminRoute`, `MenuRoute`)
- Headers de deploy (`netlify.toml`), arquivos públicos e `.gitignore`

---

## 3. Achados por severidade

### 🔴 ALTO

#### H-1. Bucket `anamnese-files` tornando público (dados de saúde)

**Onde:** `supabase/migrations/20260805170000_make_anamnese_bucket_public.sql`

```sql
UPDATE storage.buckets SET public = true WHERE id = 'anamnese-files';
CREATE POLICY "Anamnese files public read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'anamnese-files');
```

**Impacto:** o bucket armazena fotos, documentos de cirurgia, RG e arquivos de **limitação clínica** (coluna `limitacao_arquivo_url` da tabela `anamneses`). Qualquer pessoa com o URL pode ler os arquivos sem autenticação. Além disso, a política de upload permite que **qualquer usuário autenticado** envie arquivos arbitrários ao bucket (sem restrição de pasta/dono), o que pode ser usado para servir conteúdo arbitrário a partir do domínio do projeto.

**Classificação:** exposição de dados sensíveis (LGPD — saúde é dado pessoal sensível) + abuso de storage.

---

#### H-2. `get_strength_ranking()` vaza métricas de todos os alunos

**Onde:** `supabase/migrations/20260603203806_*.sql` (função `SECURITY DEFINER` executada por `authenticated`)

**Impacto:** a função retorna `name`, `avatar`, `sex`, `body_weight_kg` e 1RMs (squat/bench/deadlift) de **todos os alunos ativos para qualquer usuário autenticado** — incluindo qualquer aluno autocadastrado. Diferente do `get_ranking()` (que filtra por treinador/admin, top-4 ou self), esta função **não tem filtro do chamador**. É um vazamento transversal de PII + dados de saúde.

---

#### H-3. Super-admin definido por e-mail hardcoded

**Onde:** `supabase/migrations/20260601203029_*.sql` (funções `is_super_admin()`, `has_menu_access()`) e `supabase/functions/_shared/coach-auth.ts:52`

```ts
const isSuperAdmin = email === "brunorodriguesconsul@gmail.com";
```

**Impacto:** o eixo do modelo de privilégio é uma **string mágica** no banco e no código. Se o e-mail for comprometido ou o código vazado/alterado, o controle é total. Não há `coaches.id` vinculado, não há rotação de credenciais e as funções nunca tiveram `REVOKE EXECUTE FROM PUBLIC` (permanecem executáveis por qualquer papel).

---

### 🟠 MÉDIO

#### M-1. Políticas de INSERT abertas em `notifications` e `weekly_checkins`

**Onde:** migrations de criação das tabelas `notifications` e `weekly_checkins`

**Impacto:** as políticas `INSERT ... WITH CHECK (true)` **sem cláusula `TO`** valem para `public` (incluindo `anon`). Diferente das outras tabelas, estas não têm o padrão `REVOKE ALL FROM anon; GRANT ... TO authenticated`, então anon provavelmente mantém permissão de inserir. Resultado: abuso de escrita (spam de check-ins/notificações), mesmo sem leitura.

---

#### M-2. Aluno pode sobrescrever campos do treinador no check-in

**Onde:** política de UPDATE em `weekly_checkins` (toda a linha para `is_student_owner`)

**Impacto:** um aluno pode alterar `coach_comment`, `coach_commented_at` e `status` do próprio check-in, apagando/forjando a resposta do treinador. Falta proteção em nível de coluna (column-level security ou trigger).

---

#### M-3. Trigger de notificação assume `coaches.id == auth.users.id`

**Onde:** `supabase/migrations/20260730140000_autocadastro_anamnese_checkin.sql` (`fn_notify_checkin_response`)

**Impacto:** o trigger insere `coaches.id` em `notifications.user_id`, mas `coaches.id` é UUID aleatório **sem FK para `auth.users`**. As notificações podem ir para um usuário inexistente. A função `register-student` resolve corretamente o id do auth por e-mail — há inconsistência no modelo.

---

#### M-4. Ausência de headers de segurança na borda (Netlify)

**Onde:** `netlify.toml`

**Impacto:** não há **CSP**, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` nem `Permissions-Policy`. O `Cache-Control` para HTML é correto, mas sem CSP o app está exposto a XSS clássico em caso de qualquer injeção de HTML/script. O `Access-Control-Allow-Origin: *` nas Edge Functions é mitigado pelo `requireCoach`, porém em funções futuras sem essa verificação seria uma porta aberta.

---

#### M-5. Política de senha fraca

**Onde:** `supabase/functions/*/index.ts` (validação manual) e `supabase/config.toml` (sem seção `[auth]`)

**Impacto:** a única validação é `password.length >= 6`. Não há configuração de comprimento mínimo, bloqueio por senha comprometida ou reforço no nível do projeto Supabase. O `supabase/config.toml` não configura `[auth]` (site_url, min password length, etc.).

---

### 🟡 BAIXO

| ID | Achado | Onde |
|---|---|---|
| L-1 | Grants desnecessários: `EXECUTE` de `is_coach()`/`is_student_owner()` para `anon`; `is_super_admin()`/`has_menu_access()` nunca revogados de PUBLIC | migrations `20260601175717`, `20260601203029` |
| L-2 | Política redundante `"Anyone can view avatars"` coexistindo com `"Avatars public read"` | migration `20260403015928` |
| L-3 | Triggers sem `SET search_path` (`fn_anamnese_completed`, `fn_notify_checkin_response`) | migration `20260730140000` |
| L-4 | Colunas `updated_at` sem trigger em `anamneses` e `mobility_exercises` | migrations de criação |
| L-5 | Dados fixos em migrations (e-mails, UUIDs de `auth.users`, `DISABLE TRIGGER USER` em `20260609172934`) — não reproduzíveis em outro ambiente | migrations várias |
| L-6 | CORS `*` em todas as Edge Functions (aceitável hoje, frágil no futuro) | `supabase/functions/*` |
| L-7 | `verify_jwt = false` em 3 functions (`finance-chat`, `generate-recurring-transactions`, `parse-bank-statement`) — mitigado por `requireCoach` manual, mas qualquer regressão abre tudo | `supabase/config.toml` |

---

## 4. Pontos fortes identificados

- ✅ **RLS habilitado em todas as 32 tabelas**, com políticas restritivas por `auth.uid()` / e-mail do treinador na maioria.
- ✅ Políticas "abertas" (`USING (true)`) criadas em migrações antigas foram **remediadas** em `20260601175717` e leitura anon de ranking/podium revogada em `20260604155946`.
- ✅ **Nenhuma chave, senha ou service role em código**; functions usam `Deno.env.get(...)`.
- ✅ Functions de auth (`create-student-login`, `reset-student-password`) têm proteções extras: bloqueio de e-mail de treinador, verificação de senha comprometida (Supabase), self-heal de contas órfãs e **trilha de auditoria** (`student_password_reset_audit`).
- ✅ `find_auth_user_id_by_email` restrita a `service_role`.
- ✅ Guard de rota `prevent_student_sensitive_update` impede que alunos editem campos administrativos em `students`.
- ✅ `.env` e `*.zip` no `.gitignore`; controle de acesso por menu com auditoria (`coach_permissions`, `coach_permission_audit`).
- ✅ Realtime (`realtime.messages`) com autorização por tópico contendo o UUID do próprio aluno.
- ✅ `sitemap.xml` e `robots.txt` sem vazamento de rotas privadas.

---

## 5. Matriz resumo

| # | Severidade | Área | Achado | Esforço p/ corrigir |
|---|---|---|---|---|
| H-1 | 🔴 Alta | Storage | Bucket de anamnese público | Baixo |
| H-2 | 🔴 Alta | RLS/SQL | `get_strength_ranking()` sem filtro de chamador | Médio |
| H-3 | 🔴 Alta | Auth/Admin | Super-admin por e-mail hardcoded | Médio |
| M-1 | 🟠 Média | RLS | INSERT aberto em `notifications`/`weekly_checkins` | Baixo |
| M-2 | 🟠 Média | RLS | Aluno sobrescreve comentário do treinador | Médio |
| M-3 | 🟠 Média | Triggers | Notificação para id de coach errado | Médio |
| M-4 | 🟠 Média | Infra | Sem headers de segurança (CSP etc.) | Baixo |
| M-5 | 🟠 Média | Auth | Política de senha fraca | Baixo |
| L-1..L-7 | 🟡 Baixa | Diversos | Higiene de grants, CORS, triggeers, dados fixos | Baixo |

---

## 6. O que NÃO foi verificado

- **Pentest dinâmico** (testes de injeção, brute-force em produção).
- **Auditoria de terceiros** no banco/versões de dependências (`npm audit` pendente).
- **Práticas de deploy/CI** (quem acessa a conta Netlify, rotação de chaves).
- **Conformidade LGPD** completa (consentimento, DPO, política de retenção).

---

*Próximo passo: consulte [plano de implementação das melhorias de segurança](security-improvements-plan.md).*
