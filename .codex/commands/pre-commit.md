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

## Step 3: Registry Integrity

Verify the chart registry is consistent:
1. Count `chartRegistry.register` calls in `src/charts/families/`
2. Verify each family's `index.ts` imports all chart files in that directory
3. Verify `src/charts/families/index.ts` imports all family directories
4. Check for any chart files that exist but aren't imported

## Step 4: Architecture Alignment

Check AGENTS.md alignment:
- [ ] One chart definition per file
- [ ] All charts use the registry pattern
- [ ] Renderers extend base classes
- [ ] Stores are properly typed
- [ ] Theme tokens used (no hardcoded colors)
- [ ] Data pipeline types consistent

## Step 5: Unified Report

Combine all results:

```
=== PRE-COMMIT REPORT ===
Type-check:       PASS/FAIL
Build:            PASS/FAIL
Code Review:      X critical, Y recommended, Z minor
Registry:         N charts registered, all families imported
Architecture:     PASS/FAIL

Verdict: READY TO COMMIT / NOT READY
```

If NOT READY, list all blockers with file:line references.