import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadDataUrlFile } from '@/lib/downloadDataUrlFile';

describe('downloadDataUrlFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clicks a temporary link with the data URL and filename', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const remove = vi.spyOn(HTMLAnchorElement.prototype, 'remove').mockImplementation(() => {});
    const append = vi.spyOn(document.body, 'appendChild');

    downloadDataUrlFile('chart.png', 'data:image/png;base64,abc');

    const link = append.mock.calls[0][0] as HTMLAnchorElement;
    expect(link.href).toBe('data:image/png;base64,abc');
    expect(link.download).toBe('chart.png');
    expect(click).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
