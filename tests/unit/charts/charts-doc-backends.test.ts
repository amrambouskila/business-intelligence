import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { chartRegistry } from '@/charts/registry';
import { ensureAllFamiliesLoaded } from '@/charts/families';
import type { RendererBackend } from '@/charts/types';

function backendCatalogRows(): Array<{ backend: RendererBackend; ids: string[] }> {
  const text = readFileSync(resolve(process.cwd(), 'CHARTS.md'), 'utf8');
  const [, section = ''] = text.match(/## Renderer Backend Catalog\n([\s\S]*?)\n---/) ?? [];
  const rows = section.split('\n').filter((line) => line.startsWith('|') && !line.includes('---'));
  const catalog: Array<{ backend: RendererBackend; ids: string[] }> = [];

  for (const row of rows) {
    const [, backendCell, idsCell] = row.split('|').map((part) => part.trim()).slice(1);
    const backend = backendCell?.replaceAll('`', '') as RendererBackend | undefined;
    if (!backend || !idsCell) continue;
    catalog.push({ backend, ids: [...idsCell.matchAll(/`([^`]+)`/g)].map(([, id]) => id) });
  }

  return catalog;
}

function documentedBackends(): Map<string, RendererBackend> {
  const entries = new Map<string, RendererBackend>();
  for (const row of backendCatalogRows()) {
    for (const id of row.ids) entries.set(id, row.backend);
  }
  return entries;
}

function documentedTypeIds(): string[] {
  return backendCatalogRows().flatMap((row) => row.ids);
}

beforeAll(async () => {
  await ensureAllFamiliesLoaded();
}, 60_000);

describe('CHARTS.md renderer backend catalog', () => {
  it('documents the renderer backend for every registered chart exactly once', () => {
    const documentedIds = documentedTypeIds();
    const docs = documentedBackends();
    const registry = new Map(chartRegistry.all().map((def) => [def.type, def.renderer]));

    expect(documentedIds).toHaveLength(new Set(documentedIds).size);
    expect(docs.size).toBe(registry.size);
    for (const [type, renderer] of registry) {
      expect(docs.get(type), type).toBe(renderer);
    }
    for (const type of docs.keys()) {
      expect(registry.has(type), type).toBe(true);
    }
  });
});
