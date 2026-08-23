# Pre-Commit Check

Final gate before committing. Run all checks sequentially — if any fail, do NOT commit.

## Step 1: Build Pipeline

Run each command and report PASS/FAIL:

1. **Type-check**: `npx tsc --noEmit`
2. **Build**: `npm run build`

If either fails, stop and fix the errors before continuing.

## Step 2: Code Review

Run the `/review` command logic on all changed files.
Report any Critical findings — these block the commit.

## Step 3: SAST Audit

Run the local SAST set from `AGENTS.md` §10a and report PASS/FAIL (read-only — do not fix automatically):

1. `npx semgrep scan --config auto --config p/typescript --config p/react --error`
2. `npm audit --audit-level=high`
3. `gitleaks detect --no-git --redact`

FAIL on any HIGH/CRITICAL finding. MEDIUM findings pass only with a written justification in the report. If a changed file touches an input boundary (parsers, renderers/formatters, filter/annotation inputs, export, `nginx.conf`), confirm the boundary row in `AGENTS.md` `<security>` still describes its injection class(es) and defense.

## Step 4: Registry Integrity

Verify the chart registry is consistent:
1. Count `chartRegistry.register` calls in `src/charts/families/`
2. Verify each family's `index.ts` imports all chart files in that directory
3. Verify `src/charts/families/index.ts` imports all family directories
4. Check for any chart files that exist but aren't imported

## Step 5: Architecture Alignment

Check AGENTS.md alignment:
- [ ] One chart definition per file
- [ ] All charts use the registry pattern
- [ ] Renderers extend base classes
- [ ] Stores are properly typed
- [ ] Theme tokens used (no hardcoded colors)
- [ ] Data pipeline types consistent

## Step 6: Unified Report

Combine all results:

```
=== PRE-COMMIT REPORT ===
Type-check:       PASS/FAIL
Build:            PASS/FAIL
Code Review:      X critical, Y recommended, Z minor
SAST:             PASS/FAIL (H/C: n, MEDIUM triaged: n)
Registry:         N charts registered, all families imported
Architecture:     PASS/FAIL

Verdict: READY TO COMMIT / NOT READY
```

If NOT READY, list all blockers with file:line references.