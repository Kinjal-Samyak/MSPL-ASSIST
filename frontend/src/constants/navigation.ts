import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '@mspl/shared-constants';
import { ROUTES } from './routes';
import {
  LayoutDashboard,
  Ticket,
  Users,
  Car,
  MapPin,
  Wrench,
  Package,
  Boxes,
  Bell,
  FileText,
  BarChart2,
  Settings,
  ClipboardList,
  PackageCheck,
  ShoppingCart,
  Undo2,
  Send,
} from 'lucide-react';
import { COORDINATOR_NAVIGATION_ITEMS } from '@/features/coordinator/coordinator.registration';
import { TECHNICIAN_NAVIGATION_ITEMS } from '@/features/technician/technician.registration';
import { SERVICE_TL_NAVIGATION_ITEMS } from '@/features/service-tl/service-tl.registration';

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  children?: NavigationItem[];
}

/** Service Manager (Amendment 1, Version 1.0) inherits every Administrator permission except
 * deleting a ticket - a distinction enforced inline where the Delete Ticket action itself renders
 * (`currentUserRole === 'ADMIN'`), not in this nav/route matrix. Everywhere else, wherever ADMIN
 * has access, SERVICE_MANAGER does too - so it's baked into this single ADMIN constant rather
 * than repeated on every group below. */
const ADMIN: UserRole[] = ['ADMIN', 'SERVICE_MANAGER'];
const ADMIN_AND_COORDINATOR: UserRole[] = ['ADMIN', 'SERVICE_MANAGER', 'COORDINATOR'];
const ADMIN_AND_TECHNICIAN: UserRole[] = ['ADMIN', 'SERVICE_MANAGER', 'TECHNICIAN'];
const ADMIN_AND_SERVICE_TL: UserRole[] = ['ADMIN', 'SERVICE_MANAGER', 'SERVICE_TL'];
const ALL_OPERATIONAL_USERS: UserRole[] = [
  'ADMIN',
  'SERVICE_MANAGER',
  'COORDINATOR',
  'TECHNICIAN',
  'SERVICE_TL',
];

/**
 * The single role matrix for navigation and client-side route protection.
 * Server-side middleware remains the authorization authority for APIs.
 */
export const ROUTE_ACCESS = {
  dashboard: ALL_OPERATIONAL_USERS,
  tickets: ADMIN_AND_COORDINATOR,
  customers: ADMIN_AND_COORDINATOR,
  vehicles: ADMIN_AND_COORDINATOR,
  deployments: ADMIN_AND_COORDINATOR,
  workshop: ADMIN_AND_COORDINATOR,
  inventory: ADMIN_AND_SERVICE_TL,
  notifications: ADMIN_AND_COORDINATOR,
  reports: ADMIN_AND_COORDINATOR,
  analytics: ADMIN,
  settings: ADMIN,
  coordinator: ADMIN_AND_COORDINATOR,
  technician: ADMIN_AND_TECHNICIAN,
  serviceTl: ADMIN_AND_SERVICE_TL,
} satisfies Record<string, UserRole[]>;

export function getNavigationItemsForRole(role?: UserRole): NavigationItem[] {
  return role
    ? NAVIGATION_ITEMS.filter((item) => item.roles.includes(role)).map((item) => ({
        ...item,
        children: item.children?.filter((child) => child.roles.includes(role)),
      }))
    : [];
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ROUTE_ACCESS.dashboard,
  },
  { id: 'tickets', label: 'Tickets', href: '/tickets', icon: Ticket, roles: ROUTE_ACCESS.tickets },
  {
    id: 'customers',
    label: 'Riders',
    href: '/customers',
    icon: Users,
    roles: ROUTE_ACCESS.customers,
  },
  { id: 'vehicles', label: 'Vehicles', href: '/vehicles', icon: Car, roles: ROUTE_ACCESS.vehicles },
  {
    id: 'deployments',
    label: 'Deployments',
    href: '/deployments',
    icon: MapPin,
    roles: ROUTE_ACCESS.deployments,
  },
  {
    id: 'workshop',
    label: 'Workshop',
    href: '/workshop',
    icon: Wrench,
    roles: ROUTE_ACCESS.workshop,
  },
  {
    id: 'inventory',
    label: 'Inventory',
    href: ROUTES.INVENTORY_DASHBOARD,
    icon: Boxes,
    roles: ROUTE_ACCESS.inventory,
    children: [
      {
        id: 'inventory-dashboard',
        label: 'Dashboard',
        href: ROUTES.INVENTORY_DASHBOARD,
        icon: LayoutDashboard,
        roles: ROUTE_ACCESS.inventory,
      },
      {
        id: 'inventory-parts-master',
        label: 'Spare Parts Master',
        href: ROUTES.PARTS,
        icon: Package,
        roles: ROUTE_ACCESS.inventory,
      },
      {
        id: 'inventory-central',
        label: 'Central Inventory',
        href: ROUTES.INVENTORY_CENTRAL,
        icon: PackageCheck,
        roles: ROUTE_ACCESS.inventory,
      },
      {
        id: 'inventory-part-requisitions',
        label: 'Part Requisitions',
        href: ROUTES.INVENTORY_PART_REQUISITIONS,
        icon: ClipboardList,
        roles: ROUTE_ACCESS.inventory,
      },
      {
        id: 'inventory-goods-issue',
        label: 'Goods Issue',
        href: ROUTES.INVENTORY_GOODS_ISSUE,
        icon: Send,
        roles: ROUTE_ACCESS.inventory,
      },
      {
        id: 'inventory-returns',
        label: 'Returns',
        href: ROUTES.INVENTORY_RETURNS,
        icon: Undo2,
        roles: ROUTE_ACCESS.inventory,
      },
      {
        id: 'inventory-procurement',
        label: 'Procurement',
        href: ROUTES.INVENTORY_PROCUREMENT_REQUESTS,
        icon: ShoppingCart,
        roles: ROUTE_ACCESS.inventory,
      },
      {
        id: 'inventory-purchase-orders',
        label: 'Purchase Orders',
        href: ROUTES.INVENTORY_PURCHASE_ORDERS,
        icon: FileText,
        roles: ROUTE_ACCESS.inventory,
      },
      {
        id: 'inventory-ledger',
        label: 'Inventory Ledger',
        href: ROUTES.PARTS_INVENTORY_LEDGER,
        icon: Boxes,
        roles: ROUTE_ACCESS.inventory,
      },
      {
        id: 'inventory-reports',
        label: 'Reports',
        href: ROUTES.REPORTS,
        icon: BarChart2,
        roles: ROUTE_ACCESS.inventory,
      },
    ],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    href: '/notifications',
    icon: Bell,
    roles: ROUTE_ACCESS.notifications,
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    icon: FileText,
    roles: ROUTE_ACCESS.reports,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/analytics',
    icon: BarChart2,
    roles: ROUTE_ACCESS.analytics,
  },
  {
    id: 'settings',
    label: 'Admin & Settings',
    href: '/settings',
    icon: Settings,
    roles: ROUTE_ACCESS.settings,
  },
  ...COORDINATOR_NAVIGATION_ITEMS.map((item) => ({ ...item, roles: ROUTE_ACCESS.coordinator })),
  ...TECHNICIAN_NAVIGATION_ITEMS.map((item) => ({
    ...item,
    roles: ROUTE_ACCESS.technician,
    children: item.children?.map((child) => ({ ...child, roles: ROUTE_ACCESS.technician })),
  })),
  ...SERVICE_TL_NAVIGATION_ITEMS.map((item) => ({
    ...item,
    roles: ROUTE_ACCESS.serviceTl,
    children: item.children?.map((child) => ({ ...child, roles: ROUTE_ACCESS.serviceTl })),
  })),
];
