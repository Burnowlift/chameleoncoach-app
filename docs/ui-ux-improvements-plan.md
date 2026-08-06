# 🎨 Plano de Melhorias — UI/UX, Evolução, Gamificação e Offline

> Objetivo: tornar a plataforma mais fácil de **ver e comparar dados de treinos passados**, com gráficos de evolução melhores, experiência mais gamificada, e um app que **funciona offline** persistindo dados localmente.

---

## 1. Princípios guia

1. **Histórico primeiro:** todo dado de treino deve ter uma "linha do tempo" visível — nada de dados que somem depois da semana acabar.
2. **Comparar é mais valioso que registrar:** cada sessão deve mostrar "o que foi feito antes" (mesmo exercício, semanas anteriores).
3. **Progresso visível em 3 segundos:** números grandes, deltas (+5kg), barras e anéis de progresso.
4. **Gamificação de reforço, não de competição forçada:** XP, streaks e conquistas celebram consistência.
5. **Offline como cidadão de primeira classe:** treinar na academia sem sinal não pode travar o registro.

---

## 2. Fase 1 — Histórico de treinos passados (prioridade máxima)

### Problemas atuais
- `exercise_logs` guarda tudo, mas o aluno só vê a **semana atual** (`SessionsView` em `StudentDashboard.tsx`) — treinos antigos ficam presos na navegação bloco → semana.
- O treinador vê logs apenas dentro de `BlockSessions.tsx` (semana a semana), sem visão consolidada.
- Não existe comparação "última vez que fiz esse exercício".

### 2.1 — Timeline de treinos do aluno
**Novo: aba "Meu Histórico"** (`/aluno/historico`) com timeline por **data real** dos logs (`exercise_logs.created_at`), não pela estrutura do bloco:

- Cada entrada = sessão treinada com data, nome da sessão/bloco, e resumo:
  - Exercícios realizados (badges) + séries/reps principais
  - Volume total (kg) e RPE médio do dia
  - Status: ✅ concluída / ⏳ parcial
- Agrupamento por "Esta semana", "Semana passada", "Há 2 semanas", datas absolutas (date-fns, locale pt-BR)
- Scroll infinito/paginação por data; pull-to-refresh (já previsto no plano mobile)

### 2.2 — Comparação sessão a sessão
Dentro da tela de treino do dia (e no histórico), cada exercício mostra um chip **"Última vez: 40kg × 8 @RPE7"** e um **delta**:

- `+2.5kg` (verde, ▲) se subiu vs última execução do mesmo exercício
- `−2.5kg` (âmbar, ▼) se caiu — sem drama, só informação
- Mesma sessão semana anterior → destaque "Semana passada: 3x8 @75%"
- Botão "Ver evolução deste exercício" → abre o gráfico dedicado (Fase 2)

**Fonte de dados:** `useExerciseLogs` (já carrega todos os logs do aluno) + `sets_data` para detalhe por série. Custo: zero queries novas — só agregação em memória.

### 2.3 — Timeline do treinador
Em `StudentProfile.tsx` (aba Treinos), nova visão **"Histórico de Treinos"**:

- Linha do tempo consolidada de todas as semanas com **índice de execução** (exercícios concluídos ÷ prescritos)
- Badge de volume total por semana + gráfico mini (sparkline) de volume/aderência
- Click em uma semana → abre `BlockSessions` naquela semana (reuso da rota existente)
- Filtros: por bloco, por exercício, por período (últimos 30/90 dias)

### 2.4 — Busca de exercício
- Campo de busca no histórico: digitar "supino" → mostra **todas** as execuções de supino com data, peso e reps, e a evolução (mini sparkline + melhor execução).
- Reutiliza `useExerciseLogs` + índice por `exercise_id`.

### Entregáveis (arquivos)
| Componente | Descrição |
|---|---|
| `src/pages/StudentHistory.tsx` + rota `/aluno/historico` | Timeline do aluno (2.1, 2.2) |
| `src/components/LastPerformaceChip.tsx` | Delta da última execução por exercício |
| `src/components/HistoryTimeline.tsx` | Lista de sessões agrupadas por data |
| Aba em `StudentProfile.tsx` | Timeline do treinador + filtros (2.3) |
| `src/components/ExerciseHistorySearch.tsx` | Busca por exercício (2.4) |

---

## 3. Fase 2 — Gráficos de evolução

### Estado atual
- `RmEvolutionChart.tsx` (596 linhas) já tem: período (30/90/180d/todo), seletor de lift (SQ/BP/DL), área com `ReferenceLine` do 1RM atual e lista de PRs.
- `BodyWeightHistorySection.tsx` registra peso corporal separado.
- Não há gráfico de volume, RPE ou aderência; não há comparativo entre lifts; não há médias móveis.

### 3.1 — Melhorias no gráfico de 1RM (`RmEvolutionChart`)
- **Overlay multi-lift:** toggle para ver SQ/BP/DL juntos (normalizados ou eixos separados) — ver progresso relativo de uma vez
- **Média móvel de 3 pontos** (suaviza ruído do treino a treino)
- **Marcadores de PR** com anotação (data + "PR novo! 🎉" na tooltip)
- **Comparação com melhor histórico** — linha pontilhada do topo
- Filtro por exercício específico (não só SBD): dados de `rm_history.exercise_id`
- **Modo "evolução por tempo"** (dias desde o início) além de "por data"

### 3.2 — Novos gráficos
| Gráfico | Dados | Onde |
|---|---|---|
| **Volume semanal** (barra) | soma de `sets_data.weight × reps` por semana | Dashboard do aluno + perfil do treinador |
| **RPE médio por semana** (linha 1–10) | `actual_rpe` dos logs | Dashboard do aluno |
| **Aderência** (barra 0–100%) | sessões concluídas ÷ prescritas (por semana) | Perfil do treinador |
| **Peso corporal** (área) | `body_weight_history` — integrado ao dashboard com meta opcional (linha alvo) | Dashboard do aluno |
| **Sparklines embutidos** | mini-tendência em cada exercício do histórico | Histórico (Fase 1) |

### 3.3 — Cards de resumo ("Numbers first")
- Dashboard do aluno: cards grandes e coloridos — **Volume da semana**, **Dias treinados**, **PR mais recente**, **Streak atual**
- Cada card com delta vs semana anterior (▲/▼ + valor)
- Todos com fallback elegante quando não há dados ("Registre seu primeiro treino")

### Entregáveis
| Componente | Descrição |
|---|---|
| Melhorias em `RmEvolutionChart.tsx` | Overlay, média móvel, PR markers, filtro por exercício |
| `src/components/VolumeChart.tsx` | Volume semanal (barra) |
| `src/components/RpeTrendChart.tsx` | RPE médio semanal (linha) |
| `src/components/AdherenceChart.tsx` | Aderência semanal (barra %), visão do treinador |
| `src/components/SummaryStatCards.tsx` | Cards de resumo com delta |

---

## 4. Fase 3 — Gamificação

### Estado atual
- Já existe: **XP system**, rankings (força e geral), pódio (`PodiumNotifications`, `podium_events`), campeonato com pedidas, `ranking_archive`.

### 4.1 — Streaks (sequências)
- **Streak de treino:** dias consecutivos com pelo menos 1 exercício logado (`exercise_logs.created_at`)
- **Streak de check-in:** semanas seguidas respondendo o `weekly_checkins`
- UI: contador de 🔥 no dashboard, "X semanas seguidas", aviso "Treine hoje para não perder sua sequência!"
- Dados: derivados dos logs (sem tabela nova)

### 4.2 — Conquistas / Medalhas
- Tabela `achievements` (aluno_id, tipo, conquistado_em) ou derivação por função SQL estilo `get_ranking`
- Exemplos: "Primeiro treino", "10 treinos", "PR em supino", "Streak 7 dias", "Check-in em dia", "Membro do pódio"
- UI: grid de medalhas no perfil do aluno com estados conquistado/bloqueado (cinza) + toast de celebração ao desbloquear
- Reaproveitar o sistema de `podium_events`/notificações para o momento de conquista

### 4.3 — Metas semanais com anel de progresso
- Anel circular no dashboard: progresso da meta da semana (ex.: "4 de 5 treinos")
- Meta configurável pelo treinador (frequência do bloco atual já existe em `training_blocks.frequency`)
- Ao completar: animação + XP bônus (integrar com o XP já existente)

### 4.4 — Feedback de PR
- Ao registrar 1RM novo (`useRmHistory.addRecord` detecta valor > histórico): confete (canvas leve), vibração (`navigator.vibrate(80)` no Android), toast "NOVO PR! 🎉"
- Registrar no `rm_history` com flag `is_personal_record` (coluna nova ou calculada)

### 4.5 — Nível e XP mais visíveis
- Barra de XP com nível no header do aluno (já existe XP — falta visualização)
- Animações de progresso ao ganhar XP (número que "sobe")

### Entregáveis
| Componente | Descrição |
|---|---|
| `src/hooks/useStreaks.ts` | Cálculo de streaks a partir de logs/checkins |
| `src/components/StreakBadge.tsx` | Contador 🔥 com tooltip |
| `src/components/AchievementsGrid.tsx` + tabela `achievements` | Medalhas + desbloqueio |
| `src/components/WeeklyGoalRing.tsx` | Anel de progresso da meta semanal |
| `src/lib/confetti.ts` + integração em `RmEvolutionChart`/dashboard | Feedback de PR |
| Upgrade na barra de XP do header | Nível + progresso animado |

---

## 5. Fase 4 — Persistência local + PWA offline-first

### 5.1 — Camada de cache local
- **TanStack Query `persistQueryClient`** (persistência em localStorage/IndexedDB):
  - Cachear com TTL: logs de treino (`useExerciseLogs`), blocos, check-ins, peso corporal
  - **Regra de privacidade:** dados de saúde (anamnese, fotos) e finanças **nunca** vão para localStorage
- Fonte da verdade continua no Supabase; cache serve como leitura instantânea + fallback offline

### 5.2 — Fila de escrita offline
- Hook `useOfflineQueue` (IndexedDB via `idb-keyval` — leve):
  - Ao `upsertLog`/check-in com `navigator.onLine === false` → grava na fila local com `{tipo, payload, criadoEm}`
  - Ao voltar a ficar online → drena a fila (replay) na ordem, com **idempotência**: upsert por chave composta `(student_id, block_id, week_number, session_id, exercise_id)` — o backend já faz `update` se existir (`useExerciseLogs.upsertLog` reutilizável)
  - Badge "2 registros pendentes de sincronização" + botão "Sincronizar agora"
- **Background Sync** (`sync.register('sync-logs')`) como melhoria futura quando o SW registrar

### 5.3 — Service worker: abrir o app sem internet
- **Já implementado:** precache do shell (52 entradas), `navigateFallback: /index.html` → o app **abre** offline
- **Melhorias nesta fase:**
  - Banner "Você está offline" (componente global, escuta `online`/`offline`)
  - Cache `NetworkFirst` com TTL curto (60s) para API Supabase de dados **não sensíveis** (exercícios, templates, mobility) — lista de allowlist explícita
  - Página de "Sem conexão" amigável no lugar de tela branca quando dados não estão em cache
  - `index.html` nunca em cache persistente com dados de sessão (já é `must-revalidate`)

### 5.4 — UX de sincronização
- Ícone de status no header: ☁️ sincronizado / ⏳ pendente / 📴 offline
- Ao abrir offline com dados em cache: toasts informativos "Modo offline — seus registros serão sincronizados quando a conexão voltar"
- Conflito simples: **última escrita vence** (upsert idempotente por chave composta) — suficiente para o modelo atual

### Entregáveis
| Componente | Descrição |
|---|---|
| `src/lib/offline-queue.ts` | Fila em IndexedDB + driver de replay |
| `src/lib/offline-status.tsx` | Provider `useOfflineStatus` (online/offline) + banner |
| Integração em `useExerciseLogs`/`useCheckins` | Write-through com fallback offline |
| `vite.config.ts` runtimeCaching | Allowlist de API não sensível |
| `src/components/SyncStatusBadge.tsx` | Estado de sincronização no header |

---

## 6. Priorização

| Fase | Itens | Esforço |
|---|---|---|
| **F1** Histórico | Timeline aluno + chips de comparação + timeline treinador + busca | M |
| **F2** Gráficos | Overlay 1RM, volume/RPE/aderência, cards de resumo | M |
| **F3** Gamificação | Streaks, metas com anel, PR com confete, XP visível, medalhas | M |
| **F4** Offline | Persistência TanStack, fila de escrita, banner offline, runtimeCaching | M |

**Ordem recomendada:** F1 (maior valor percebido) → F4 (base para o resto) → F2 → F3.

---

## 7. Critérios de aceite (F1 + F4)

1. Aluno abre "Meu Histórico" e vê todos os treinos passados com data, volume e RPE do dia, sem navegar por bloco/semana.
2. Em qualquer exercício, o chip "Última vez" mostra o delta (+/-kg) em < 1 clique.
3. Treinador vê a aderência semanal consolidada de um aluno sem abrir semana por semana.
4. Com o app aberto e **modo avião**, o aluno abre o app, navega e registra um treino; ao voltar a conexão, os registros sincronizam automaticamente.
5. Nenhum dado de anamnese/finanças vai para localStorage.
6. Testes: Vitest para `offline-queue` e cálculo de streaks; Playwright mobile para fluxo offline (Lighthouse ≥ 90).

---

## 8. Relação com outros planos

- [Mobile + PWA](mobile-pwa-plan.md) — base instalável; F4 complementa com dados offline
- [Segurança](security-improvements-plan.md) — regra "dados de saúde nunca em localStorage" deve ser validada na revisão de privacidade (LGPD)

---

## 9. Status de implementação (atualizado em 06/08/2026)

| Item | Status | Notas |
|---|---|---|
| **F1 — Timeline do aluno** (`/aluno/historico`) | ✅ Implementado | `src/pages/StudentHistory.tsx` + rota no `App.tsx`; cards de stats (treinos, exercícios concluídos, volume), agrupamento por dia (Hoje/Ontem/data), busca por exercício, delta ▲/▼ por exercício |
| **F1 — Chips "Última vez"** | ✅ Implementado | Em `StudentDashboard.tsx` (`SessionsView`): cada exercício mostra última execução (peso × séries @RPE, data) + delta vs registro atual |
| **F1 — Timeline do treinador** (2.3) | ✅ Implementado | `StudentHistoryTimeline.tsx` na aba Treinos do perfil: resumo (semanas registradas, aderência média, volume total), gráfico de aderência semanal (últimas 12 semanas, cores por faixa), lista de semanas com barra de execução e botão "Ver semana" (`/students/:id/workout/:blockId/week/:n`) |
| **F2 — Gráficos** | ✅ Implementado | `RmEvolutionChart`: modo "Comparar 3" (SQ/BP/DL no mesmo gráfico com tooltip multi-lift), "Média móvel" (3 pontos), marcadores de PR (estrelas douradas + "Novo PR!" na tooltip). Novos: `VolumeChart` (volume semanal, 12 semanas), `RpeTrendChart` (RPE médio semanal com linha de referência RPE 7), sparklines de carga por exercício no histórico (`WeightSparkline`) e cards de resumo no dashboard (treinos na semana, volume com delta vs semana anterior, sequência, maior 1RM) |
| **F3 — Gamificação** | ✅ Implementado | `streaks.ts` (sequência de treinos com regra de não-quebra no dia atual), `achievements.ts` (9 conquistas derivadas: primeiro treino, 10 sessões, 50 séries, 1t de volume, PRs por lift, sequências 3/7 dias) + `AchievementsGrid` no dashboard, `WeeklyGoalRing` (anel de meta semanal vs frequência do bloco), `PrCelebration` (confete em canvas + vibração + toast ao bater novo PR, evento `chameleon:pr`). Correção: o plano citava "sistema de XP existente" — não existe; substituído por conquistas/streaks |
| **F4 — Fila offline + cache** | ✅ Implementado | Abordagem ajustada: em vez de `persistQueryClient` (o app não usa TanStack Query para dados de treino), criou-se camada própria: `src/lib/offline-cache.ts` (localStorage p/ leitura: logs, blocos, perfil, semanas concluídas) + `src/lib/offline-store.ts` (IndexedDB) + `src/lib/offline-queue.ts` (fila de escrita) + `src/lib/supabase-sync.ts` (replay idempotente) + `src/hooks/useOfflineStatus.tsx` (provider, drain automático ao reconectar) + `src/components/OfflineManager.tsx` (banner offline com contador de pendências). `useExerciseLogs`, `useTrainingBlocks`, `useRmHistory` e o dashboard (perfil, semanas) gravam localmente quando offline |
| **F4 — Cache de API no SW** | ⏳ Pendente | Substituído por cache em nível de app (mais seguro, sem dados de auth no SW); runtimeCaching de API não foi adicionado de propósito |
| **F4 — Background Sync** | ✅ Implementado | SW convertido para `injectManifest` (`public/sw.ts`): handler `sync` com tag `chameleon-sync` avisa os clientes abertos (mensagem `chameleon:sync`) para drenar a fila; `enqueueAction` registra o sync tag; navegação offline cai no `index.html` precacheado; cache de imagens R2 mantido no SW. **Nota:** a drenagem real continua no app (requer IndexedDB + Supabase) — o Background Sync acorda clientes abertos; com o app fechado, a drenagem ocorre no próximo `online`/abertura |
| **F4 — Medalhas com tabela no banco** | ⏳ Pendente | Conquistas são derivadas no cliente (`achievements.ts`); tabela `achievements` exige migration — aguarda `supabase db push` (login pendente) |
| **F4 — Notificações in-app (Realtime)** | ✅ Implementado | `NotificationBell` + `useNotifications` no header do treinador e do aluno (badge, painel, marcar lidas, atualização via `postgres_changes`) |
| **F4 — Web Push (Opção A do plano mobile)** | ⚙️ Codificado | SW `push`/`notificationclick`, tabela `push_subscriptions` (migração `20260807000000`), Edge Function `register-push-subscription`, toggle no sino, VAPID keys + `scripts/send-push.js`; ativação depende do `supabase db push` + `functions deploy` |

**Pendências de segurança (fora deste plano):** CLI do Supabase instalado (`supabase` v2.111.0), mas as 5 migrations (`20260806120000` a `20260806120400`), a nova migração `20260807000000` (push_subscriptions) e o deploy das Edge Functions (incluindo `register-push-subscription`) ainda **não foram aplicados** — aguardando `supabase login` + `supabase db push` + `supabase functions deploy`.

**Fora do plano:** label "Sexo biológico" renomeada para "Sexo" em `StudentAnamnese.tsx`, `StudentRegister.tsx` e na Edge Function `register-student`.
