import { defineConfig, devices } from '@playwright/test';

/**
 * Visual-regression gate (Gate 3): renders every registered chart in a real
 * browser and asserts it actually paints (non-blank canvas + screenshot baseline)
 * — the coverage jsdom unit tests structurally cannot provide, since they mock
 * canvas/WebGL. Run inside the Playwright Docker image so baselines are
 * deterministic across machines and CI (see run_e2e.sh / .github/workflows/ci.yml).
 */
const PORT = Number(process.env.E2E_PORT ?? 4173);
const WORKERS = Number(process.env.E2E_WORKERS ?? (process.env.CI ? 1 : 2));

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: WORKERS,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  // Baselines are keyed only by chart name (no OS/browser suffix) because the
  // suite is always run in the pinned Linux Playwright image — one canonical set.
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 800 },
  },
  expect: {
    timeout: 15_000,
    // ECharts animation is disabled at the renderer for e2e (window.__E2E__), so
    // renders are final-state and stable; `threshold` absorbs per-pixel antialiasing
    // while the tight maxDiffPixelRatio still catches a dropped series / wrong color.
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, threshold: 0.2, animations: 'disabled' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
