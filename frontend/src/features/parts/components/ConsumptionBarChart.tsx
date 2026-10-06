import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '@/components/feedback';
import type { ConsumptionSummaryPoint } from '@/services/partsService';

type Metric = 'quantity' | 'value';

interface ConsumptionBarChartProps {
  data: ConsumptionSummaryPoint[];
  metric: Metric;
  emptyTitle: string;
  emptyDescription: string;
  limit?: number;
}

function formatMetric(metric: Metric, value: number): string {
  return metric === 'value' ? `₹${Math.round(value).toLocaleString('en-IN')}` : String(value);
}

/** Single-series ranked bar chart - one hue, no legend needed (the panel title names the series). */
export function ConsumptionBarChart({
  data,
  metric,
  emptyTitle,
  emptyDescription,
  limit = 10,
}: ConsumptionBarChartProps) {
  const ranked = [...data]
    .sort((a, b) => b[metric] - a[metric])
    .slice(0, limit)
    .reverse();

  if (!ranked.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} className="h-full py-8" />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={ranked} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}
          stroke="currentColor"
          className="text-slate-100 dark:text-slate-800"
        />
        <XAxis
          type="number"
          tick={{ fontSize: 12 }}
          stroke="currentColor"
          className="text-slate-400"
          tickFormatter={(value: number) => formatMetric(metric, value)}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={130}
          tick={{ fontSize: 12 }}
          stroke="currentColor"
          className="text-slate-400"
        />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
          formatter={(value) => [
            formatMetric(metric, Number(value)),
            metric === 'value' ? 'Value' : 'Quantity',
          ]}
        />
        <Bar dataKey={metric} fill="#2563eb" radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
