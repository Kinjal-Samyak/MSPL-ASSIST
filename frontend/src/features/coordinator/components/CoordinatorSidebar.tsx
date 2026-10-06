import { NavLink } from 'react-router-dom';
import { cn } from '@/utils';
import { COORDINATOR_SECTION_ITEMS } from './CoordinatorNavigation';

export function CoordinatorSidebar() {
  return (
    <aside className="w-full shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:w-56">
      <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        Coordinator
      </p>
      <nav aria-label="Coordinator navigation" className="flex gap-1 overflow-x-auto md:flex-col">
        {COORDINATOR_SECTION_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.href}
              end={item.href === '/coordinator'}
              className={({ isActive }) =>
                cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 hover:bg-primary/10 hover:text-primary'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
