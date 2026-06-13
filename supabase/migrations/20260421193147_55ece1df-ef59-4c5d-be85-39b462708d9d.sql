
-- Categorias
CREATE TABLE public.finance_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('empresa','pessoal')),
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#10b981',
  icon TEXT NOT NULL DEFAULT 'Circle',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to finance_categories" ON public.finance_categories FOR ALL USING (true) WITH CHECK (true);

-- Recorrências
CREATE TABLE public.finance_recurrences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('empresa','pessoal')),
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  category_id UUID REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  last_generated_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_recurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to finance_recurrences" ON public.finance_recurrences FOR ALL USING (true) WITH CHECK (true);

-- Transações
CREATE TABLE public.finance_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('empresa','pessoal')),
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  category_id UUID REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  recurrence_id UUID REFERENCES public.finance_recurrences(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_finance_transactions_date ON public.finance_transactions(date DESC);
CREATE INDEX idx_finance_transactions_scope ON public.finance_transactions(scope);

ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to finance_transactions" ON public.finance_transactions FOR ALL USING (true) WITH CHECK (true);

-- Metas (caixinhas)
CREATE TABLE public.finance_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#10b981',
  icon TEXT NOT NULL DEFAULT 'PiggyBank',
  deadline DATE,
  auto_percentage NUMERIC CHECK (auto_percentage IS NULL OR (auto_percentage > 0 AND auto_percentage <= 100)),
  auto_scope TEXT CHECK (auto_scope IS NULL OR auto_scope IN ('empresa','pessoal','both')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to finance_goals" ON public.finance_goals FOR ALL USING (true) WITH CHECK (true);

-- Contribuições para metas
CREATE TABLE public.finance_goal_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.finance_goals(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','auto')),
  transaction_id UUID REFERENCES public.finance_transactions(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goal_contributions_goal ON public.finance_goal_contributions(goal_id);

ALTER TABLE public.finance_goal_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to finance_goal_contributions" ON public.finance_goal_contributions FOR ALL USING (true) WITH CHECK (true);

-- Triggers de updated_at
CREATE TRIGGER update_finance_categories_updated_at BEFORE UPDATE ON public.finance_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_finance_recurrences_updated_at BEFORE UPDATE ON public.finance_recurrences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_finance_transactions_updated_at BEFORE UPDATE ON public.finance_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_finance_goals_updated_at BEFORE UPDATE ON public.finance_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: ao criar contribuição, atualiza current_amount da meta
CREATE OR REPLACE FUNCTION public.update_goal_current_amount()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.finance_goals SET current_amount = current_amount + NEW.amount WHERE id = NEW.goal_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.finance_goals SET current_amount = current_amount - OLD.amount WHERE id = OLD.goal_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER goal_contribution_updates_amount
AFTER INSERT OR DELETE ON public.finance_goal_contributions
FOR EACH ROW EXECUTE FUNCTION public.update_goal_current_amount();

-- Trigger: ao criar receita, gera aportes automáticos para metas configuradas
CREATE OR REPLACE FUNCTION public.auto_contribute_to_goals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  goal_record RECORD;
  contribution_amount NUMERIC;
BEGIN
  IF NEW.type <> 'income' THEN
    RETURN NEW;
  END IF;

  FOR goal_record IN
    SELECT * FROM public.finance_goals
    WHERE auto_percentage IS NOT NULL
      AND (auto_scope = 'both' OR auto_scope = NEW.scope)
  LOOP
    contribution_amount := ROUND((NEW.amount * goal_record.auto_percentage / 100)::numeric, 2);
    IF contribution_amount > 0 THEN
      INSERT INTO public.finance_goal_contributions (goal_id, amount, date, source, transaction_id, notes)
      VALUES (goal_record.id, contribution_amount, NEW.date, 'auto', NEW.id, 'Aporte automático de ' || goal_record.auto_percentage || '%');
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_contribute_on_income
AFTER INSERT ON public.finance_transactions
FOR EACH ROW EXECUTE FUNCTION public.auto_contribute_to_goals();

-- Seed de categorias padrão
INSERT INTO public.finance_categories (scope, type, name, color, icon, is_default) VALUES
  -- Empresa - receitas
  ('empresa','income','Mensalidades de Alunos','#10b981','Users',true),
  ('empresa','income','Consultorias Avulsas','#14b8a6','Briefcase',true),
  ('empresa','income','Outras Receitas','#06b6d4','TrendingUp',true),
  -- Empresa - despesas
  ('empresa','expense','Funcionários','#ef4444','UserCog',true),
  ('empresa','expense','Tráfego Pago','#f97316','Megaphone',true),
  ('empresa','expense','Edição de Vídeo','#a855f7','Video',true),
  ('empresa','expense','Ferramentas / Software','#6366f1','Wrench',true),
  ('empresa','expense','Impostos','#dc2626','Receipt',true),
  ('empresa','expense','Outras Despesas','#64748b','MoreHorizontal',true),
  -- Pessoal - receitas
  ('pessoal','income','Salário / Pró-labore','#3b82f6','Wallet',true),
  ('pessoal','income','Outras Entradas','#06b6d4','TrendingUp',true),
  -- Pessoal - despesas
  ('pessoal','expense','Moradia','#8b5cf6','Home',true),
  ('pessoal','expense','Alimentação','#f59e0b','UtensilsCrossed',true),
  ('pessoal','expense','Transporte','#0ea5e9','Car',true),
  ('pessoal','expense','Saúde','#ec4899','Heart',true),
  ('pessoal','expense','Lazer','#a855f7','Gamepad2',true),
  ('pessoal','expense','Reserva de Emergência','#10b981','Shield',true),
  ('pessoal','expense','Outros','#64748b','MoreHorizontal',true);
