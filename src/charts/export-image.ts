import { downloadDataUrlFile } from '@/lib/downloadDataUrlFile';

function exportableCanvases(root: ParentNode | null): HTMLCanvasElement[] {
  return Array.from(root?.querySelectorAll('canvas') ?? [])
    .filter((canvas) => canvas.width > 0 && canvas.height > 0);
}

function canvasOffset(canvas: HTMLCanvasElement, rootRect: DOMRect): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.round(rect.left - rootRect.left)),
    y: Math.max(0, Math.round(rect.top - rootRect.top)),
  };
}

export function chartRootToPNGDataUrl(root: ParentNode | null): string | null {
  const canvases = exportableCanvases(root);
  if (canvases.length === 0) return null;

  try {
    if (canvases.length === 1) {
      const dataUrl = canvases[0].toDataURL('image/png');
      return dataUrl.startsWith('data:image/png') ? dataUrl : null;
    }

    const rootRect = root instanceof Element ? root.getBoundingClientRect() : null;
    const width = Math.max(
      1,
      Math.round(rootRect?.width ?? 0),
      ...canvases.map((canvas) => canvas.width),
    );
    const height = Math.max(
      1,
      Math.round(rootRect?.height ?? 0),
      ...canvases.map((canvas) => canvas.height),
    );
    const composite = document.createElement('canvas');
    composite.width = width;
    composite.height = height;
    const context = composite.getContext('2d');
    if (!context) return null;
    for (const canvas of canvases) {
      const offset = rootRect ? canvasOffset(canvas, rootRect) : { x: 0, y: 0 };
      context.drawImage(canvas, offset.x, offset.y);
    }
    const dataUrl = composite.toDataURL('image/png');
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
