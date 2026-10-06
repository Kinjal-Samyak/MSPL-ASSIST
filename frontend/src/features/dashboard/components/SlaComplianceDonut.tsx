import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

interface SlaComplianceDonutProps {
  withinSla: number;
  breached: number;
  noSla: number;
  withinSlaPct: number;
}

const COLORS = { within: '#10b981', breached: '#ef4444', noSla: '#cbd5e1' };

function pct(count: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((count / total) * 100)}%`;
}

export function SlaComplianceDonut({
  withinSla,
  breached,
  noSla,
  withinSlaPct,
}: SlaComplianceDonutProps) {
  const total = withinSla + breached + noSla;
  const data =
    total === 0
      ? [{ name: 'No data', value: 1, color: COLORS.noSla }]
      : [
          { name: 'Within SLA', value: withinSla, color: COLORS.within },
          { name: 'Breached', value: breached, color: COLORS.breached },
          { name: 'No SLA', value: noSla, color: COLORS.noSla },
        ];

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={58}
              outerRadius={78}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} stroke="none" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-success dark:text-emerald-400">{withinSlaPct}%</p>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Within SLA</p>
        </div>
      </div>
      <ul className="w-full space-y-2 text-sm">
        <li className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.within }} />
            Within SLA
          </span>
          <span className="font-medium text-slate-900 dark:text-slate-50">
            {withinSla} ({pct(withinSla, total)})
          </span>
        </li>
        <li className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLORS.breached }}
            />
            Breached
          </span>
          <span className="font-medium text-slate-900 dark:text-slate-50">
            {breached} ({pct(breached, total)})
          </span>
        </li>
        <li className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.noSla }} />
            No SLA
          </span>
          <span className="font-medium text-slate-900 dark:text-slate-50">
            {noSla} ({pct(noSla, total)})
          </span>
        </li>
      </ul>
    </div>
  );
}
