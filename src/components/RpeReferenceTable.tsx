import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const RPE_ROWS: { rpe: string; meaning: string }[] = [
  { rpe: "10", meaning: "Falha total. Não conseguiria fazer mais nenhuma repetição." },
  { rpe: "9", meaning: "Sobrou 1 repetição no tanque." },
  { rpe: "8", meaning: "Sobraram 2 repetições." },
  { rpe: "7", meaning: "Sobraram 3 repetições. Barra ainda sobe rápido." },
  { rpe: "6", meaning: "Sobraram 4 ou mais repetições. Esforço moderado." },
  { rpe: "5", meaning: "Aquecimento pesado ou esforço leve. Muitas reps de reserva." },
];

export function RpeReferenceTable() {
  const [open, setOpen] = useState(false);
  return (
    <Card className="border-primary/30">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer select-none">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <CardTitle className="text-lg">Como funciona o RPE</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  RPE (Rate of Perceived Exertion) mede o quão difícil foi a série. Use a tabela abaixo como referência ao registrar seu RPE percebido.
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-muted-foreground shrink-0 transition-transform",
                  open && "rotate-180",
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">RPE</TableHead>
                  <TableHead>O que significa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RPE_ROWS.map((row) => (
                  <TableRow key={row.rpe}>
                    <TableCell className="font-bold text-primary">{row.rpe}</TableCell>
                    <TableCell className="text-sm">{row.meaning}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
