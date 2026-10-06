import type React from 'react';

interface DashboardGridProps {
  kpiCards: React.ReactNode;
  chartCards: React.ReactNode;
  sidePanel: React.ReactNode;
}

export function DashboardGrid({ kpiCards, chartCards, sidePanel }: DashboardGridProps) {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {kpiCards}
      </section>
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="grid grid-cols-1 gap-6 xl:col-span-2 2xl:grid-cols-2">{chartCards}</div>
        <div className="space-y-6">{sidePanel}</div>
      </section>
    </div>
  );
}
