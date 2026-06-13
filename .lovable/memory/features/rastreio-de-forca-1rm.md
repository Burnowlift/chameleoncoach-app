---
name: 1RM Tracking (RPE × Reps)
description: Cálculo de 1RM via tabela RPE×Reps por levantamento (Squat/Bench/Deadlift), salva em rm_history, alimenta gráfico de evolução
type: feature
---
- Fórmula antiga (Brzycki) substituída por tabela RPE × Repetições por levantamento.
- Tabelas em `src/lib/rpe-tables.ts` (matriz por lift × RPE × reps 1-12). RPEs suportados: 5, 6, 7, 7.5, 8, 9, 10.
- Cálculo: `1RM = peso / percentual_da_tabela`, arredondado para 1 casa decimal.
- Componente `RmCalculatorDialog` no header da Área do Aluno; permite "Salvar no histórico" → grava em `rm_history` e atualiza PR via trigger existente.
- Auto-cálculo no fim de série SBD usa `calculate1RMFromRpe(lift, weight, reps, rpe)` em `useRmHistory.ts`; requer RPE >= 5 (real ou prescrito).
- Hook `useRmHistory` exporta `calculate1RMFromRpe` (Brzycki removido).
