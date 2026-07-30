import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { useStudents } from "@/hooks/useStudents";
import { Loader2, Save, FileText } from "lucide-react";
import type { Student } from "@/lib/mock-data";

export function StudentNotesTab({ student }: { student: Student }) {
  const { update } = useStudents();
  const [notes, setNotes] = useState(student.mobilityInfo?.coachNotes || "");
  const [saving, setSaving] = useState(false);

  // Sync state if student object changes externally
  useEffect(() => {
    setNotes(student.mobilityInfo?.coachNotes || "");
  }, [student.mobilityInfo?.coachNotes]);

  const handleSave = async () => {
    if (notes === student.mobilityInfo?.coachNotes) {
      toast("Nenhuma alteração para salvar.");
      return;
    }
    setSaving(true);
    try {
      await update({
        ...student,
        mobilityInfo: {
          ...student.mobilityInfo,
          coachNotes: notes,
        }
      });
      toast.success("Anotações salvas com sucesso!");
    } catch {
      toast.error("Erro ao salvar anotações.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Anotações do Aluno
        </CardTitle>
        <CardDescription>
          Espaço privado do treinador para registrar observações, alertas de lesões ou qualquer detalhe importante. O aluno não tem acesso a essas anotações.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Digite suas anotações aqui..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[300px] resize-y"
        />
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Salvando..." : "Salvar Anotações"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
