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
