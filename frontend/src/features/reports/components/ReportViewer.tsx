import { Button } from '@/components/ui';
import type { ReportTabKey } from '@/services/reportService';
import type { ReportTabOption } from '../types/report.types';

interface ReportViewerProps {
  activeTab: ReportTabKey;
  tabs: ReportTabOption[];
  onTabChange: (tab: ReportTabKey) => void;
}

export function ReportViewer({ activeTab, tabs, onTabChange }: ReportViewerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Button
          key={tab.key}
          size="sm"
          variant={activeTab === tab.key ? 'primary' : 'outline'}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
