import {
  LayoutDashboard,
  Users,
  CreditCard,
  Palette,
  Database,
  UserCog,
  Wallet,
  Trophy,
  ClipboardList,
  Activity,
  LibraryBig,
  type LucideIcon,
} from "lucide-react";

export const ADMIN_COACH_EMAIL = "brunorodriguesconsul@gmail.com";

const normalize = (email: string | null | undefined) =>
  (email ?? "").trim().toLowerCase();

export function isAdminCoach(email: string | null | undefined): boolean {
  return normalize(email) === ADMIN_COACH_EMAIL;
}

export interface MenuDef {
  key: string;
  title: string;
  url: string;
  icon: LucideIcon;
}

// Fonte única da verdade dos menus controlados por ACL.
export const ALL_MENUS: MenuDef[] = [
  { key: "dashboard", title: "Área do Treinador", url: "/dashboard", icon: LayoutDashboard },
  { key: "students", title: "Alunos", url: "/students", icon: Users },
  { key: "students_control", title: "Controle de Alunos", url: "/controle-alunos", icon: ClipboardList },
  { key: "ranking", title: "Ranking", url: "/ranking", icon: Trophy },
  { key: "plans", title: "Planos", url: "/plans", icon: CreditCard },
  { key: "finances", title: "Finanças", url: "/financas", icon: Wallet },
  { key: "exercises", title: "Banco de Exercícios", url: "/exercises", icon: Database },
  { key: "mobility_database", title: "Banco de Mobilidade", url: "/mobility-database", icon: Activity },
  { key: "templates", title: "Biblioteca de Templates", url: "/templates", icon: LibraryBig },
  { key: "mobility_templates", title: "Mobilidade Templates", url: "/mobility-templates", icon: LibraryBig },
  { key: "customization", title: "Personalização", url: "/customization", icon: Palette },
  { key: "coach_settings", title: "Conta do Treinador", url: "/coach-settings", icon: UserCog },
];

export const MENU_KEYS = ALL_MENUS.map((m) => m.key);
