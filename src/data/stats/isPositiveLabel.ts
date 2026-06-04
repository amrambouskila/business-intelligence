/**
 * Whether a raw label denotes the positive class: the number 1, boolean true, or
 * the strings '1'/'true' (trimmed, case-insensitive). Everything else is negative.
 * Shared by rocCurve/prCurve/calibrationCurve so all three agree on the positive
 * class for the same label column.
 */
export function isPositiveLabel(label: unknown): boolean {
  if (label === 1 || label === true) {
    return true;
  }
  if (typeof label === 'string') {
    const normalized = label.trim().toLowerCase();
    return normalized === '1' || normalized === 'true';
  }
  return false;
}
