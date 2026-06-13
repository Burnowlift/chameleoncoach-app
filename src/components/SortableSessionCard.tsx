import { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface RenderProps {
  dragHandle: ReactNode;
}

interface SortableSessionCardProps {
  id: string;
  children: (props: RenderProps) => ReactNode;
}

export const SortableSessionCard = ({ id, children }: SortableSessionCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
    position: "relative",
  };
  const dragHandle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="flex h-8 w-8 shrink-0 cursor-grab active:cursor-grabbing items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground touch-none"
      title="Arraste para reordenar a sessão"
      aria-label="Arraste para reordenar a sessão"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandle })}
    </div>
  );
};
