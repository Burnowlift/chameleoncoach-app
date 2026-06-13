import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { WorkoutTemplate, WorkoutSession } from "@/lib/mock-data";
import { toast } from "sonner";
import { z } from "zod";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: WorkoutTemplate | null;
  onSave: (data: Omit<WorkoutTemplate, "id">) => Promise<string | void>;
}

const SESSION_LETTERS = ["A", "B", "C", "D", "E", "F", "G"];
const defaultSessionName = (i: number) => `Treino ${SESSION_LETTERS[i] || i + 1}`;

const sessionNameSchema = z
  .string()
  .transform((v) => v.replace(/\s+/g, " ").trim())
  .pipe(z.string().max(50, "Cada nome de sessão deve ter no máximo 50 caracteres."));

export function WorkoutTemplateDialog({ open, onOpenChange, template, onSave }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState(3);
  const [duration, setDuration] = useState(4);
  const [sessionNames, setSessionNames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(template?.templateName || "");
      setCategory(template?.category || "");
      const f = template?.frequency || 3;
      setFrequency(f);
      setDuration(template?.duration || 4);
      const baseSessions = template?.weekSessions?.[1] || template?.sessions || [];
      setSessionNames(Array.from({ length: f }, (_, i) => baseSessions[i]?.name || ""));
    }
  }, [open, template]);

  useEffect(() => {
    setSessionNames((prev) => {
      const next = Array.from({ length: frequency }, (_, i) => prev[i] || "");
      return next;
    });
  }, [frequency]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Informe o nome do template."); return; }
    if (frequency < 1 || frequency > 6) { toast.error("Frequência entre 1 e 6 sessões por semana."); return; }
    if (duration < 1 || duration > 10) { toast.error("Duração entre 1 e 10 semanas."); return; }

    // Validar e normalizar nomes de sessões
    const normalizedNames: string[] = [];
    for (let i = 0; i < frequency; i++) {
      const parsed = sessionNameSchema.safeParse(sessionNames[i] ?? "");
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message || "Nome de sessão inválido.");
        return;
      }
      normalizedNames.push(parsed.data || defaultSessionName(i));
    }

    setSaving(true);
    try {
      if (template) {
        // Edição: preserva sessões existentes, ajusta dimensões e aplica nomes
        const prevSessions = template.sessions || [];
        const sessions: WorkoutSession[] = Array.from({ length: frequency }, (_, i) => {
          const existing = prevSessions[i];
          return existing
            ? { ...existing, name: normalizedNames[i] }
            : { id: crypto.randomUUID(), name: normalizedNames[i], exercises: [] };
        });
        const weekSessions: Record<number, WorkoutSession[]> = {};
        for (let w = 1; w <= duration; w++) {
          const existing = template.weekSessions?.[w];
          const arr: WorkoutSession[] = [];
          for (let i = 0; i < frequency; i++) {
            const prev = existing?.[i];
            if (prev) {
              const isDefault = prev.name === defaultSessionName(i);
              arr.push({ ...prev, name: isDefault ? normalizedNames[i] : prev.name });
            } else {
              arr.push({ id: crypto.randomUUID(), name: normalizedNames[i], exercises: [] });
            }
          }
          weekSessions[w] = arr;
        }
        await onSave({
          templateName: name.trim(),
          category: category.trim() || undefined,
          frequency,
          duration,
          sessions,
          weekSessions,
        });
        onOpenChange(false);
        toast.success("Template atualizado!");
      } else {
        // Criação: gera esqueleto vazio com nomes personalizados
        const sessions: WorkoutSession[] = Array.from({ length: frequency }, (_, i) => ({
          id: crypto.randomUUID(),
          name: normalizedNames[i],
          exercises: [],
        }));
        const weekSessions: Record<number, WorkoutSession[]> = {};
        for (let w = 1; w <= duration; w++) {
          weekSessions[w] = sessions.map((s) => ({
            ...s,
            id: crypto.randomUUID(),
            exercises: [],
          }));
        }
        await onSave({
          templateName: name.trim(),
          category: category.trim() || undefined,
          frequency,
          duration,
          sessions,
          weekSessions,
        });
        onOpenChange(false);
      }
    } catch {
      toast.error("Erro ao salvar template.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Editar Template" : "Novo Template"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome do Template</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Bloco de Força — Iniciante" maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label>Categoria (opcional)</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Força, Hipertrofia..." maxLength={60} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Sessões por semana</Label>
              <Input type="number" min={1} max={6} value={frequency} onChange={(e) => setFrequency(Math.min(6, Math.max(1, Number(e.target.value) || 1)))} />
            </div>
            <div className="space-y-2">
              <Label>Duração (semanas)</Label>
              <Input type="number" min={1} max={10} value={duration} onChange={(e) => setDuration(Math.min(10, Math.max(1, Number(e.target.value) || 1)))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nomes das sessões</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Array.from({ length: frequency }, (_, i) => (
                <div key={i} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Sessão {SESSION_LETTERS[i] || i + 1}</Label>
                  <Input
                    value={sessionNames[i] ?? ""}
                    onChange={(e) => setSessionNames((prev) => {
                      const next = [...prev];
                      while (next.length < frequency) next.push("");
                      next[i] = e.target.value;
                      return next;
                    })}
                    placeholder={defaultSessionName(i)}
                    maxLength={50}
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Deixe em branco para usar o padrão "{defaultSessionName(0)}", "{defaultSessionName(1)}"...</p>
          </div>

          {template && (
            <p className="text-xs text-muted-foreground">
              Reduzir a frequência ou duração descarta sessões/semanas excedentes. Nomes personalizados em semanas específicas são preservados.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : (template ? "Salvar" : "Criar e Editar")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
