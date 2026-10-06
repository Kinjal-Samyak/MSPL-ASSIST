import type { LucideIcon } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface KpiSparkCardProps {
  title: string;
  value: string;
  deltaVsYesterdayPct: number | null;
  sparkline: number[];
  icon: LucideIcon;
  accentColor: string;
}

function formatDelta(deltaVsYesterdayPct: number | null): string {
  if (deltaVsYesterdayPct === null) return 'New today';
  if (deltaVsYesterdayPct === 0) return '— 0% vs yesterday';
  const sign = deltaVsYesterdayPct > 0 ? '↑' : '↓';
  return `${sign} ${Math.abs(deltaVsYesterdayPct)}% vs yesterday`;
}

export function KpiSparkCard({
  title,
  value,
  deltaVsYesterdayPct,
  sparkline,
  icon: Icon,
  accentColor,
}: KpiSparkCardProps) {
  const sparklineData = sparkline.map((count, index) => ({ index, count }));
  const deltaTone =
    deltaVsYesterdayPct === null || deltaVsYesterdayPct === 0
      ? 'text-slate-400'
      : deltaVsYesterdayPct > 0
        ? 'text-success'
        : 'text-danger';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-slate-950/40 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-center gap-2.5">
        <span
          className="rounded-lg p-2"
          style={{ backgroundColor: `${accentColor}26`, color: accentColor }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-sm font-medium text-slate-300">{title}</p>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-white">{value}</p>
      <p className={`mt-1 text-xs font-medium ${deltaTone}`}>{formatDelta(deltaVsYesterdayPct)}</p>
      <div className="mt-3 h-10 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparklineData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient
                id={`spark-${title.replace(/\s+/g, '-')}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={accentColor} stopOpacity={0.5} />
                <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="count"
              stroke={accentColor}
              strokeWidth={2}
              fill={`url(#spark-${title.replace(/\s+/g, '-')})`}
              dot={{ r: 2.5, fill: accentColor, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
