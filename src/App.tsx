import { ErrorBoundary } from "@/components/ErrorBoundary";
import { InstallAppDialog } from "@/components/InstallAppDialog";
import { OfflineManager } from "@/components/OfflineManager";
import { PrCelebration } from "@/components/PrCelebration";
import { OfflineProvider } from "@/hooks/useOfflineStatus";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { useState, lazy, Suspense } from "react";
import { CoachRoute } from "@/components/CoachRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { MenuRoute } from "@/components/MenuRoute";
import { StudentRoute } from "@/components/StudentRoute";
import { Loader2 } from "lucide-react";
import LandingPage from "./pages/LandingPage.tsx";
import CoachLogin from "./pages/CoachLogin.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Students from "./pages/Students.tsx";
import StudentLogin from "./pages/StudentLogin.tsx";
import StudentRegister from "./pages/StudentRegister.tsx";
import NotFound from "./pages/NotFound.tsx";
import { JaguarTheme } from "@/components/JaguarTheme";

// Code splitting: páginas pesadas carregadas sob demanda
const StudentProfile = lazy(() => import("./pages/StudentProfile.tsx"));
const StudentWorkout = lazy(() => import("./pages/StudentWorkout.tsx"));
const StudentMobility = lazy(() => import("./pages/StudentMobility.tsx"));
const BlockWeeks = lazy(() => import("./pages/BlockWeeks.tsx"));
const BlockSessions = lazy(() => import("./pages/BlockSessions.tsx"));
const Plans = lazy(() => import("./pages/Plans.tsx"));
const ExerciseDatabase = lazy(() => import("./pages/ExerciseDatabase.tsx"));
const MobilityDatabase = lazy(() => import("./pages/MobilityDatabase.tsx"));
const WorkoutTemplates = lazy(() => import("./pages/WorkoutTemplates.tsx"));
const TemplateWeeks = lazy(() => import("./pages/TemplateWeeks.tsx"));
const TemplateSessions = lazy(() => import("./pages/TemplateSessions.tsx"));
const MobilityTemplates = lazy(() => import("./pages/MobilityTemplates.tsx"));
const MobilityTemplateEditor = lazy(() => import("./pages/MobilityTemplateEditor.tsx"));
const Ranking = lazy(() => import("./pages/Ranking.tsx"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard.tsx"));
const StudentHistory = lazy(() => import("./pages/StudentHistory.tsx"));
const StudentAnamnese = lazy(() => import("./pages/StudentAnamnese.tsx"));
const StudentCheckin = lazy(() => import("./pages/StudentCheckin.tsx"));
const StudentCheckinHistory = lazy(() => import("./pages/StudentCheckinHistory.tsx"));
const CoachSettings = lazy(() => import("./pages/CoachSettings.tsx"));

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

const App = () => {
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InstallAppDialog open={installDialogOpen} onOpenChange={setInstallDialogOpen} />
        <OfflineProvider>
          <OfflineManager />
          <PrCelebration />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
            <Routes>
            {/* Landing */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Coach routes - protected */}
            <Route path="/login-treinador" element={<CoachLogin />} />
            <Route path="/students" element={<CoachRoute><MenuRoute menuKey="students"><ErrorBoundary><Students /></ErrorBoundary></MenuRoute></CoachRoute>} />
            <Route path="/students/:studentId/profile" element={<CoachRoute><MenuRoute menuKey="students"><StudentProfile /></MenuRoute></CoachRoute>} />
            <Route path="/students/:studentId/workout" element={<CoachRoute><MenuRoute menuKey="students"><StudentWorkout /></MenuRoute></CoachRoute>} />
            <Route path="/students/:studentId/mobility" element={<CoachRoute><MenuRoute menuKey="students"><StudentMobility /></MenuRoute></CoachRoute>} />
            <Route path="/students/:studentId/workout/:blockId" element={<CoachRoute><MenuRoute menuKey="students"><BlockWeeks /></MenuRoute></CoachRoute>} />
            <Route path="/students/:studentId/workout/:blockId/week/:weekNumber" element={<CoachRoute><MenuRoute menuKey="students"><BlockSessions /></MenuRoute></CoachRoute>} />
            <Route path="/plans" element={<CoachRoute><MenuRoute menuKey="plans"><Plans /></MenuRoute></CoachRoute>} />
            <Route path="/exercises" element={<CoachRoute><MenuRoute menuKey="exercises"><ExerciseDatabase /></MenuRoute></CoachRoute>} />
            <Route path="/mobility-database" element={<CoachRoute><MenuRoute menuKey="mobility_database"><MobilityDatabase /></MenuRoute></CoachRoute>} />
            <Route path="/templates" element={<CoachRoute><MenuRoute menuKey="templates"><WorkoutTemplates /></MenuRoute></CoachRoute>} />
            <Route path="/templates/:templateId" element={<CoachRoute><MenuRoute menuKey="templates"><TemplateWeeks /></MenuRoute></CoachRoute>} />
            <Route path="/templates/:templateId/week/:weekNumber" element={<CoachRoute><MenuRoute menuKey="templates"><TemplateSessions /></MenuRoute></CoachRoute>} />
            <Route path="/mobility-templates" element={<CoachRoute><MenuRoute menuKey="mobility_templates"><MobilityTemplates /></MenuRoute></CoachRoute>} />
            <Route path="/mobility-templates/:templateId" element={<CoachRoute><MenuRoute menuKey="mobility_templates"><MobilityTemplateEditor /></MenuRoute></CoachRoute>} />
            
            <Route path="/ranking" element={<CoachRoute><MenuRoute menuKey="ranking"><Ranking /></MenuRoute></CoachRoute>} />
            <Route path="/coach-settings" element={<CoachRoute><MenuRoute menuKey="coach_settings"><CoachSettings /></MenuRoute></CoachRoute>} />
            
            {/* Student routes - protected (Jaguar dark theme) */}
            <Route path="/aluno/login" element={<JaguarTheme><StudentLogin /></JaguarTheme>} />
            <Route path="/aluno/cadastro" element={<JaguarTheme><StudentRegister /></JaguarTheme>} />
            <Route path="/aluno/anamnese" element={<JaguarTheme><StudentRoute skipAnamneseCheck><StudentAnamnese /></StudentRoute></JaguarTheme>} />
            <Route path="/aluno/checkin" element={<JaguarTheme><StudentRoute><StudentCheckin /></StudentRoute></JaguarTheme>} />
            <Route path="/aluno/checkins" element={<JaguarTheme><StudentRoute><StudentCheckinHistory /></StudentRoute></JaguarTheme>} />
            <Route path="/aluno/historico" element={<JaguarTheme><StudentRoute><StudentHistory /></StudentRoute></JaguarTheme>} />
            <Route path="/aluno" element={<JaguarTheme><StudentRoute><StudentDashboard /></StudentRoute></JaguarTheme>} />

            {/* Password reset */}
            <Route path="/aluno/reset-password" element={<JaguarTheme><ResetPassword /></JaguarTheme>} />
            
            <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </OfflineProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
