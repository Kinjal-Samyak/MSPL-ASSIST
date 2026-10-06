import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui';
import type { ExecutiveDashboardResponse } from '@/services/reportService';

interface ReportChartsProps {
  executive: ExecutiveDashboardResponse | null;
}

const PIE_COLORS = ['#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export function ReportCharts({ executive }: ReportChartsProps) {
  if (!executive) return null;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Ticket Trend (Line)</CardTitle>
        </CardHeader>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={executive.ticketTrend}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tickets by Status (Bar)</CardTitle>
        </CardHeader>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={executive.ticketsByStatus}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tickets by Category (Pie)</CardTitle>
        </CardHeader>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={executive.ticketsByCategory}
                dataKey="value"
                nameKey="label"
                outerRadius={90}
              >
                {executive.ticketsByCategory.map((entry, index) => (
                  <Cell
                    key={`${entry.label}-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications by Channel (Donut)</CardTitle>
        </CardHeader>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={executive.notificationsByChannel}
                dataKey="value"
                nameKey="label"
                innerRadius={50}
                outerRadius={90}
              >
                {executive.notificationsByChannel.map((entry, index) => (
                  <Cell
                    key={`${entry.label}-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
