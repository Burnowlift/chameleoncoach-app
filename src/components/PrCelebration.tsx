import { useEffect } from "react";
import { onPrCelebration } from "@/lib/pr-celebration";
import { toast } from "sonner";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  vr: number;
}

function launchConfetti() {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) { canvas.remove(); return; }

  const colors = ["#FF8C00", "#FFD700", "#22c55e", "#60a5fa", "#f472b6", "#a78bfa"];
  const particles: Particle[] = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.4,
    vx: (Math.random() - 0.5) * 4,
    vy: 2 + Math.random() * 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 5 + Math.random() * 7,
    rotation: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
  }));

  const frame = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.rotation += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      ctx.restore();
    });
    if (particles.every(p => p.y > canvas.height + 20)) {
      canvas.remove();
      return;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  setTimeout(() => canvas.remove(), 6000);
}

export function PrCelebration() {
  useEffect(() => {
    return onPrCelebration(({ liftLabel, e1rm }) => {
      launchConfetti();
      if (navigator.vibrate) {
        try { navigator.vibrate([80, 40, 120]); } catch { /* sem suporte */ }
      }
      toast.success("Novo PR!", {
        description: `${liftLabel}: 1RM estimado de ${e1rm} kg.`,
      });
    });
  }, []);

  return null;
}
