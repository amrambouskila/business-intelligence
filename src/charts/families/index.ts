// Core families loaded eagerly (small, frequently used)
import './distribution';
import './time-series';
import './relationships';

// Remaining families loaded lazily on first access
const lazyFamilies = [
  () => import('./categorical'),
  () => import('./matrix'),
  () => import('./hierarchical'),
  () => import('./network-flow'),
  () => import('./geographic'),
  () => import('./finance'),
  () => import('./statistical'),
  () => import('./composition'),
  () => import('./specialized'),
  () => import('./three-d'),
];

// Loads every remaining family exactly once. Callers await this before reading
// the registry so the chart catalog is complete and deterministic on first
// paint — never a timing-dependent partial list. (App.tsx awaits this.)
let loadPromise: Promise<void> | null = null;
export function ensureAllFamiliesLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = Promise.all(lazyFamilies.map((fn) => fn())).then(() => {});
  }
  return loadPromise;
}
