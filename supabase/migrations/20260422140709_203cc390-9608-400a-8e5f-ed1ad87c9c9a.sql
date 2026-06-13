DELETE FROM public.finance_goal_contributions WHERE goal_id IN (SELECT id FROM public.finance_goals WHERE name = 'Teste Reserva');
DELETE FROM public.finance_goals WHERE name = 'Teste Reserva';
DELETE FROM public.finance_recurrences WHERE description LIKE 'TESTE%';
DELETE FROM public.finance_transactions WHERE description LIKE 'TESTE%';