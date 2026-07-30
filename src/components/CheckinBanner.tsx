import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, ArrowRight } from "lucide-react";
import { useCheckins } from "@/hooks/useCheckins";

interface CheckinBannerProps {
  studentId: string | undefined;
}

export function CheckinBanner({ studentId }: CheckinBannerProps) {
  const { pending, loading } = useCheckins(studentId);
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pending) {
      // Animação de entrada com delay
      const timer = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [pending]);

  if (loading || !pending) return null;

  return (
    <Card
      className={`overflow-hidden border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          {/* Pulsing badge */}
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary">
            <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75" />
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Check-in semanal disponível</p>
          <p className="text-xs text-muted-foreground truncate">
            Responda para manter seu acompanhamento em dia
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => navigate("/aluno/checkin")}
          className="gap-1.5 shrink-0"
        >
          Responder
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
