import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Printer, Trophy } from "lucide-react";
import { Student } from "@/lib/mock-data";

interface MeetAttemptsTabProps {
  student: Student;
}

const ATTEMPT_PERCENTAGES = {
  1: { low: 0.90, target: 0.91, high: 0.92 },
  2: { low: 0.94, target: 0.96, high: 0.97 },
  3: { low: 0.98, target: 1.00, high: 1.01 },
};

// Warmup percentages based on First Attempt (Target)
const WARMUP_PERCENTAGES = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

function roundTo25(value: number) {
  return Math.round(value / 2.5) * 2.5;
}

export function MeetAttemptsTab({ student }: MeetAttemptsTabProps) {
  // Base RMs that the coach can tweak for the meet day
  const [baseRm, setBaseRm] = useState({
    squat: student.squat || 0,
    bench: student.bench || 0,
    deadlift: student.deadlift || 0,
  });

  // Overrides for specific calculated cells
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const handleBaseRmChange = (lift: keyof typeof baseRm, value: string) => {
    const num = Number(value.replace(",", "."));
    setBaseRm((prev) => ({ ...prev, [lift]: isNaN(num) ? 0 : num }));
  };

  const handleOverrideChange = (key: string, value: string) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  };

  const getAttemptValue = (lift: keyof typeof baseRm, attemptNumber: 1 | 2 | 3, type: "low" | "target" | "high") => {
    const key = `${lift}_attempt_${attemptNumber}_${type}`;
    if (overrides[key] !== undefined) return overrides[key];
    
    const rm = baseRm[lift];
    if (!rm) return "";
    
    const percentage = ATTEMPT_PERCENTAGES[attemptNumber][type];
    return String(roundTo25(rm * percentage));
  };

  const getWarmupValue = (lift: keyof typeof baseRm, index: number) => {
    const key = `${lift}_warmup_${index}`;
    if (overrides[key] !== undefined) return overrides[key];

    if (index === 0) return "20"; // Empty bar is usually the first warmup

    const rm = baseRm[lift];
    if (!rm) return "";

    // Warmup is based on the 1st Attempt Target
    const firstAttemptTarget = roundTo25(rm * ATTEMPT_PERCENTAGES[1].target);
    const warmupPercentage = WARMUP_PERCENTAGES[index - 1]; // index 1 corresponds to WARMUP_PERCENTAGES[0]
    
    if (!warmupPercentage) return "";
    
    return String(roundTo25(firstAttemptTarget * warmupPercentage));
  };

  const renderLiftSection = (lift: keyof typeof baseRm, title: string) => {
    return (
      <Card className="mb-8 print:border print:border-black/20 print:shadow-none print:mb-0 page-break-inside-avoid print:rounded-none">
        <CardHeader className="print:pb-1 print:pt-2 print:px-2">
          <CardTitle className="text-xl print:text-base flex items-center justify-between">
            {title}
            <div className="flex items-center gap-2 text-sm font-normal print:hidden">
              <Label htmlFor={`${lift}-base`}>1RM Alvo (kg):</Label>
              <Input
                id={`${lift}-base`}
                type="number"
                className="w-24 h-8"
                value={baseRm[lift] || ""}
                onChange={(e) => handleBaseRmChange(lift, e.target.value)}
              />
            </div>
          </CardTitle>
          <div className="hidden print:block text-xs font-bold text-center border-t border-black/20 pt-1 mt-1">
            1RM Alvo: {baseRm[lift]} kg
          </div>
        </CardHeader>
        <CardContent className="print:px-2 print:pb-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:flex print:flex-col print:gap-2">
            
            {/* WARMUPS */}
            <div>
              <h4 className="font-semibold text-sm print:text-xs print:mb-1 mb-3 text-muted-foreground uppercase tracking-wider">Aquecimento</h4>
              <div className="space-y-2 print:space-y-0.5">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between text-sm print:text-xs border-b border-border/50 pb-2 print:pb-0.5 print:border-black/20">
                    <span className="font-medium text-muted-foreground w-12">#{i + 1}</span>
                    <Input 
                      className="w-20 h-7 print:h-5 text-right bg-transparent border-transparent hover:border-input focus:border-input print:border-none print:p-0 print:text-xs"
                      value={getWarmupValue(lift, i)}
                      onChange={(e) => handleOverrideChange(`${lift}_warmup_${i}`, e.target.value)}
                      placeholder="-"
                    />
                    <span className="w-8 text-xs text-muted-foreground ml-2">kg</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ATTEMPTS */}
            <div>
              <h4 className="font-semibold text-sm print:text-xs print:mb-1 mb-3 text-muted-foreground uppercase tracking-wider">Pedidas</h4>
              <div className="rounded-md border print:border-black/40 overflow-hidden">
                <table className="w-full text-sm print:text-xs">
                  <thead className="bg-muted/50 print:bg-black/5 border-b print:border-black/40">
                    <tr>
                      <th className="py-2 print:py-1 px-1 text-left font-medium text-muted-foreground">#</th>
                      <th className="py-2 print:py-1 px-1 text-center font-medium">Low</th>
                      <th className="py-2 print:py-1 px-1 text-center font-medium text-primary print:text-black">Tgt</th>
                      <th className="py-2 print:py-1 px-1 text-center font-medium">High</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3].map((attempt) => (
                      <tr key={attempt} className="border-b last:border-0 print:border-black/40">
                        <td className="py-2 print:py-0.5 px-1 font-semibold text-muted-foreground">{attempt}ª</td>
                        {(["low", "target", "high"] as const).map((type) => (
                          <td key={type} className="py-1 print:py-0.5 px-0.5">
                            <div className="flex items-center justify-center">
                              <Input
                                className={`w-12 h-8 print:h-5 text-center bg-transparent border-transparent hover:border-input focus:border-input print:border-none print:p-0 print:text-[11px] ${type === 'target' ? 'font-bold' : ''}`}
                                value={getAttemptValue(lift, attempt as 1|2|3, type)}
                                onChange={(e) => handleOverrideChange(`${lift}_attempt_${attempt}_${type}`, e.target.value)}
                                placeholder="-"
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-xs text-muted-foreground print:text-[10px]">
                <p>* 1ª baseada em 90~92% da 1RM.</p>
                <p>* 2ª baseada em 94~97% da 1RM.</p>
                <p>* 3ª baseada em 98~101% da 1RM.</p>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4 print:space-y-2 print:bg-white">
      {/* HEADER / CONTROLS - Hidden on print */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Planejamento de Competição
          </h2>
          <p className="text-muted-foreground text-sm">
            As pedidas são calculadas automaticamente com base nas 1RMs atuais do aluno. Você pode ajustar a 1RM alvo ou editar qualquer carga livremente.
          </p>
        </div>
        <Button onClick={() => window.print()} className="gap-2 shrink-0">
          <Printer className="h-4 w-4" />
          Imprimir / Gerar PDF
        </Button>
      </div>

      {/* PRINT HEADER - Visible only on print */}
      <div className="hidden print:flex flex-col items-center mb-2 border-b-2 border-black pb-2">
        <Avatar className="h-14 w-14 mb-1 border border-black/20 print:border-solid">
          {student.avatar && <AvatarImage src={student.avatar} alt={student.name} className="object-cover" />}
          <AvatarFallback className="text-lg font-bold bg-muted text-muted-foreground">
            {student.name.split(" ").map(n => n[0]).join("").substring(0, 2)}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-2xl font-bold uppercase tracking-wider text-center">Gameday Plan</h1>
        <div className="flex justify-between w-full mt-2 text-sm">
          <div><strong>Atleta:</strong> {student.name}</div>
          <div><strong>Data:</strong> ____/____/________</div>
        </div>
      </div>

      {/* LIFTS SECTIONS */}
      <div className="print:text-black print:grid print:grid-cols-3 print:gap-2 print:items-start">
        {renderLiftSection("squat", "Agachamento")}
        {renderLiftSection("bench", "Supino")}
        {renderLiftSection("deadlift", "Terra")}
      </div>

      {/* NOTES SECTION - Essential for print */}
      <Card className="print:border-none print:shadow-none mt-8 print:mt-1">
        <CardHeader className="print:pb-0 print:pt-0">
          <CardTitle className="print:text-sm">Anotações do Treinador</CardTitle>
          <CardDescription className="print:hidden">
            Escreva anotações importantes sobre a competição abaixo. Elas serão impressas junto com o Gameday Plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="print:px-0 print:pt-1">
          <Textarea 
            placeholder="Digite anotações, metas ou lembretes pertinentes ao aluno aqui..."
            className="h-48 resize-none rounded-md border-2 border-dashed border-border/60 print:border-solid print:border-black/50 print:h-[350px] print:text-sm focus-visible:ring-1"
          />
        </CardContent>
      </Card>

      {/* PRINT STYLES */}
      <style>{`
        @media print {
          @page { size: auto; margin: 5mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
          /* Hide main layout elements */
          nav, aside, header { display: none !important; }
          /* Reset container margins */
          main { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
          .page-break-inside-avoid { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
