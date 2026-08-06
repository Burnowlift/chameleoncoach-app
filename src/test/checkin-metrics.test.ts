import { describe, it, expect } from "vitest";
import { monthlyCheckinProgress } from "@/lib/checkin-metrics";

const NOW = new Date(2026, 7, 6); // 06/08/2026 (mês de agosto)

const ci = (
  day: number,
  status: "pending" | "completed" | "expired",
  month = 7,
) => ({
  available_at: new Date(2026, month, day, 8, 0, 0).toISOString(),
  status,
});

describe("monthlyCheckinProgress", () => {
  it("calcula 75% quando 3 de 4 check-ins do mês foram respondidos", () => {
    const result = monthlyCheckinProgress(
      [
        ci(1, "completed"),
        ci(8, "completed"),
        ci(15, "completed"),
        ci(22, "expired"),
      ],
      NOW,
    );
    expect(result.total).toBe(4);
    expect(result.responded).toBe(3);
    expect(result.pct).toBe(75);
  });

  it("considera check-in pendente como disponibilizado (não respondido)", () => {
    const result = monthlyCheckinProgress([ci(6, "pending"), ci(6, "completed")], NOW);
    expect(result.pct).toBe(50);
  });

  it("retorna 0% quando não existe nenhum check-in no mês", () => {
    const result = monthlyCheckinProgress([], NOW);
    expect(result).toEqual({ total: 0, responded: 0, pct: 0 });
  });

  it("ignora check-ins de outros meses", () => {
    const result = monthlyCheckinProgress(
      [
        ci(25, "completed", 6), // julho (anterior)
        { available_at: new Date(2026, 9, 3).toISOString(), status: "completed" }, // outubro
      ],
      NOW,
    );
    expect(result.pct).toBe(0);
  });

  it("ignora datas inválidas e retorna 100% quando todos respondem", () => {
    const result = monthlyCheckinProgress(
      [ci(1, "completed"), { available_at: "data-invalida", status: "completed" }],
      NOW,
    );
    expect(result).toEqual({ total: 1, responded: 1, pct: 100 });
  });
});
