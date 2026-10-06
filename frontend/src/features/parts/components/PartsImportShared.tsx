import { AlertTriangle, BarChart3, CheckCircle2, Info, XCircle } from 'lucide-react';
import { Card, StatCard, type StatCardTone } from '@/components/ui';

const METRIC_TONE_META: Record<
  'default' | 'success' | 'warning' | 'danger' | 'info',
  { icon: typeof BarChart3; tone: StatCardTone }
> = {
  default: { icon: BarChart3, tone: 'slate' },
  success: { icon: CheckCircle2, tone: 'emerald' },
  warning: { icon: AlertTriangle, tone: 'amber' },
  danger: { icon: XCircle, tone: 'rose' },
  info: { icon: Info, tone: 'blue' },
};

export function Metric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const meta = METRIC_TONE_META[tone];
  return <StatCard label={label} value={value} icon={meta.icon} tone={meta.tone} />;
}

export function IssuesCard({
  title,
  description = 'Each row is reported independently, so valid rows can still be imported.',
  issues,
  tone = 'danger',
}: {
  title: string;
  description?: string;
  issues: Array<{ rowNumber: number; column?: string; reason: string }>;
  tone?: 'danger' | 'info';
}) {
  const headerClass = tone === 'danger' ? 'border-red-100 bg-red-50' : 'border-blue-100 bg-blue-50';
  const titleClass = tone === 'danger' ? 'text-red-950' : 'text-blue-950';
  const descriptionClass = tone === 'danger' ? 'text-danger' : 'text-primary';
  return (
    <Card padding="none">
      <div className={`border-b px-5 py-4 ${headerClass}`}>
        <h2 className={`font-semibold ${titleClass}`}>{title}</h2>
        <p className={`mt-1 text-sm ${descriptionClass}`}>{description}</p>
      </div>
      <div className="max-h-72 overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Excel row</th>
              <th className="px-4 py-3">Column</th>
              <th className="px-4 py-3">Message</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue, index) => (
              <tr
                key={`${issue.rowNumber}-${issue.column ?? 'workbook'}-${index}`}
                className="border-t border-slate-200 text-slate-900"
              >
                <td className="px-4 py-3">{issue.rowNumber || 'Workbook'}</td>
                <td className="px-4 py-3">{issue.column ?? 'General'}</td>
                <td className="px-4 py-3">{issue.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
