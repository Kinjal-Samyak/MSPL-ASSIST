import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/utils';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
  className?: string;
}

const MENU_WIDTH = 208;

export function ContextMenu({ items, children, className }: ContextMenuProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return undefined;

    function close() {
      setPosition(null);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) close();
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', close, true);
    };
  }, [position]);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    const x = Math.min(event.clientX, window.innerWidth - MENU_WIDTH - 8);
    const y = Math.min(event.clientY, window.innerHeight - items.length * 36 - 16);
    setPosition({ x: Math.max(8, x), y: Math.max(8, y) });
  };

  return (
    <div onContextMenu={handleContextMenu} className={className}>
      {children}
      {position && (
        <div
          ref={menuRef}
          role="menu"
          style={{ position: 'fixed', top: position.y, left: position.x, width: MENU_WIDTH }}
          className="z-[70] rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {items.map((item) => (
            <React.Fragment key={item.id}>
              {item.divider && (
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              )}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    setPosition(null);
                  }
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-150 motion-reduce:transition-none',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  item.danger
                    ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                )}
              >
                {item.icon && <span className="h-4 w-4">{item.icon}</span>}
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
