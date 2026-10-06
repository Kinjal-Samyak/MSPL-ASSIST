import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '@/components/feedback';
import type { ConsumptionSummaryPoint } from '@/services/partsService';

type Metric = 'quantity' | 'value';

interface MonthlyConsumptionChartProps {
  data: ConsumptionSummaryPoint[];
  metric: Metric;
}

function formatMetric(metric: Metric, value: number): string {
  return metric === 'value' ? `₹${Math.round(value).toLocaleString('en-IN')}` : String(value);
}

export function MonthlyConsumptionChart({ data, metric }: MonthlyConsumptionChartProps) {
  if (!data.length) {
    return (
      <EmptyState
        title="No consumption recorded yet"
        description="Monthly figures appear here once spare part requests are approved."
        className="h-full py-8"
      />
    );
  }

  const chartData = [...data].sort((a, b) => a.key.localeCompare(b.key));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          className="text-slate-100 dark:text-slate-800"
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12 }}
          stroke="currentColor"
          className="text-slate-400"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12 }}
          stroke="currentColor"
          className="text-slate-400"
          tickFormatter={(value: number) => formatMetric(metric, value)}
        />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
          formatter={(value) => [
            formatMetric(metric, Number(value)),
            metric === 'value' ? 'Value' : 'Quantity',
          ]}
        />
        <Bar dataKey={metric} fill="#2563eb" radius={[4, 4, 0, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
