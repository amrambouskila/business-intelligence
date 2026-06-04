import { downloadDataUrlFile } from '@/lib/downloadDataUrlFile';

export function chartRootToPNGDataUrl(root: ParentNode | null): string | null {
  const canvas = root?.querySelector('canvas');
  if (!canvas || canvas.width <= 0 || canvas.height <= 0) return null;

  try {
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl.startsWith('data:image/png') ? dataUrl : null;
  } catch {
    return null;
  }
}

export function downloadChartPNG(root: ParentNode | null, filename: string): boolean {
  const dataUrl = chartRootToPNGDataUrl(root);
  if (!dataUrl) return false;
  downloadDataUrlFile(filename, dataUrl);
  return true;
}

export function chartRootToSVGDataUrl(root: ParentNode | null): string | null {
  const svg = root?.querySelector('svg');
  if (!svg) return null;

  try {
    const markup = new XMLSerializer().serializeToString(svg);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  } catch {
    return null;
  }
}

export function downloadChartSVG(root: ParentNode | null, filename: string): boolean {
  const dataUrl = chartRootToSVGDataUrl(root);
  if (!dataUrl) return false;
  downloadDataUrlFile(filename, dataUrl);
  return true;
}
