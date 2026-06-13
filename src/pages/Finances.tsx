import { useMemo } from "react";
import { CoachLayout } from "@/components/CoachLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScopeFinancePanel } from "@/components/finance/ScopeFinancePanel";
import { FinanceChatPanel } from "@/components/finance/FinanceChatPanel";
import { Building2, User, Sparkles, LayoutDashboard, Eye } from "lucide-react";
import { useFinanceTransactions } from "@/hooks/useFinances";
import { useAuth } from "@/hooks/useAuth";
import { isAdminCoach } from "@/lib/admin";

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Overview() {
  const { data: txs = [] } = useFinanceTransactions();
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTxs = txs.filter((t) => new Date(t.date) >= monthStart);
    const calc = (scope: "empresa" | "pessoal") => {
      const f = monthTxs.filter((t) => t.scope === scope);
      const inc = f.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const exp = f.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      return { inc, exp, balance: inc - exp };
    };
    return { empresa: calc("empresa"), pessoal: calc("pessoal") };
  }, [txs]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-emerald-500" /> Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between"><span className="text-muted-foreground text-sm">Entradas</span><span className="font-mono text-emerald-500">{fmtBRL(stats.empresa.inc)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground text-sm">Saídas</span><span className="font-mono text-rose-500">{fmtBRL(stats.empresa.exp)}</span></div>
          <div className="flex justify-between border-t pt-2"><span className="font-medium">Saldo do mês</span><span className={`font-mono font-bold ${stats.empresa.balance >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{fmtBRL(stats.empresa.balance)}</span></div>
        </CardContent>
      </Card>
      <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-indigo-500" /> Pessoal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between"><span className="text-muted-foreground text-sm">Entradas</span><span className="font-mono text-indigo-500">{fmtBRL(stats.pessoal.inc)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground text-sm">Saídas</span><span className="font-mono text-rose-500">{fmtBRL(stats.pessoal.exp)}</span></div>
          <div className="flex justify-between border-t pt-2"><span className="font-medium">Saldo do mês</span><span className={`font-mono font-bold ${stats.pessoal.balance >= 0 ? "text-indigo-500" : "text-rose-500"}`}>{fmtBRL(stats.pessoal.balance)}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Finances() {
  const { user } = useAuth();
  const readOnly = !isAdminCoach(user?.email);

  return (
    <CoachLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Gestão Financeira</h1>
            <p className="text-muted-foreground">Controle separado da sua empresa e finanças pessoais.</p>
          </div>
          {readOnly && (
            <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              Acesso somente leitura
            </div>
          )}
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className={`grid ${readOnly ? "grid-cols-3" : "grid-cols-4"} w-full max-w-2xl`}>
            <TabsTrigger value="overview"><LayoutDashboard className="h-4 w-4 mr-1" /> Visão</TabsTrigger>
            <TabsTrigger value="empresa" className="data-[state=active]:text-emerald-500"><Building2 className="h-4 w-4 mr-1" /> Empresa</TabsTrigger>
            <TabsTrigger value="pessoal" className="data-[state=active]:text-indigo-500"><User className="h-4 w-4 mr-1" /> Pessoal</TabsTrigger>
            {!readOnly && <TabsTrigger value="ia"><Sparkles className="h-4 w-4 mr-1" /> IA</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview"><Overview /></TabsContent>
          <TabsContent value="empresa">
            <ScopeFinancePanel scope="empresa" accentClass="text-emerald-500" bgAccentClass="bg-emerald-500/5 border-emerald-500/20" readOnly={readOnly} />
          </TabsContent>
          <TabsContent value="pessoal">
            <ScopeFinancePanel scope="pessoal" accentClass="text-indigo-500" bgAccentClass="bg-indigo-500/5 border-indigo-500/20" readOnly={readOnly} />
          </TabsContent>
          {!readOnly && <TabsContent value="ia"><FinanceChatPanel /></TabsContent>}
        </Tabs>
      </div>
    </CoachLayout>
  );
}
