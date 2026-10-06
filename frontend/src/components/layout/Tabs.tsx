import React, { useState } from 'react';
import { cn } from '@/utils';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
}

export function Tabs({ tabs, defaultTab, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id ?? '');
  const active = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex border-b border-border dark:border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            disabled={tab.disabled}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'mb-[-1px] flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50',
              activeTab === tab.id
                ? 'border-primary text-primary dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{active?.content}</div>
    </div>
  );
}
