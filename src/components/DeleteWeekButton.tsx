import { useMatch } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteWeekButtonProps {
  weekNum: number;
  onRequestDelete: (weekNum: number) => void;
  allowInWorkoutTab?: boolean;
}

/**
 * Botão de apagar exercícios de uma semana.
 *
 * Regra de renderização (defesa em profundidade — independente de CSS/tema/viewport):
 *  - Renderiza na rota exata `/students/:studentId/workout/:blockId`.
 *  - Também pode renderizar na aba interna "Bloco de Treino" de `/students`,
 *    mas só quando o componente pai passar explicitamente allowInWorkoutTab.
 *  - Sub-rotas (ex.: `.../week/:weekNumber`) e outras telas NÃO renderizam o botão.
 *  - O papel de treinador já é garantido por <CoachRoute /> no nível da rota.
 */
export function DeleteWeekButton({ weekNum, onRequestDelete, allowInWorkoutTab = false }: DeleteWeekButtonProps) {
  const routeMatch = useMatch("/students/:studentId/workout/:blockId");
  if (!routeMatch && !allowInWorkoutTab) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 shrink-0 gap-1.5 border-destructive/50 bg-destructive/10 px-2.5 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground"
      onClick={(e) => {
        e.stopPropagation();
        onRequestDelete(weekNum);
      }}
      title={`Apagar exercícios da Semana ${weekNum}`}
      aria-label={`Apagar exercícios da Semana ${weekNum}`}
    >
      <Trash2 className="h-3.5 w-3.5" />
      <span>Apagar semana</span>
    </Button>
  );
}
