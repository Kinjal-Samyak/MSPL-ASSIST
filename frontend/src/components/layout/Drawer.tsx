import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: 'left' | 'right';
  width?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  side = 'right',
  width = 'w-96',
}: DrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      )}
      <div
        className={cn(
          'fixed bottom-0 top-0 z-[60] flex flex-col border-slate-200 bg-white shadow-2xl shadow-slate-950/20 transition-transform duration-300 dark:border-slate-700 dark:bg-slate-800',
          width,
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
          isOpen ? 'translate-x-0' : side === 'right' ? 'translate-x-full' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-700">
          {title && (
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          )}
          <button
            onClick={onClose}
            className="ml-auto rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </>
  );
}
