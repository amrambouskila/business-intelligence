import type { EChartsOption } from 'echarts';
import { chartRegistry } from '@/charts/registry';
import { EChartsBaseRenderer } from '@/charts/renderers/echarts-renderer';
import { buildCartesianAxes } from '@/charts/echarts/buildCartesianAxes';
import { buildGrid } from '@/charts/echarts/buildGrid';
import { buildTooltip } from '@/charts/echarts/buildTooltip';
import { categoricalColor } from '@/lib/categoricalColor';
import type { ChartConfig, ThemeTokens } from '@/charts/types';
import type { DataView } from '@/types/data';

interface TopicTermPoint {
  topic: string;
  term: string;
  weight: number;
}

function topicTermPoints(data: DataView, config: ChartConfig): TopicTermPoint[] {
  const topics = data.columnArrays[config.columns['topic']] ?? [];
  const terms = data.columnArrays[config.columns['term']] ?? [];
  const weights = data.columnArrays[config.columns['weight']] ?? [];
  const n = Math.min(topics.length, terms.length, weights.length);
  const points: TopicTermPoint[] = [];

  for (let i = 0; i < n; i++) {
    const weight = weights[i];
    if (topics[i] == null || terms[i] == null || typeof weight !== 'number' || !Number.isFinite(weight)) continue;
    points.push({ topic: String(topics[i]), term: String(terms[i]), weight });
  }

  return points;
}

class TopicTermBubbleRenderer extends EChartsBaseRenderer {
  protected isEmpty(data: DataView, config: ChartConfig): boolean {
    return topicTermPoints(data, config).length === 0;
  }

  protected emptyMessage(): string {
    return 'No topic-term weights to chart';
  }

  buildOption(data: DataView, config: ChartConfig, theme: ThemeTokens): EChartsOption {
    const points = topicTermPoints(data, config);
    const topics = [...new Set(points.map((p) => p.topic))];
    const terms = [...new Set(points.map((p) => p.term))];
    const topicIndex = new Map(topics.map((topic, i) => [topic, i]));
    const termIndex = new Map(terms.map((term, i) => [term, i]));
    const weights = points.map((p) => p.weight);
    const min = weights.reduce((a, b) => (a < b ? a : b), Infinity);
    const max = weights.reduce((a, b) => (a > b ? a : b), -Infinity);
    const range = max - min;
    const seriesData = points.map((p) => [termIndex.get(p.term)!, topicIndex.get(p.topic)!, p.weight, p.term, p.topic]);

    const axes = buildCartesianAxes(
      theme,
      { type: 'category', data: terms, rotate: terms.length > 8 ? 35 : undefined },
      { type: 'category', data: topics, axisLine: false },
    );

    return {
      tooltip: buildTooltip('item', {
        formatter: (params: unknown) => {
          const row = (params as { data?: unknown }).data as [number, number, number, string, string] | undefined;
          return row ? `${row[4]}<br/>${row[3]}: ${row[2]}` : '';
        },
      }),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      grid: buildGrid({ left: 96, bottom: 72 }),
      series: [{
        type: 'scatter',
        data: seriesData,
        symbolSize: (value: [number, number, number]) => {
          if (range <= 0) return 18;
          return 10 + ((value[2] - min) / range) * 34;
        },
        itemStyle: { color: categoricalColor(theme.colorScale, 0, theme.foreground), opacity: 0.72 },
      }],
    };
  }
}

chartRegistry.register({
  type: 'topic_term_bubble',
  family: 'specialized',
  name: 'Topic-Term Bubble',
  description: 'Topic-model terms positioned by topic and sized by weight',
  renderer: 'echarts',
  compatibleShapes: ['category_numeric', 'generic'],
  requiredColumns: [
    { role: 'topic', acceptedTypes: ['category', 'text'], label: 'Topic' },
    { role: 'term', acceptedTypes: ['category', 'text'], label: 'Term' },
    { role: 'weight', acceptedTypes: ['numeric', 'integer', 'float'], label: 'Weight' },
  ],
  createRenderer: () => new TopicTermBubbleRenderer(),
});
