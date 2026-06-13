import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Activity, Play, Loader2, Layers, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { useStudentMobility } from "@/hooks/useMobility";

interface Props {
  studentId: string;
}

export function StudentMobilitySection({ studentId }: Props) {
  const { items, loading, isDoneToday, toggleDoneToday } = useStudentMobility(studentId);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleToggle = async (id: string) => {
    setBusyId(id);
    try {
      await toggleDoneToday(id);
    } catch {
      // silently ignore
    }
    setBusyId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> Mobilidade
        </h2>
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Activity className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">Nenhuma mobilidade cadastrada ainda</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Seu treinador ainda não montou uma rotina de mobilidade para você.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" /> Mobilidade
      </h2>
      <div className="space-y-3">
        {Array.from(new Set(items.map(i => i.sessionIndex))).sort((a, b) => a - b).map((sessionNum) => {
          const sessionItems = items.filter(i => i.sessionIndex === sessionNum).sort((a, b) => a.position - b.position);
          const defaultLabel = `Mob ${["A", "B", "C", "D", "E", "F", "G"][sessionNum - 1] || sessionNum}`;
          let customLabel = "";
          try {
            const raw = localStorage.getItem(`mobility-session-names-${studentId}`);
            if (raw) customLabel = (JSON.parse(raw)?.[sessionNum] ?? "").toString().trim();
          } catch {
            // ignore
          }
          const label = customLabel || defaultLabel;
          const total = sessionItems.length;
          const doneCount = sessionItems.filter(i => isDoneToday(i.id)).length;
          const allDone = total > 0 && doneCount === total;
          const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
          return (
            <Collapsible key={sessionNum} defaultOpen>
              <Card className={allDone ? "border-green-500/60" : "border-primary/20"}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full text-left p-4 flex items-center gap-3 hover:bg-muted/40 transition-colors rounded-t-lg group"
                  >
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${allDone ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-primary/10 text-primary"}`}>
                      <Layers className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate">{label}</p>
                        <Badge variant="secondary" className="text-[10px]">
                          {total} exercício{total === 1 ? "" : "s"}
                        </Badge>
                        {allDone && (
                          <Badge className="text-[10px] bg-green-500/15 text-green-700 dark:text-green-300 hover:bg-green-500/20 border-0">
                            Concluído hoje
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                          {doneCount}/{total}
                        </span>
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-data-[state=closed]:-rotate-90" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-2 border-t pt-3">
                    {total === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        Nenhum exercício nesta sessão.
                      </p>
                    ) : (
                      sessionItems.map((item) => {
                        const done = isDoneToday(item.id);
                        return (
                          <Card key={item.id} className={done ? "border-green-500 bg-green-50 dark:bg-green-950/30" : ""}>
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={done}
                                  disabled={busyId === item.id}
                                  onCheckedChange={() => handleToggle(item.id)}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className={`font-medium text-sm ${done ? "line-through text-muted-foreground" : ""}`}>{item.name}</p>
                                      {item.area && <Badge variant="secondary" className="text-[10px] mt-1">{item.area}</Badge>}
                                    </div>
                                    {item.videoUrl && (
                                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
                                        <a href={item.videoUrl} target="_blank" rel="noopener noreferrer">
                                          <Play className="h-3.5 w-3.5 text-primary" />
                                        </a>
                                      </Button>
                                    )}
                                  </div>
                                  {item.prescription && (
                                    <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-wrap">{item.prescription}</p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">Marque como feito a cada dia que executar.</p>
    </div>
  );
}
