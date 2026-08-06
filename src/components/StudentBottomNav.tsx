import { useLocation, useNavigate } from "react-router-dom";
import { Home, History, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { path: "/aluno", label: "Início", icon: Home, match: (p: string) => p === "/aluno" },
  { path: "/aluno/historico", label: "Histórico", icon: History, match: (p: string) => p.startsWith("/aluno/historico") },
  { path: "/aluno/checkins", label: "Check-ins", icon: ClipboardCheck, match: (p: string) => p.startsWith("/aluno/checkins") },
];

export function StudentBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-card/95 backdrop-blur border-t border-border pb-safe">
      <div className="grid grid-cols-3">
        {ITEMS.map(item => {
          const active = item.match(pathname);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 min-h-[56px] transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
