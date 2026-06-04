import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadTextFile } from '@/lib/downloadTextFile';

describe('downloadTextFile', () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  afterEach(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    vi.restoreAllMocks();
  });

  it('creates a Blob URL, clicks a temporary link, and revokes the URL', () => {
    const create = vi.fn(() => 'blob:export');
    const revoke = vi.fn();
    URL.createObjectURL = create;
    URL.revokeObjectURL = revoke;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const remove = vi.spyOn(HTMLAnchorElement.prototype, 'remove').mockImplementation(() => {});
    const append = vi.spyOn(document.body, 'appendChild');
    const createElement = vi.spyOn(document, 'createElement');

    downloadTextFile('data.csv', 'a,b\n1,2', 'text/csv');

    expect(create).toHaveBeenCalledWith(expect.any(Blob));
    expect(createElement).toHaveBeenCalledWith('a');
    const link = append.mock.calls[0][0] as HTMLAnchorElement;
    expect(link.href).toBe('blob:export');
    expect(link.download).toBe('data.csv');
    expect(append).toHaveBeenCalledWith(link);
    expect(click).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith('blob:export');
  });
});
