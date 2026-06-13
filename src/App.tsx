import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { CoachRoute } from "@/components/CoachRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { MenuRoute } from "@/components/MenuRoute";
import { StudentRoute } from "@/components/StudentRoute";
import LandingPage from "./pages/LandingPage.tsx";
import CoachLogin from "./pages/CoachLogin.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import CoachDashboard from "./pages/Index.tsx";
import Students from "./pages/Students.tsx";
import StudentsControl from "./pages/StudentsControl.tsx";
import StudentWorkout from "./pages/StudentWorkout.tsx";
import StudentMobility from "./pages/StudentMobility.tsx";
import BlockWeeks from "./pages/BlockWeeks.tsx";
import BlockSessions from "./pages/BlockSessions.tsx";
import Plans from "./pages/Plans.tsx";
import Customization from "./pages/Customization.tsx";
import ExerciseDatabase from "./pages/ExerciseDatabase.tsx";
import MobilityDatabase from "./pages/MobilityDatabase.tsx";
import Finances from "./pages/Finances.tsx";
import WorkoutTemplates from "./pages/WorkoutTemplates.tsx";
import TemplateWeeks from "./pages/TemplateWeeks.tsx";
import TemplateSessions from "./pages/TemplateSessions.tsx";
import MobilityTemplates from "./pages/MobilityTemplates.tsx";
import MobilityTemplateEditor from "./pages/MobilityTemplateEditor.tsx";

import Ranking from "./pages/Ranking.tsx";
import StudentLogin from "./pages/StudentLogin.tsx";
import StudentDashboard from "./pages/StudentDashboard.tsx";
import CoachSettings from "./pages/CoachSettings.tsx";
import NotFound from "./pages/NotFound.tsx";
import { JaguarTheme } from "@/components/JaguarTheme";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Landing */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Coach routes - protected */}
            <Route path="/login-treinador" element={<CoachLogin />} />
            <Route path="/dashboard" element={<CoachRoute><MenuRoute menuKey="dashboard"><CoachDashboard /></MenuRoute></CoachRoute>} />
            <Route path="/students" element={<CoachRoute><MenuRoute menuKey="students"><ErrorBoundary><Students /></ErrorBoundary></MenuRoute></CoachRoute>} />
            <Route path="/controle-alunos" element={<CoachRoute><MenuRoute menuKey="students_control"><StudentsControl /></MenuRoute></CoachRoute>} />
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
            <Route path="/financas" element={<CoachRoute><MenuRoute menuKey="finances"><Finances /></MenuRoute></CoachRoute>} />
            
            <Route path="/ranking" element={<CoachRoute><MenuRoute menuKey="ranking"><Ranking /></MenuRoute></CoachRoute>} />
            <Route path="/customization" element={<CoachRoute><MenuRoute menuKey="customization"><Customization /></MenuRoute></CoachRoute>} />
            <Route path="/coach-settings" element={<CoachRoute><MenuRoute menuKey="coach_settings"><CoachSettings /></MenuRoute></CoachRoute>} />
            
            {/* Student routes - protected (Jaguar dark theme) */}
            <Route path="/aluno/login" element={<JaguarTheme><StudentLogin /></JaguarTheme>} />
            <Route path="/aluno" element={<JaguarTheme><StudentRoute><StudentDashboard /></StudentRoute></JaguarTheme>} />

            {/* Password reset */}
            <Route path="/aluno/reset-password" element={<JaguarTheme><ResetPassword /></JaguarTheme>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
