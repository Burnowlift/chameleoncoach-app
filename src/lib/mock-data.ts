export interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  state?: string;
  avatar?: string;
  plan: string;
  planValue: number;
  status: "active" | "inactive" | "expiring";
  joinedAt: string;
  paymentDueDate: string;
  squat1RM: number;
  bench1RM: number;
  deadlift1RM: number;
  renewalDay?: string;
  cpf?: string;
  hasNutritionist?: boolean;
  userId?: string | null;
  sex?: "M" | "F" | null;
  bodyWeight?: number | null;
}

export interface TrainingBlock {
  id: string;
  name: string;
  frequency: number;
  duration: number;
  sessions: WorkoutSession[];
  weekSessions: Record<number, WorkoutSession[]>;
}

export interface WorkoutSession {
  id: string;
  name: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutBlock {
  id: string;
  name: string;
  week: number;
  exercises: WorkoutExercise[];
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rpe?: string;
  percentage?: string;
  isMainLift: boolean;
  videoUrl?: string;
}

export interface WorkoutTemplate {
  id: string;
  templateName: string;
  category?: string;
  frequency: number;
  duration: number;
  sessions: WorkoutSession[];
  weekSessions: Record<number, WorkoutSession[]>;
}

export interface ExerciseDBItem {
  id: string;
  name: string;
  muscleGroup: string;
  muscleGroup2?: string;
  /** "S" | "B" | "D" — define a contagem de volume SBD na montagem de treinos */
  muscleGroup3?: string;
  isSquatRm: boolean;
  isBenchRm: boolean;
  isDeadliftRm: boolean;
  videoUrl?: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  studentCount: number;
  duration?: string;
  description?: string;
}

export const mockStudents: Student[] = [
  { id: "1", name: "Lucas Silva", email: "lucas@email.com", plan: "Jaguar", planValue: 250, status: "active", joinedAt: "2025-01-15", paymentDueDate: "2026-04-05", squat1RM: 180, bench1RM: 120, deadlift1RM: 220 },
  { id: "2", name: "Ana Costa", email: "ana@email.com", plan: "Jungle", planValue: 150, status: "active", joinedAt: "2025-03-01", paymentDueDate: "2026-04-10", squat1RM: 100, bench1RM: 55, deadlift1RM: 130 },
  { id: "3", name: "Pedro Santos", email: "pedro@email.com", plan: "Jaguar", planValue: 250, status: "expiring", joinedAt: "2024-11-20", paymentDueDate: "2026-04-03", squat1RM: 200, bench1RM: 140, deadlift1RM: 240 },
  { id: "4", name: "Maria Oliveira", email: "maria@email.com", plan: "Jungle Pro", planValue: 200, status: "active", joinedAt: "2025-02-10", paymentDueDate: "2026-04-15", squat1RM: 90, bench1RM: 50, deadlift1RM: 110 },
  { id: "5", name: "João Ferreira", email: "joao@email.com", plan: "Jungle", planValue: 150, status: "inactive", joinedAt: "2024-09-05", paymentDueDate: "2026-03-20", squat1RM: 160, bench1RM: 110, deadlift1RM: 190 },
  { id: "6", name: "Camila Rocha", email: "camila@email.com", plan: "Jaguar", planValue: 250, status: "expiring", joinedAt: "2025-01-08", paymentDueDate: "2026-04-02", squat1RM: 85, bench1RM: 45, deadlift1RM: 105 },
  { id: "7", name: "Rafael Almeida", email: "rafael@email.com", plan: "Jungle Pro", planValue: 200, status: "active", joinedAt: "2025-02-22", paymentDueDate: "2026-04-22", squat1RM: 170, bench1RM: 115, deadlift1RM: 210 },
  { id: "8", name: "Beatriz Lima", email: "beatriz@email.com", plan: "Jaguar", planValue: 250, status: "active", joinedAt: "2025-03-15", paymentDueDate: "2026-04-15", squat1RM: 95, bench1RM: 52, deadlift1RM: 120 },
];

export const mockPlans: Plan[] = [
  { id: "1", name: "Jungle", price: 150, features: ["Planilha de treino", "Suporte por email"], studentCount: 2 },
  { id: "2", name: "Jungle Pro", price: 200, features: ["Planilha de treino", "Suporte WhatsApp", "Ajustes semanais"], studentCount: 2 },
  { id: "3", name: "Jaguar", price: 250, features: ["Planilha de treino", "Suporte WhatsApp 24h", "Ajustes semanais", "Vídeo análise", "Acompanhamento nutricional"], studentCount: 4 },
];

export const mockWorkoutBlocks: WorkoutBlock[] = [];
