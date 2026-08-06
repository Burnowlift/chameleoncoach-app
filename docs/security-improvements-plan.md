# 🛡️ Plano de Implementação — Melhorias de Segurança

> Baseado no [Relatório de Segurança](security-report.md). Prioridades: **P0 (corrigir já)**, **P1 (curto prazo)**, **P2 (médio prazo)**, **P3 (contínuo)**.

## ✅ Status de implementação (06/08/2026)

| Item | Status |
|---|---|
| **0.1** — Bucket `anamnese-files` privado + signed URLs no frontend | ✅ Migrations `20260806120000` + `SignedAnamneseFile`/`useSignedFileUrl` |
| **0.2** — `get_strength_ranking()` filtrado (coach/admin, top-4 ou self) | ✅ Migration `20260806120100` |
| **0.3** — Super-admin por e-mail hardcoded | ⏸️ **Adiado por decisão do time** (único mecanismo de admin por enquanto) |
| **1.1** — INSERT de `notifications`/`weekly_checkins` fechado para anon | ✅ Migration `20260806120200` (coach pode inserir check-in — recurso "Forçar check-in") |
| **1.2** — Proteção column-level dos campos do coach no check-in | ✅ Migration `20260806120300` (trigger `trg_protect_checkin_coach_fields`) |
| **1.3** — Trigger de notificação resolve `auth.users.id` correto | ✅ Migration `20260806120400` |
| **1.4** — Headers de segurança (CSP, HSTS, frame, referrer) | ✅ `netlify.toml` |
| **1.5** — Senha mínima 8 + letras/números (frontend + edge functions + `config.toml` `[auth]`) | ✅ |
| P2/P3 (auditoria, rate limit, FK coaches↔auth, LGPD) | ⏳ Próximas fases (abaixo) |

---

## Fase 0 — Correções críticas (P0)

> Corrigem as 3 vulnerabilidades de severidade alta. Devem entrar na primeira janela de deploy.

### 0.1 — Remover acesso público ao bucket `anamnese-files`

**Problema (H-1):** bucket público + política de upload aberta.

**Ações:**

1. Criar migration `2026XXXX_revoke_public_anamnese_bucket.sql`:
   ```sql
   -- 1) Remove o acesso público
   UPDATE storage.buckets
   SET public = false
   WHERE id = 'anamnese-files';

   -- 2) Remove as policies permissivas
   DROP POLICY IF EXISTS "Anamnese files public read" ON storage.objects;
   DROP POLICY IF EXISTS "Students can upload anamnese files" ON storage.objects;

   -- 3) Leitura: só o aluno dono e o treinador
   CREATE POLICY "Owner can read own anamnese files"
     ON storage.objects FOR SELECT TO authenticated
     USING (
       bucket_id = 'anamnese-files'
       AND (storage.foldername(name))[1] = auth.uid()::text
     );

   CREATE POLICY "Coach can read student anamnese files"
     ON storage.objects FOR SELECT TO authenticated
     USING (
       bucket_id = 'anamnese-files'
       AND EXISTS (
         SELECT 1 FROM public.anamneses a
         JOIN public.students s ON s.id = a.student_id
         WHERE a.fotos::text LIKE '%' || (storage.foldername(name))[1] || '%'
           AND EXISTS (SELECT 1 FROM public.coaches c WHERE c.email = auth.jwt() ->> 'email')
       )
     );

   -- 4) Upload: somente o próprio aluno, na própria pasta
   CREATE POLICY "Owner can upload own anamnese files"
     ON storage.objects FOR INSERT TO authenticated
     WITH CHECK (
       bucket_id = 'anamnese-files'
       AND (storage.foldername(name))[1] = auth.uid()::text
     );
   ```
   > Se a pasta padrão atual não for `auth.uid()`, ajuste o upload no frontend para gravar em `<userId>/<arquivo>`.

2. **Frontend:** alterar `StudentAnamnese.tsx` e `StudentProfile.tsx` para usar `supabase.storage.from('anamnese-files').getSignedUrl(...)` em vez de `getPublicUrl()`.

3. **Limpeza:** criar script para listar objetos sem dono (pasta vazia) e deletá-los via admin.

4. **Validação:** `supabase db push` em staging + teste manual: deslogado → 401/403 no URL; aluno A não lê arquivo do aluno B; treinador lê.

---

### 0.2 — Corrigir vazamento do `get_strength_ranking()`

**Problema (H-2):** função `SECURITY DEFINER` expõe força/peso/sexo de todos os alunos a qualquer autenticado.

**Ações:**

1. Reescrever a função espelhando o filtro do `get_ranking()` (coach/admin, self, ou top-N):
   ```sql
   CREATE OR REPLACE FUNCTION public.get_strength_ranking()
   RETURNS TABLE (...)
   LANGUAGE sql SECURITY DEFINER SET search_path = public
   AS $$
     WITH caller AS (
       SELECT
         (auth.jwt() ->> 'email') AS email,
         (SELECT c.id FROM public.coaches c WHERE lower(c.email) = lower(auth.jwt() ->> 'email')) AS coach_id,
         auth.uid() AS uid
     )
     SELECT ... FROM public.students s
     WHERE
       s.active = true
       AND (
         (SELECT coach_id FROM caller) IS NOT NULL   -- treinador vê tudo
         OR s.user_id = (SELECT uid FROM caller)      -- aluno vê só a própria linha
         OR s.rank <= 4                               -- ou top-4 (ranking público)
       )
     ORDER BY ...;
   $$;
   ```

2. Manter o `REVOKE EXECUTE FROM anon` já existente.

3. **Teste:** rodar como aluno autocadastrado e confirmar que a resposta contém apenas a própria linha (ou top-4 se aplicável).

---

### 0.3 — Eliminar super-admin por e-mail hardcoded

**Problema (H-3):** eixo de privilégio é `'brunorodriguesconsul@gmail.com'` em SQL e TS.

**Ações:**

1. **Migration:** adicionar flag na tabela `coaches`:
   ```sql
   ALTER TABLE public.coaches ADD COLUMN is_super_admin boolean NOT NULL DEFAULT false;
   UPDATE public.coaches SET is_super_admin = true WHERE email = 'brunorodriguesconsul@gmail.com';
   ALTER TABLE public.coaches ADD COLUMN auth_user_id uuid; -- vincular ao auth.users (opcional mas recomendado)
   ```
2. **Reescrever** `is_super_admin()` e `has_menu_access()` para consultar `coaches.is_super_admin` via `security definer` com `SET search_path = public`, **sem** e-mail mágico:
   ```sql
   CREATE OR REPLACE FUNCTION public.is_super_admin()
   RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
     SELECT EXISTS (
       SELECT 1 FROM public.coaches
       WHERE lower(email) = lower(auth.jwt() ->> 'email') AND is_super_admin
     );
   $$;
   REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM public, anon, authenticated;
   ```
3. **Edge Function `_shared/coach-auth.ts`:** substituir a comparação de e-mail pelo mesmo lookup na coluna `is_super_admin` (usar `coach.is_super_admin` em vez de e-mail).
4. **Frontend:** ajustar onde `isSuperAdmin` é usado para ler da coluna.
5. **Higiene:** `REVOKE EXECUTE ... FROM anon` para `is_coach()`/`is_student_owner()` e `REVOKE EXECUTE FROM public` para `has_menu_access()`.

---

## Fase 1 — Endurecimento do banco (P1)

> Correções de severidade média, curto prazo (1–2 sprints).

### 1.1 — Fechar INSERT de `notifications` e `weekly_checkins`

- Adicionar `TO service_role` nas policies de INSERT (`CREATE POLICY ... FOR INSERT TO service_role WITH CHECK (true)`).
- Adicionar às duas tabelas o padrão de grants das demais:
  ```sql
  REVOKE ALL ON public.notifications FROM anon;
  REVOKE ALL ON public.weekly_checkins FROM anon;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
  GRANT SELECT, UPDATE ON public.weekly_checkins TO authenticated;
  ```

### 1.2 — Proteger campos do treinador no check-in (column-level)

- **Opção A (simples):** trigger `BEFORE UPDATE ON weekly_checkins` que restaura `coach_comment`, `coach_commented_at`, `status` aos valores originais quando `auth.uid()` ≠ coach.
- **Opção B (robusta):** policies `FOR UPDATE` com `WITH CHECK` em colunas — via trigger, já que RLS não faz column-level nativamente.
- Testar: aluno edita check-in → campos do treinador intactos.

### 1.3 — Corrigir trigger de notificação (`fn_notify_checkin_response`)

- Resolver o id do coach via `auth.users` (busca por e-mail, como no `register-student`) ou adicionar FK/coluna `coaches.auth_user_id` (criada em 0.3) e usá-la no trigger.
- Adicionar `SET search_path = public` nos dois triggers de `20260730140000`.

### 1.4 — Headers de segurança no `netlify.toml`

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
```

- **CSP** (etapa seguinte): começar com `Content-Security-Policy` em modo reporte e ir restringindo. Incluir `frame-ancestors 'none'` e `default-src 'self'` + origens do Supabase (`https://*.supabase.co`, `wss://*.supabase.co`, R2, `https://ai.gateway.lovable.dev` para as functions, e `data:`/`blob:` para uploads e imagens).
- **Observação:** `wasm-unsafe-eval`/`script-src` precisarão de ajuste fino com Vite — testar no staging.

### 1.5 — Política de senha no `supabase/config.toml`

```toml
[auth]
min_password_length = 10
enable_signup = false        # se o autocadastro for feito via edge function
```

- Reforçar validação no frontend (Zod) e nas Edge Functions (`password.length >= 10` + regras de complexidade).

---

## Fase 2 — Melhorias estruturais (P2)

> Médio prazo (2–4 sprints).

### 2.1 — Auditoria e observabilidade
- Ativar `pg_stat_statements` + alertas de erro de auth no painel Supabase.
- Registrar eventos sensíveis em tabela de auditoria única (`audit_logs`) — logins, resets, mudanças de permissão, uploads de anamnese.
- Monitorar logs das Edge Functions (Lovable/Netlify) para abuso.

### 2.2 — Rate limiting e proteção de abuso
- Habilitar rate limit no **Supabase Auth** para `/token` e `/signup` (planos Enterprise/paid) ou usar gateway (Netlify Edge Functions/Cloudflare) para login e `register-student`.
- Limitar tamanho/payload das Edge Functions (`parse-bank-statement`: max 10MB de base64) e tempo de execução.

### 2.3 — Modelo de acesso revisado
- Vincular `coaches.id ↔ auth.users.id` (FK) — migração de dados + constraint.
- Estudar migração de "e-mail match" para `auth_user_id` em todas as policies de coach (`is_coach()`).
- Remover colunas PII desnecessárias de políticas de SELECT (princípio do menor privilégio).

### 2.4 — Hygiene de banco
- Dropar política redundante `"Anyone can view avatars"`.
- Adicionar triggers `updated_at` em `anamneses` e `mobility_exercises`.
- Padronizar migrations sem dados fixos (usar parâmetros/secrets; nunca `DISABLE TRIGGER USER` em migração).
- Rodar `REVOKE ALL ON FUNCTION ... FROM anon` numa migration "sweep" para todas as funções públicas desnecessárias.

### 2.5 — Realtime
- Restringir `supabase_realtime` a tabelas realmente necessárias; garantir `REPLICA IDENTITY FULL` apenas onde preciso.
- Validar que os nomes de canal sempre carregam o `user_id` do dono.

---

## Fase 3 — Contínuo (P3)

### 3.1 — Pipeline de segurança
- `npm audit`/`bun audit` no CI com falha em vulnerabilidades críticas.
- Adicionar `eslint-plugin-security` e regras do TypeScript estrito (`noUncheckedIndexedAccess`).
- **Renovação periódica** de chaves (anon/URL não são secretos, mas service role e `LOVABLE_API_KEY` devem ser rotacionados) e revisão de acessos Netlify/Supabase.

### 3.2 — Testes de segurança
- Ampliar `scripts/test_policies.js` com casos negativos (aluno A lendo aluno B, anon lendo tabelas).
- Playwright: fluxo de upload/leitura de anamnese autenticado vs anônimo.
- Revisar `get_strength_ranking` e `get_ranking` a cada mudança de schema.

### 3.3 — LGPD / privacidade
- Política de privacidade + termos visíveis no cadastro.
- Consentimento explícito para coleta de dados de saúde (anamnese).
- Definir retenção/eliminação de dados (`DELETE`/anonymize em `anamneses` e `body_weight_history`).
- Documentar DPA com a Supabase (data processing agreement).

---

## Cronograma sugerido

| Fase | Entregas | Prazo |
|---|---|---|
| **P0** | Bucket anamnese privado, ranking filtrado, super-admin por coluna | 1ª semana |
| **P1** | Policies de INSERT, column-level check-in, trigger de notificação, headers + CSP, senha forte | 2ª–3ª semana |
| **P2** | Auditoria, rate limit, FK coaches↔auth, hygiene SQL | 1–2 meses |
| **P3** | CI de segurança, testes, LGPD | Contínuo |

---

## Critérios de aceite (P0)

1. Sem autenticação, nenhum URL de `anamnese-files` retorna o arquivo (401/403).
2. Aluno autenticado só lê/upoada arquivos na própria pasta.
3. `get_strength_ranking()` como aluno retorna no máximo a própria linha + top-4; como treinador, tudo.
4. Nenhum e-mail hardcoded no código ou SQL; promoção de super-admin feita por flag na tabela `coaches`.
5. Todos os testes de políticas (`scripts/test_policies.js`) passam com os novos casos.
