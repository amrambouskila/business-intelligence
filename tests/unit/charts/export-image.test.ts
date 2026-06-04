import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/downloadDataUrlFile', () => ({
  downloadDataUrlFile: vi.fn(),
}));

import { chartRootToPNGDataUrl, chartRootToSVGDataUrl, downloadChartPNG, downloadChartSVG } from '@/charts/export-image';
import { downloadDataUrlFile } from '@/lib/downloadDataUrlFile';

function rootWithCanvas(canvas: HTMLCanvasElement): HTMLDivElement {
  const root = document.createElement('div');
  root.appendChild(canvas);
  return root;
}

function rootWithSVG(svg: SVGSVGElement): HTMLDivElement {
  const root = document.createElement('div');
  root.appendChild(svg);
  return root;
}

describe('chart image export helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('returns a PNG data URL from the first non-empty canvas', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 20;
    canvas.height = 10;
    vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,chart');

    expect(chartRootToPNGDataUrl(rootWithCanvas(canvas))).toBe('data:image/png;base64,chart');
  });

  it('composites multiple exportable canvases into one PNG data URL', () => {
    const root = document.createElement('div');
    const first = document.createElement('canvas');
    const second = document.createElement('canvas');
    first.width = 20;
    first.height = 10;
    second.width = 30;
    second.height = 12;
    root.append(first, second);
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: 40, height: 30 } as DOMRect);
    vi.spyOn(first, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: 20, height: 10 } as DOMRect);
    vi.spyOn(second, 'getBoundingClientRect').mockReturnValue({ left: 15, top: 25, width: 30, height: 12 } as DOMRect);
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,composite');

    expect(chartRootToPNGDataUrl(root)).toBe('data:image/png;base64,composite');
    expect(drawImage).toHaveBeenNthCalledWith(1, first, 0, 0);
    expect(drawImage).toHaveBeenNthCalledWith(2, second, 5, 5);
  });

  it('composites canvases without a root element at zero offset', () => {
    const root = document.createDocumentFragment();
    const first = document.createElement('canvas');
    const second = document.createElement('canvas');
    first.width = 2;
    first.height = 3;
    second.width = 4;
    second.height = 5;
    root.append(first, second);
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,fragment');

    expect(chartRootToPNGDataUrl(root)).toBe('data:image/png;base64,fragment');
    expect(drawImage).toHaveBeenNthCalledWith(1, first, 0, 0);
    expect(drawImage).toHaveBeenNthCalledWith(2, second, 0, 0);
  });

  it('clamps negative canvas offsets when compositing', () => {
    const root = document.createElement('div');
    const canvas = document.createElement('canvas');
    const overlay = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    overlay.width = 10;
    overlay.height = 10;
    root.append(canvas, overlay);
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({ left: 20, top: 20, width: 10, height: 10 } as DOMRect);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 15, top: 15, width: 10, height: 10 } as DOMRect);
    vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue({ left: 25, top: 26, width: 10, height: 10 } as DOMRect);
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,clamped');

    expect(chartRootToPNGDataUrl(root)).toBe('data:image/png;base64,clamped');
    expect(drawImage).toHaveBeenNthCalledWith(1, canvas, 0, 0);
    expect(drawImage).toHaveBeenNthCalledWith(2, overlay, 5, 6);
  });

  it('returns null when there is no exportable PNG canvas', () => {
    expect(chartRootToPNGDataUrl(null)).toBeNull();
    expect(chartRootToPNGDataUrl(document.createElement('div'))).toBeNull();

    const emptyCanvas = document.createElement('canvas');
    emptyCanvas.width = 0;
    emptyCanvas.height = 0;
    expect(chartRootToPNGDataUrl(rootWithCanvas(emptyCanvas))).toBeNull();

    const jpegCanvas = document.createElement('canvas');
    jpegCanvas.width = 1;
    jpegCanvas.height = 1;
    vi.spyOn(jpegCanvas, 'toDataURL').mockReturnValue('data:image/jpeg;base64,chart');
    expect(chartRootToPNGDataUrl(rootWithCanvas(jpegCanvas))).toBeNull();
  });

  it('returns null when multiple canvases cannot create a composite context', () => {
    const root = document.createElement('div');
    const first = document.createElement('canvas');
    const second = document.createElement('canvas');
    first.width = 1;
    first.height = 1;
    second.width = 1;
    second.height = 1;
    root.append(first, second);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    expect(chartRootToPNGDataUrl(root)).toBeNull();
  });

  it('returns null when a composite canvas serializes to a non-PNG URL', () => {
    const root = document.createElement('div');
    const first = document.createElement('canvas');
    const second = document.createElement('canvas');
    first.width = 1;
    first.height = 1;
    second.width = 1;
    second.height = 1;
    root.append(first, second);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,composite');

    expect(chartRootToPNGDataUrl(root)).toBeNull();
  });

  it('returns null when canvas serialization throws', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    vi.spyOn(canvas, 'toDataURL').mockImplementation(() => {
      throw new Error('tainted canvas');
    });

    expect(chartRootToPNGDataUrl(rootWithCanvas(canvas))).toBeNull();
  });

  it('downloads only when a PNG data URL is available', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,chart');

    expect(downloadChartPNG(rootWithCanvas(canvas), 'chart.png')).toBe(true);
    expect(downloadDataUrlFile).toHaveBeenCalledWith('chart.png', 'data:image/png;base64,chart');

    expect(downloadChartPNG(document.createElement('div'), 'missing.png')).toBe(false);
    expect(downloadDataUrlFile).toHaveBeenCalledTimes(1);
  });

  it('returns an encoded SVG data URL from the first SVG node', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 10 10');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '5');
    svg.appendChild(circle);

    const dataUrl = chartRootToSVGDataUrl(rootWithSVG(svg));

    expect(dataUrl).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    expect(decodeURIComponent(dataUrl!.split(',')[1])).toContain('<circle cx="5"');
  });

  it('returns null when there is no SVG or SVG serialization throws', () => {
    expect(chartRootToSVGDataUrl(null)).toBeNull();
    expect(chartRootToSVGDataUrl(document.createElement('div'))).toBeNull();

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    vi.spyOn(XMLSerializer.prototype, 'serializeToString').mockImplementation(() => {
      throw new Error('serialization failed');
    });
    expect(chartRootToSVGDataUrl(rootWithSVG(svg))).toBeNull();
  });

  it('downloads only when an SVG data URL is available', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    expect(downloadChartSVG(rootWithSVG(svg), 'chart.svg')).toBe(true);
    expect(downloadDataUrlFile).toHaveBeenCalledWith(
      'chart.svg',
      expect.stringMatching(/^data:image\/svg\+xml;charset=utf-8,/),
    );

    expect(downloadChartSVG(document.createElement('div'), 'missing.svg')).toBe(false);
    expect(downloadDataUrlFile).toHaveBeenCalledTimes(1);
  });
});
