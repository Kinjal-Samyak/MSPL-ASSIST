import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Tooltip } from '@/components/ui';
import { getNavigationItemsForRole, type NavigationItem } from '@/constants';
import { useAuthStore, useSettingsStore } from '@/store';
import { SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED } from '@/themes/tokens';
import { cn } from '@/utils';

interface SidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

/** Sentinel parent key for top-level nav items, which have no real parent id. */
const ROOT_KEY = '__root__';

/** Accordion state: for each parent id (ROOT_KEY for top-level), at most one child id is expanded
 * at a time - opening a sibling collapses whichever one was open, matching enterprise nav
 * conventions (AWS/Azure console sidebars) and keeping the list from growing unbounded. */
type ExpandedByParent = Record<string, string | undefined>;

function isItemActiveFor(pathname: string) {
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** True if this item or any descendant (at any depth) matches the current path - used to
 * auto-expand a collapsed ancestor (e.g. Inventory > Procurement) when a grandchild route is active. */
function containsActiveDescendant(
  item: NavigationItem,
  isActive: (href: string) => boolean
): boolean {
  return Boolean(
    item.children?.some(
      (child) => isActive(child.href) || containsActiveDescendant(child, isActive)
    )
  );
}

/** Walks the tree once to find the chain of section ids that should start expanded so the active
 * route is visible - e.g. ["inventory", "procurement"] when on a Purchase Orders page. Used only
 * to seed accordion state when the route changes; manual toggling afterward is authoritative, so
 * collapsing a module that contains the active route actually sticks instead of snapping back open. */
function findExpandedPath(items: NavigationItem[], isActive: (href: string) => boolean): string[] {
  for (const item of items) {
    const hasChildren = Boolean(item.children?.length);
    if (isActive(item.href)) {
      return hasChildren ? [item.id] : [];
    }
    if (hasChildren && containsActiveDescendant(item, isActive)) {
      return [item.id, ...findExpandedPath(item.children ?? [], isActive)];
    }
  }
  return [];
}

interface NavItemRowProps {
  item: NavigationItem;
  depth: number;
  parentId: string;
  isActive: (href: string) => boolean;
  expandedByParent: ExpandedByParent;
  toggleSection: (parentId: string, itemId: string) => void;
  collapsed: boolean;
  mobile: boolean;
  onNavigate?: () => void;
}

/** Renders one nav item at any depth, recursing into its own children - this is what makes the
 * Inventory > Procurement > {Requests, POs, GRN, Suppliers} three-level group possible; the
 * sidebar previously only rendered exactly two levels. */
function NavItemRow({
  item,
  depth,
  parentId,
  isActive,
  expandedByParent,
  toggleSection,
  collapsed,
  mobile,
  onNavigate,
}: NavItemRowProps) {
  const navigate = useNavigate();
  const active = isActive(item.href);
  const Icon = item.icon;
  const hasChildren = Boolean(item.children?.length);
  const expanded = expandedByParent[parentId] === item.id;
  const isTopLevel = depth === 0;

  const itemClassName = cn(
    'flex w-full items-center rounded-lg text-left font-medium leading-6 transition-colors duration-150',
    isTopLevel ? 'gap-3 px-2.5 py-2 text-[15px]' : 'gap-2 px-2.5 py-1.5 text-[13px]',
    active
      ? isTopLevel
        ? 'bg-primary text-white'
        : 'bg-primary/80 text-white'
      : 'text-slate-400 hover:bg-sidebar-hover hover:text-white'
  );
  const iconClassName = cn('shrink-0', isTopLevel ? 'h-5 w-5' : 'h-4 w-4');

  const content = hasChildren ? (
    <button
      type="button"
      onClick={() => {
        toggleSection(parentId, item.id);
        if (isTopLevel) navigate(item.href);
        onNavigate?.();
      }}
      className={itemClassName}
      aria-expanded={expanded}
      aria-controls={`${item.id}-submenu`}
    >
      <Icon className={iconClassName} />
      {(!collapsed || mobile) && (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
        </>
      )}
    </button>
  ) : (
    <Link to={item.href} onClick={onNavigate} className={itemClassName}>
      <Icon className={iconClassName} />
      {(!collapsed || mobile) && <span className="truncate">{item.label}</span>}
    </Link>
  );

  return (
    <li>
      {isTopLevel && !mobile && collapsed ? (
        <Tooltip content={item.label} side="right">
          {content}
        </Tooltip>
      ) : (
        content
      )}
      {hasChildren && expanded && (!collapsed || mobile) && (
        <ul
          id={`${item.id}-submenu`}
          className="mt-1 space-y-0.5 border-l border-slate-700/80 pl-3"
        >
          {item.children?.map((child) => (
            <NavItemRow
              key={child.id}
              item={child}
              depth={depth + 1}
              parentId={item.id}
              isActive={isActive}
              expandedByParent={expandedByParent}
              toggleSection={toggleSection}
              collapsed={collapsed}
              mobile={mobile}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function Sidebar({ mobile = false, onNavigate }: SidebarProps) {
  const { pathname } = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useSettingsStore();
  const role = useAuthStore((state) => state.user?.role);
  const navigationItems = getNavigationItemsForRole(role);
  const [expandedByParent, setExpandedByParent] = useState<ExpandedByParent>({});
  const width = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  const isItemActive = isItemActiveFor(pathname);

  // Seed the accordion to reveal the active route whenever the route changes. Deliberately not
  // OR'd into `expanded` on every render (the previous approach) - that made manually collapsing
  // a module containing the active route immediately snap back open on the same render.
  useEffect(() => {
    const path = findExpandedPath(navigationItems, isItemActive);
    const next: ExpandedByParent = {};
    let currentParent = ROOT_KEY;
    for (const id of path) {
      next[currentParent] = id;
      currentParent = id;
    }
    setExpandedByParent(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- navigationItems/isItemActive are recomputed each render from role/pathname; re-seed only when pathname (or role) actually changes.
  }, [pathname, role]);

  const toggleSection = (parentId: string, itemId: string) => {
    setExpandedByParent((current) => {
      const next = { ...current };
      if (next[parentId] === itemId) {
        delete next[parentId];
      } else {
        next[parentId] = itemId;
      }
      return next;
    });
  };

  return (
    <aside
      style={!mobile ? { width } : undefined}
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-slate-800 bg-sidebar transition-[width] duration-200',
        mobile && 'w-72'
      )}
    >
      <div className="flex h-[60px] shrink-0 items-center gap-3 border-b border-slate-800/80 px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-300 to-amber-500 shadow-lg shadow-amber-950/30">
          <span className="text-xs font-bold text-slate-950">MA</span>
        </div>
        {(!sidebarCollapsed || mobile) && (
          <span className="truncate text-[15px] font-semibold leading-6 text-white">
            MSPL Assist
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-x-hidden overflow-y-auto py-4">
        <ul className="space-y-0.5 px-2">
          {navigationItems.map((item) => (
            <NavItemRow
              key={item.id}
              item={item}
              depth={0}
              parentId={ROOT_KEY}
              isActive={isItemActive}
              expandedByParent={expandedByParent}
              toggleSection={toggleSection}
              collapsed={sidebarCollapsed}
              mobile={mobile}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </nav>

      {!mobile && (
        <div className="shrink-0 border-t border-slate-800/80 p-3">
          <button
            onClick={toggleSidebar}
            className="flex w-full items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
