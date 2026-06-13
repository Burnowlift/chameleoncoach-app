import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { CardType } from "@/hooks/useStudentFeedback";

// Order Seg..Dom, mapped to JS getDay() weekday numbers
const WEEK_DAYS: { label: string; value: number }[] = [
  { label: "Seg", value: 1 },
  { label: "Ter", value: 2 },
  { label: "Qua", value: 3 },
  { label: "Qui", value: 4 },
  { label: "Sex", value: 5 },
  { label: "Sáb", value: 6 },
  { label: "Dom", value: 0 },
];

interface Props {
  studentId: string;
  card: CardType;
  note: string;
  isActive: (weekday: number) => boolean;
  onToggle: (weekday: number) => void;
  onNoteChange: (text: string) => void;
  label: string;
}

export function FeedbackCard({
  card,
  note,
  isActive,
  onToggle,
  onNoteChange,
  label,
}: Props) {
  const isOrange = card === "orange";
  const containerCls = isOrange
    ? "border-orange-500/40 bg-orange-500/5"
    : "border-emerald-500/40 bg-emerald-500/5";
  const activeBtnCls = isOrange
    ? "bg-orange-600 text-white border-orange-700 hover:bg-orange-700"
    : "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700";
  const inactiveBtnCls = isOrange
    ? "border-orange-500/30 text-orange-700 dark:text-orange-300 hover:bg-orange-500/10"
    : "border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10";

  const [confirmDay, setConfirmDay] = useState<number | null>(null);

  const handleClick = (e: React.MouseEvent, weekday: number) => {
    e.stopPropagation();
    if (isActive(weekday)) {
      setConfirmDay(weekday);
    } else {
      onToggle(weekday);
    }
  };

  return (
    <div className={cn("rounded-md border px-2.5 py-2 space-y-2", containerCls)}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn(
          "text-[10px] font-semibold uppercase tracking-wide shrink-0",
          isOrange ? "text-orange-700 dark:text-orange-300" : "text-emerald-700 dark:text-emerald-300",
        )}>
          {label}
        </span>
        <div className="flex gap-1 flex-wrap">
          {WEEK_DAYS.map((d) => {
            const active = isActive(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={(e) => handleClick(e, d.value)}
                className={cn(
                  "h-6 px-2 rounded-md border text-[10px] font-medium transition-colors",
                  active ? activeBtnCls : inactiveBtnCls,
                )}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>
      <Textarea
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder={isOrange ? "Anotações privadas..." : "Anotações compartilhadas..."}
        className="min-h-[44px] text-xs bg-background/60"
      />

      <AlertDialog open={confirmDay !== null} onOpenChange={(o) => !o && setConfirmDay(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desmarcar dia respondido?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a remover a marcação de{" "}
              <strong>
                {confirmDay !== null
                  ? WEEK_DAYS.find((d) => d.value === confirmDay)?.label
                  : ""}
              </strong>
              . Esta ação apaga o registro de que o aluno foi respondido neste dia da semana atual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDay !== null) onToggle(confirmDay);
                setConfirmDay(null);
              }}
            >
              Desmarcar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
