import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface WordWeight {
  word: string;
  weight: number;
}

function wordWeights(data: DataView, config: ChartConfig): WordWeight[] {
  const words = data.columnArrays[config.columns['word']] ?? [];
  const weights = data.columnArrays[config.columns['weight']] ?? [];
  const n = Math.min(words.length, weights.length);
  const out: WordWeight[] = [];

  for (let i = 0; i < n; i++) {
    const weight = weights[i];
    if (words[i] == null || typeof weight !== 'number' || !Number.isFinite(weight)) continue;
    out.push({ word: String(words[i]), weight });
  }

  return out.sort((a, b) => b.weight - a.weight).slice(0, 30);
}

function wordPosition(index: number): { x: number; y: number; rotation: number } {
  const angle = index * 2.3999632297;
  const radius = index === 0 ? 0 : 28 + index * 8;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius * 0.62,
    rotation: index % 3 === 0 ? -0.08 : index % 3 === 1 ? 0.08 : 0,
  };
}

function wordFontSize(weight: number, min: number, max: number): number {
  const range = max - min;
  if (range <= 0) return 26;
  return 15 + ((weight - min) / range) * 34;
}

class WordCloudRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return wordWeights(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No words to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const words = wordWeights(data, config);
    const weights = words.map((w) => w.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const name = (params as { name?: string }).name;
          const value = (params as { value?: number }).value;
          return name ? `${name}: ${value}` : '';
        },
      },
      graphic: [{
        type: 'group',
        left: 'center',
        top: 'middle',
        children: words.map((word, index) => {
          const position = wordPosition(index);
          return {
            type: 'text',
            name: word.word,
            value: word.weight,
            x: position.x,
            y: position.y,
            rotation: position.rotation,
            style: {
              text: word.word,
              fill: categoricalColor(theme.colorScale, index, theme.foreground),
              font: `${Math.round(wordFontSize(word.weight, min, max))}px ${theme.fontFamily}`,
              align: 'center',
              verticalAlign: 'middle',
            },
          };
        }),
      }],
    };
  }
}

chartRegistry.register({
  type: 'word_cloud',
  family: 'specialized',
  name: 'Word Cloud',
  description: 'Weighted terms arranged by importance in a deterministic text cloud',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'word', acceptedTypes: ['category', 'text'], label: 'Word' },
    { role: 'weight', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Weight' },
  ],
  createRenderer: () => new WordCloudRenderer(),
});
