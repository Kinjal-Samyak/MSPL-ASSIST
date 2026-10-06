import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils';
import { THEME_COLORS } from '@/themes/tokens';

export type StatCardTone =
  'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate' | 'cyan' | 'indigo';

const TONE_HEX: Record<StatCardTone, string> = {
  blue: THEME_COLORS.primary,
  emerald: THEME_COLORS.success,
  amber: THEME_COLORS.warning,
  rose: THEME_COLORS.danger,
  violet: '#8b5cf6',
  slate: THEME_COLORS.textSecondary,
  cyan: THEME_COLORS.info,
  indigo: '#6366f1',
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: StatCardTone;
  sublabel?: string;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'blue',
  sublabel,
  onClick,
  className,
}: StatCardProps) {
  const accentColor = TONE_HEX[tone];

  // Clean enterprise KPI widget: white card, a thin coloured accent bar, a large number and a
  // small subtitle - no heavy chrome.
  const content = (
    <div
      className={cn(
        'mspl-surface relative overflow-hidden rounded-xl border border-border pl-4 pr-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:border-slate-800',
        className
      )}
    >
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: accentColor }}
        aria-hidden="true"
      />
      <div className="flex items-center gap-2.5">
        <span
          className="rounded-lg p-1.5"
          style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">
        {value}
      </p>
      {sublabel && (
        <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">{sublabel}</p>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}
