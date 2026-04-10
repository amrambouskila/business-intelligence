import type { ChartDefinition, ChartFamily } from './types';
import type { DataShape } from '@/types/data';

class ChartRegistry {
  private charts = new Map<string, ChartDefinition>();
  private byFamily = new Map<ChartFamily, ChartDefinition[]>();
  private byShape = new Map<DataShape, ChartDefinition[]>();

  register(def: ChartDefinition): void {
    if (this.charts.has(def.type)) {
      throw new Error(`Chart type "${def.type}" already registered`);
    }
    this.charts.set(def.type, def);

    const fam = this.byFamily.get(def.family) ?? [];
    fam.push(def);
    this.byFamily.set(def.family, fam);

    for (const shape of def.compatibleShapes) {
      const s = this.byShape.get(shape) ?? [];
      s.push(def);
      this.byShape.set(shape, s);
    }
  }

  get(type: string): ChartDefinition | undefined {
    return this.charts.get(type);
  }

  getByFamily(family: ChartFamily): ChartDefinition[] {
    return this.byFamily.get(family) ?? [];
  }

  suggestForShape(shape: DataShape): ChartDefinition[] {
    return this.byShape.get(shape) ?? [];
  }

  all(): ChartDefinition[] {
    return Array.from(this.charts.values());
  }

  families(): ChartFamily[] {
    return Array.from(this.byFamily.keys());
  }

  get count(): number {
    return this.charts.size;
  }
}

export const chartRegistry = new ChartRegistry();
