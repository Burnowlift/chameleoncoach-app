import { useNavigate, useParams } from "react-router-dom";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar } from "lucide-react";
import { useWorkoutTemplates } from "@/hooks/useWorkoutTemplates";
import { useExercises } from "@/hooks/useExercises";
import { type WorkoutSession } from "@/lib/mock-data";

const BADGE_BASE_CLASS = "inline-flex items-center justify-center min-w-0 max-w-full min-h-7 w-full rounded-md px-2.5 py-1 text-xs font-bold shadow-sm tabular-nums whitespace-nowrap overflow-hidden border";
const BADGE_GRID_CLASS = "grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5";
const BADGE_TEXT_CLASS = "block w-full truncate text-center";

const SECTION_PANEL_CLASS = "rounded-md border border-border bg-muted/40 p-3 shadow-sm";
const SECTION_LABEL_CLASS = "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2";
const SESSION_BADGE_CLASS = "inline-flex items-center justify-center min-w-0 max-w-full min-h-7 w-full rounded-md border border-secondary-foreground/15 bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground shadow-sm whitespace-nowrap overflow-hidden";

const SBD_PANEL_CLASS = "rounded-md border border-blue-500/40 bg-blue-500/15 p-3 shadow-sm";
const SBD_LABEL_CLASS = "inline-flex items-center gap-1.5 font-extrabold uppercase tracking-wider mb-2 text-[#0049db] text-xs bg-white w-fit px-2 py-1 rounded shadow-sm ring-1 ring-blue-500/30";
const SBD_VOLUME_BADGE_CLASS = `${BADGE_BASE_CLASS} border-blue-700 bg-blue-800 text-blue-50`;

const AUX_PANEL_CLASS = "rounded-md border border-purple-500/40 bg-purple-500/15 p-3 shadow-sm";
const AUX_LABEL_CLASS = "inline-flex items-center gap-1.5 font-extrabold uppercase tracking-wider mb-2 text-[#47008f] text-xs bg-white w-fit px-2 py-1 rounded shadow-sm ring-1 ring-purple-500/30";
const AUX_BADGE_CLASS = `${BADGE_BASE_CLASS} border-purple-400/40 bg-purple-500/25 text-purple-50 font-semibold`;

const TemplateWeeks = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { templates, loading } = useWorkoutTemplates();
  const { exercises: exerciseDB } = useExercises();
  const template = templates.find((t) => t.id === templateId);

  const getDBInfo = (name: string) => exerciseDB.find((e) => e.name.toLowerCase() === name.toLowerCase());

  const calcWeekVolume = (sessions: WorkoutSession[]) => {
    const sbd = { squat: 0, bench: 0, deadlift: 0 };
    const muscle: Record<string, number> = {};
    sessions.forEach((session) => {
      session.exercises.forEach((ex) => {
        const info = getDBInfo(ex.name);
        if (!info) return;
        const sbdFromMg3 =
          info.muscleGroup3 === "S" ? "squat" :
          info.muscleGroup3 === "B" ? "bench" :
          info.muscleGroup3 === "D" ? "deadlift" : null;
        if (sbdFromMg3) sbd[sbdFromMg3] += ex.sets;
        [info.muscleGroup, info.muscleGroup2].forEach((mg) => {
          if (mg) muscle[mg] = (muscle[mg] || 0) + ex.sets;
        });
      });
    });
    return { sbd, muscle };
  };

  if (loading) {
    return <CoachLayout><p className="text-center text-muted-foreground py-8">Carregando...</p></CoachLayout>;
  }

  if (!template) {
    return (
      <CoachLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Template não encontrado.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/templates")}>Voltar</Button>
        </div>
      </CoachLayout>
    );
  }

  const sessionsForPreview = template.weekSessions?.[1] || template.sessions || [];

  return (
    <CoachLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/templates")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{template.templateName}</h1>
            <p className="text-sm text-muted-foreground">
              Template · {template.frequency}x por semana · {template.duration} semanas
              {template.category ? ` · ${template.category}` : ""}
            </p>
          </div>
        </div>

        <h2 className="text-lg font-semibold">Semanas</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: template.duration }, (_, i) => {
            const weekNum = i + 1;
            const sessions = template.weekSessions?.[weekNum] || sessionsForPreview;
            const { sbd, muscle } = calcWeekVolume(sessions);
            const hasSbd = sbd.squat > 0 || sbd.bench > 0 || sbd.deadlift > 0;
            const muscleEntries = Object.entries(muscle).sort((a, b) => b[1] - a[1]);
            return (
              <Card
                key={weekNum}
                className="hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/templates/${templateId}/week/${weekNum}`)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" /> Semana {weekNum}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {hasSbd && (
                    <div className={SBD_PANEL_CLASS}>
                      <div className={SBD_LABEL_CLASS}>SBD Volume</div>
                      <div className={BADGE_GRID_CLASS}>
                        {sbd.squat > 0 && <Badge variant="secondary" className={SBD_VOLUME_BADGE_CLASS} title={`Agachamento: ${sbd.squat} séries`}><span className={BADGE_TEXT_CLASS}>SQ: {sbd.squat} séries</span></Badge>}
                        {sbd.bench > 0 && <Badge variant="secondary" className={SBD_VOLUME_BADGE_CLASS} title={`Supino: ${sbd.bench} séries`}><span className={BADGE_TEXT_CLASS}>BP: {sbd.bench} séries</span></Badge>}
                        {sbd.deadlift > 0 && <Badge variant="secondary" className={SBD_VOLUME_BADGE_CLASS} title={`Levantamento Terra: ${sbd.deadlift} séries`}><span className={BADGE_TEXT_CLASS}>DL: {sbd.deadlift} séries</span></Badge>}
                      </div>
                    </div>
                  )}
                  {muscleEntries.length > 0 && (
                    <div className={AUX_PANEL_CLASS}>
                      <div className={AUX_LABEL_CLASS}>Volume Auxiliares</div>
                      <div className={BADGE_GRID_CLASS}>
                        {muscleEntries.map(([mg, sets]) => (
                          <Badge key={mg} variant="secondary" className={AUX_BADGE_CLASS} title={`${mg}: ${sets} séries`}>
                            <span className={BADGE_TEXT_CLASS}>{mg}: {sets}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className={SECTION_PANEL_CLASS}>
                    <div className={SECTION_LABEL_CLASS}>Sessões</div>
                    <div className={BADGE_GRID_CLASS}>
                      {sessions.map((s) => (
                        <Badge key={s.id} variant="secondary" className={SESSION_BADGE_CLASS} title={s.name}>
                          <span className={BADGE_TEXT_CLASS}>{s.name}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {sessions.reduce((acc, s) => acc + s.exercises.length, 0)} exercícios · clique para editar
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </CoachLayout>
  );
};

export default TemplateWeeks;
