import { useEffect, type ReactNode } from "react";

/**
 * Aplica o tema "Jaguar" (dark premium) na <html> enquanto montado.
 * Usado em todas as rotas da área do aluno.
 */
export function JaguarTheme({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    const hadJaguar = root.classList.contains("jaguar");
    root.classList.add("dark", "jaguar");
    return () => {
      if (!hadJaguar) root.classList.remove("jaguar");
      if (!hadDark) root.classList.remove("dark");
    };
  }, []);

  return <>{children}</>;
}

export default JaguarTheme;
