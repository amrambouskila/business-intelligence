/** A declarative, renderable description of one tunable chart option. */
export type ChartOptionControl = 'number' | 'toggle' | 'select' | 'color';

export interface ChartOptionSpec {
  key: string;
  label: string;
  control: ChartOptionControl;
  /** The value used when the layer has not set this option. Single source of truth. */
  default: number | boolean | string;
  /** number control bounds */
  min?: number;
  max?: number;
  step?: number;
  /** select control choices */
  choices?: { value: string; label: string }[];
}
