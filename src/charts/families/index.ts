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

// Trigger lazy loads after initial render
let loaded = false;
export function ensureAllFamiliesLoaded(): Promise<void> {
  if (loaded) return Promise.resolve();
  loaded = true;
  return Promise.all(lazyFamilies.map((fn) => fn())).then(() => {});
}

// Auto-load lazily in the background after a short delay
if (typeof window !== 'undefined') {
  setTimeout(() => ensureAllFamiliesLoaded(), 500);
}
