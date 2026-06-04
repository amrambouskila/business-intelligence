import { expect, test, type Page } from '@playwright/test';

async function loadSample(page: Page, sample: string): Promise<void> {
  await page.getByRole('button', { name: 'Samples' }).click();
  await page.locator(`[data-sample="${sample}"]`).click();
  await page.getByRole('button', { name: 'Charts', exact: true }).click();
  const showAll = page.getByRole('button', { name: /Show all charts/ });
  if (await showAll.count()) {
    await showAll.click();
  }
}

async function selectChart(page: Page, chartType: string): Promise<void> {
  await page.locator(`[data-chart-type="${chartType}"]`).click();
  const render = page.getByTestId('chart-render');
  await expect(render).toHaveAttribute('data-chart-active', chartType);
  await expect(render).toHaveAttribute('data-chart-unfilled', 'false');
  await expect(render.locator('canvas').first()).toBeVisible();
}

test('switches repeatedly across deck.gl map and 3D charts without renderer failures', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.addInitScript(() => {
    window.__E2E__ = true;
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Charts', exact: true }).waitFor();

  await loadSample(page, 'geo');
  for (const chartType of ['point_map', 'bubble_map', 'flow_map', 'route_map']) {
    await selectChart(page, chartType);
  }

  await loadSample(page, 'numeric');
  for (const chartType of ['three_d_scatter', 'three_d_surface', 'three_d_bar_chart', 'three_d_volume_rendering']) {
    await selectChart(page, chartType);
  }

  await loadSample(page, 'geo');
  for (const chartType of ['symbol_map', 'density_map', 'hexbin_map', 'tile_grid_map']) {
    await selectChart(page, chartType);
  }

  await expect(page.getByTestId('chart-render').locator('canvas').first()).toBeVisible();
  expect(pageErrors).toEqual([]);
});
