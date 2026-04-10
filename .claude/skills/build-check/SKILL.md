---
name: build-check
description: Run type-check and production build to verify the project compiles cleanly. Use proactively after making code changes.
trigger: proactive
---

# Build Check

Run the TypeScript compiler and Vite build to verify the project compiles.

## Steps

1. Run type-check:
```sh
npx tsc --noEmit
```

2. If type-check passes, run production build:
```sh
npm run build
```

3. Report results:
- If both pass: "Build check passed — types clean, production build OK"
- If type-check fails: list the type errors with file:line references
- If build fails: show the Vite error output