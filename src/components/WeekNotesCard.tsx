import { useEffect, useState } from "react";
import { StickyNote, Save, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WeekNotesCardProps {
  blockId: string;
  studentId: string;
  weekNumber: number;
}

export const WeekNotesCard = ({ blockId, studentId, weekNumber }: WeekNotesCardProps) => {
  const [value, setValue] = useState("");
  const [initial, setInitial] = useState("");
  const [hasRow, setHasRow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("week_notes")
        .select("message")
        .eq("block_id", blockId)
        .eq("week_number", weekNumber)
        .maybeSingle();
      if (cancelled || error) return;
      const msg = (data?.message as string) || "";
      setValue(msg);
      setInitial(msg);
      setHasRow(!!data);
    })();
    return () => { cancelled = true; };
  }, [blockId, weekNumber]);

  const isDirty = value !== initial;

  const save = async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("week_notes")
        .upsert(
          { block_id: blockId, student_id: studentId, week_number: weekNumber, message: value.slice(0, 200) },
          { onConflict: "block_id,week_number" }
        );
      if (error) throw error;
      setInitial(value);
      setHasRow(true);
      toast.success("Anotação salva!");
    } catch {
      toast.error("Erro ao salvar anotação.");
    } finally {
      setSaving(false);
      setConfirmSaveOpen(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("week_notes")
        .delete()
        .eq("block_id", blockId)
        .eq("week_number", weekNumber);
      if (error) throw error;
      setValue("");
      setInitial("");
      setHasRow(false);
      toast.success("Anotação excluída!");
    } catch {
      toast.error("Erro ao excluir anotação.");
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  const canDelete = hasRow || initial.length > 0;
  const isBusy = saving || deleting || confirmOpen || confirmSaveOpen;

  return (
    <div
      className="mt-3 rounded-md border border-border bg-muted/30 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        <StickyNote className="h-3 w-3" /> Anotações da semana (treinador)
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, 200))}
        maxLength={200}
        placeholder="Escreva uma anotação sobre essa semana..."
        className="min-h-[70px] text-xs resize-none"
        disabled={isBusy}
        readOnly={isBusy}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground">{value.length}/200</span>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="default"
            className="h-7 px-2 text-xs gap-1"
            disabled={!isDirty || isBusy}
            onClick={() => setConfirmSaveOpen(true)}
          >
            <Save className="h-3 w-3" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
            disabled={!canDelete || isBusy}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-3 w-3" />
            Excluir
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anotação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A anotação desta semana será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Salvar anotação?</AlertDialogTitle>
            <AlertDialogDescription>
              A anotação desta semana será atualizada com o texto digitado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={save} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
