import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '@/components/feedback';
import type { DashboardHub } from '@/services/dashboardService';

interface TopHubsChartProps {
  data: DashboardHub[];
}

export function TopHubsChart({ data }: TopHubsChartProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        title="No open tickets"
        description="Hubs will appear here once tickets are open."
        className="h-full py-8"
      />
    );
  }

  const chartData = [...data].sort((a, b) => a.openTickets - b.openTickets);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}
          stroke="currentColor"
          className="text-slate-100 dark:text-slate-800"
        />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 12 }}
          stroke="currentColor"
          className="text-slate-400"
        />
        <YAxis
          type="category"
          dataKey="hub"
          width={90}
          tick={{ fontSize: 12 }}
          stroke="currentColor"
          className="text-slate-400"
        />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
        <Bar dataKey="openTickets" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
