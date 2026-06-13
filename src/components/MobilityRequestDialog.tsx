import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  onSubmitted?: () => void;
  activeCount?: number;
  maxActive?: number;
}

export function MobilityRequestDialog({ open, onOpenChange, studentId, onSubmitted, activeCount = 0, maxActive = 2 }: Props) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setMessage("");
  };

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (trimmed.length === 0) {
      toast.error("Escreva uma mensagem para o seu treinador.");
      return;
    }
    if (trimmed.length > 500) {
      toast.error("Mensagem muito longa (máx. 500 caracteres).");
      return;
    }

    setSubmitting(true);
    try {
      // Limit: max 2 active mobility requests per student
      const { count: existingCount, error: countError } = await supabase
        .from("block_notes")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .like("message", "[Solicitação de mobilidade]%");
      if (countError) throw countError;
      if ((existingCount ?? 0) >= 2) {
        toast.error("Limite atingido", {
          description: "Você já enviou 2 solicitações. Aguarde seu treinador respondê-las.",
        });
        setSubmitting(false);
        return;
      }

      const composed = `[Solicitação de mobilidade]\n${trimmed}`;

      // Try to attach to most recent training block (block_notes requires block_id NOT NULL)
      const { data: block } = await supabase
        .from("training_blocks")
        .select("id")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (block?.id) {
        const { error } = await supabase.from("block_notes").insert({
          student_id: studentId,
          block_id: block.id,
          message: composed,
        });
        if (error) throw error;
        toast.success("Solicitação enviada ao seu treinador!");
      } else {
        toast.success("Solicitação registrada", {
          description: "Avisaremos seu treinador assim que ele criar seu primeiro bloco.",
        });
      }

      reset();
      onSubmitted?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao enviar solicitação", { description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!submitting) onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar mobilidade ao treinador</DialogTitle>
          <DialogDescription>
            Conte onde você sente desconforto ou rigidez e descreva o que precisa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
            <span className="text-xs text-muted-foreground">Solicitações ativas</span>
            <span
              className={`text-sm font-semibold tabular-nums ${
                activeCount >= maxActive ? "text-destructive" : "text-foreground"
              }`}
            >
              {activeCount}/{maxActive}
            </span>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Mensagem</p>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex.: sinto a lombar travada após o agachamento, gostaria de exercícios para soltar."
              rows={4}
              maxLength={500}
            />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">{message.length}/500</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
