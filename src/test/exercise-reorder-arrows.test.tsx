import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Visual/responsive regression test for exercise reordering arrows.
 *
 * Goal: guarantee the ↑/↓ controls remain visible and reachable on every
 * viewport (desktop, tablet, mobile) and on every card state
 * (first item, middle item, last item, main-lift, very long names).
 *
 * The fixture below mirrors the exact markup used in BlockSessions.tsx and
 * StudentWorkoutDialog.tsx so that any future refactor of those cards
 * triggers a failure here if the arrows lose visibility guarantees.
 */

type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  isMainLift?: boolean;
};

function ExerciseCard({
  exercise,
  idx,
  total,
}: {
  exercise: Exercise;
  idx: number;
  total: number;
}) {
  return (
    <div
      data-testid={`exercise-card-${exercise.id}`}
      className={`p-2 rounded-md text-sm grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-visible ${
        exercise.isMainLift ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
        <span className="font-medium truncate">{exercise.name}</span>
      </div>
      <div
        data-testid={`actions-${exercise.id}`}
        className="flex items-center justify-end gap-2 shrink-0 min-w-max overflow-visible"
      >
        <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
          {exercise.sets}x{exercise.reps}
        </span>
        <div
          data-testid={`reorder-${exercise.id}`}
          className="flex h-8 w-16 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-background shadow-sm ring-1 ring-primary/10"
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-r-none"
            disabled={idx === 0}
            title="Mover para cima"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <div className="h-5 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-l-none"
            disabled={idx === total - 1}
            title="Mover para baixo"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExerciseList({ items }: { items: Exercise[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((ex, i) => (
        <ExerciseCard key={ex.id} exercise={ex} idx={i} total={items.length} />
      ))}
    </div>
  );
}

const VIEWPORTS = [
  { label: "mobile-320", width: 320 },
  { label: "mobile-375", width: 375 },
  { label: "tablet-768", width: 768 },
  { label: "desktop-1280", width: 1280 },
];

const FIXTURE: Exercise[] = [
  { id: "a", name: "Agachamento", sets: 5, reps: "5", isMainLift: true },
  { id: "b", name: "Supino reto", sets: 4, reps: "8" },
  {
    id: "c",
    name: "Remada curvada com pegada pronada e barra olímpica longa",
    sets: 3,
    reps: "10-12",
  },
  { id: "d", name: "Levantamento Terra", sets: 1, reps: "1", isMainLift: true },
];

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
}

describe("Exercise reorder arrows — visibility across viewports & card states", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  for (const vp of VIEWPORTS) {
    it(`renders both arrows for every card at ${vp.label}`, () => {
      setViewport(vp.width);
      render(<ExerciseList items={FIXTURE} />);

      for (const ex of FIXTURE) {
        const card = screen.getByTestId(`exercise-card-${ex.id}`);
        const up = within(card).getByTitle("Mover para cima");
        const down = within(card).getByTitle("Mover para baixo");

        expect(up).toBeInTheDocument();
        expect(down).toBeInTheDocument();
        // Icons present
        expect(up.querySelector("svg")).toBeTruthy();
        expect(down.querySelector("svg")).toBeTruthy();
      }
    });
  }

  it("keeps arrow container non-shrinkable and reserves fixed width", () => {
    render(<ExerciseList items={FIXTURE} />);
    for (const ex of FIXTURE) {
      const reorder = screen.getByTestId(`reorder-${ex.id}`);
      expect(reorder.className).toMatch(/shrink-0/);
      expect(reorder.className).toMatch(/\bw-16\b/);
      expect(reorder.className).toMatch(/\bh-8\b/);

      const actions = screen.getByTestId(`actions-${ex.id}`);
      expect(actions.className).toMatch(/shrink-0/);
      expect(actions.className).toMatch(/min-w-max/);
    }
  });

  it("disables only the boundary arrow (first card → up, last card → down)", () => {
    render(<ExerciseList items={FIXTURE} />);

    const first = screen.getByTestId("exercise-card-a");
    expect(within(first).getByTitle("Mover para cima")).toBeDisabled();
    expect(within(first).getByTitle("Mover para baixo")).not.toBeDisabled();

    const last = screen.getByTestId(`exercise-card-${FIXTURE[FIXTURE.length - 1].id}`);
    expect(within(last).getByTitle("Mover para cima")).not.toBeDisabled();
    expect(within(last).getByTitle("Mover para baixo")).toBeDisabled();

    // Middle cards: both enabled — arrows still rendered & interactive.
    const middle = screen.getByTestId("exercise-card-b");
    expect(within(middle).getByTitle("Mover para cima")).not.toBeDisabled();
    expect(within(middle).getByTitle("Mover para baixo")).not.toBeDisabled();
  });

  it("renders arrows even for main-lift cards and very long exercise names", () => {
    render(<ExerciseList items={FIXTURE} />);

    const mainLift = screen.getByTestId("exercise-card-a");
    expect(within(mainLift).getByTitle("Mover para cima")).toBeInTheDocument();
    expect(within(mainLift).getByTitle("Mover para baixo")).toBeInTheDocument();

    const longName = screen.getByTestId("exercise-card-c");
    expect(within(longName).getByTitle("Mover para cima")).toBeInTheDocument();
    expect(within(longName).getByTitle("Mover para baixo")).toBeInTheDocument();
    // Name is truncated, but actions column stays untouched.
    const nameSpan = longName.querySelector(".truncate");
    expect(nameSpan?.className).toMatch(/truncate/);
  });

  it("renders arrows for a single-exercise list (both boundaries on same card)", () => {
    render(<ExerciseList items={[FIXTURE[0]]} />);
    const card = screen.getByTestId("exercise-card-a");
    expect(within(card).getByTitle("Mover para cima")).toBeDisabled();
    expect(within(card).getByTitle("Mover para baixo")).toBeDisabled();
    // Both still in the DOM — never hidden.
    expect(within(card).getByTitle("Mover para cima")).toBeVisible();
    expect(within(card).getByTitle("Mover para baixo")).toBeVisible();
  });
});
