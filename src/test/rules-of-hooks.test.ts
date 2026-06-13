import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

// Garante que nenhum componente chame hooks após um early return,
// evitando o erro "Rendered more hooks than during the previous render".
describe("react-hooks/rules-of-hooks", () => {
  it("não deve haver violações em src/", () => {
    let output = "";
    try {
      execSync(
        'npx --no-install eslint "src/**/*.{ts,tsx}" --no-warn-ignored --format json --rule "{\\"react-hooks/rules-of-hooks\\":\\"error\\"}"',
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
    } catch (err: any) {
      output = err.stdout?.toString() ?? "";
    }

    if (!output) return; // no findings

    const results = JSON.parse(output) as Array<{
      filePath: string;
      messages: Array<{ ruleId: string | null; line: number; column: number; message: string }>;
    }>;

    const violations = results.flatMap((r) =>
      r.messages
        .filter((m) => m.ruleId === "react-hooks/rules-of-hooks")
        .map((m) => `${r.filePath}:${m.line}:${m.column}  ${m.message}`),
    );

    expect(violations, "\n" + violations.join("\n")).toEqual([]);
  }, 120_000);
});
