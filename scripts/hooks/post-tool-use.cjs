const { emit, getToolFilePath, readHookPayload, toPosixPath } = require("./hookUtils.cjs");

const RULES = [
  {
    test: (p) =>
      p.endsWith("/charts/types.ts") ||
      p.endsWith("/charts/registry.ts") ||
      p.endsWith("/types/data.ts") ||
      p.includes("/stores/"),
    context:
      "STATE-SENSITIVE FILE EDITED. Verify: (1) ChartDefinition/ChartRenderer interface changes propagate to all existing chart implementations. (2) DataSet/DataView/ColumnMeta changes propagate to shape-detector and transforms. (3) Store changes propagate to consuming components. (4) Cross-check against CLAUDE.md §6 Data Contracts — these changes require a master-plan update and a major semver bump.",
  },
  {
    test: (p) => p.includes("/charts/renderers/"),
    context:
      "RENDERER FILE EDITED. Verify: (1) WebGL cleanup on unmount (deck.gl/regl). (2) Theme tokens applied. (3) ChartArea still keys on chartType so switches trigger unmount.",
  },
];

async function main() {
  const payload = await readHookPayload();
  const f = toPosixPath(getToolFilePath(payload));
  if (!f) return;
  const m = RULES.find((r) => r.test(f));
  if (m) emit({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: m.context } });
}

main().catch((e) => {
  process.stderr.write(`[hook] post-tool-use failed: ${e.message}\n`);
  process.exitCode = 0;
});
