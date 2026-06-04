import { test, expect, type Page } from '@playwright/test';
import { CHART_SAMPLE } from './chart-samples';

/**
 * Drive the real app: load the chart's sample dataset from the Toolbar, open the
 * full catalog, click the chart, and wait for ChartArea to auto-assign its columns
 * and mount the canvas.
 */
async function openChart(page: Page, sample: string, chartType: string): Promise<void> {
  // Disable ECharts' canvas animation before the app loads so screenshots capture
  // the deterministic final frame (Playwright's animations:'disabled' can't touch it).
  await page.addInitScript(() => {
    window.__E2E__ = true;
  });
  await page.goto('/');
  // The sidebar (and its "Charts" tab) only mounts after the lazy chart families load.
  await page.getByRole('button', { name: 'Charts' }).waitFor();

  await page.getByRole('button', { name: 'Samples' }).click();
  await page.locator(`[data-sample="${sample}"]`).click();

  await page.getByRole('button', { name: 'Charts' }).click();
  // Reveal the full catalog (when a dataset is loaded the picker opens on suggestions).
  const showAll = page.getByRole('button', { name: /Show all charts/ });
  if (await showAll.count()) {
    await showAll.click();
  }
  await page.locator(`[data-chart-type="${chartType}"]`).click();

  const render = page.getByTestId('chart-render');
  await expect(render).toHaveAttribute('data-chart-active', chartType);
  await expect(render).toHaveAttribute('data-chart-unfilled', 'false');
  await expect(render.locator('canvas').first()).toBeVisible();
}

/** Fraction of canvas pixels that differ from the top-left (background) pixel. */
function canvasDiffRatio(): number {
  const canvas = document.querySelector('[data-testid="chart-render"] canvas') as HTMLCanvasElement | null;
  if (!canvas) return -1;
  const ctx = canvas.getContext('2d');
  // A WebGL-backed chart (future deck.gl/regl) exposes no 2d context; its non-blank
  // state is covered by the screenshot baseline instead, so treat it as non-blank here.
  if (!ctx) return 1;
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  const r0 = data[0];
  const g0 = data[1];
  const b0 = data[2];
  const a0 = data[3];
  let diff = 0;
  for (let i = 0; i < data.length; i += 4) {
    const delta =
      Math.abs(data[i] - r0) + Math.abs(data[i + 1] - g0) + Math.abs(data[i + 2] - b0) + Math.abs(data[i + 3] - a0);
    if (delta > 16) diff += 1;
  }
  return diff / (width * height);
}

// Charts whose layout is intrinsically non-deterministic get the non-blank floor
// only — no pixel baseline. force_directed_graph uses ECharts' force layout, which
// seeds node positions with Math.random() (no seedable RNG), so its render differs
// every load and cannot have a stable screenshot.
const SKIP_SCREENSHOT = new Set(['force_directed_graph']);

for (const [chartType, sample] of Object.entries(CHART_SAMPLE)) {
  test(`renders ${chartType} (${sample})`, async ({ page }) => {
    await openChart(page, sample, chartType);
    const render = page.getByTestId('chart-render');

    // Screenshot baseline. Animation is disabled at the renderer (window.__E2E__),
    // so the render is already at its final, deterministic state.
    if (!SKIP_SCREENSHOT.has(chartType)) {
      await expect(render).toHaveScreenshot(`${chartType}.png`);
    }

    // Non-blank floor: the canvas must paint meaningfully many non-background pixels.
    // This is the assertion jsdom unit tests cannot make (canvas/WebGL are mocked).
    const diffRatio = await page.evaluate(canvasDiffRatio);
    expect(diffRatio, `${chartType} rendered a blank canvas`).toBeGreaterThan(0.002);
  });
}
