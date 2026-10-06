import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardTrendPoint } from '@/services/dashboardService';

interface TicketsTrendChartProps {
  data: DashboardTrendPoint[];
}

function formatDay(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function TicketsTrendChart({ data }: TicketsTrendChartProps) {
  const chartData = data.map((point) => ({ label: formatDay(point.date), count: point.count }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
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
        />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
          labelStyle={{ fontWeight: 600 }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#2563eb"
          strokeWidth={2.5}
          dot={{ r: 4, fill: '#2563eb' }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
