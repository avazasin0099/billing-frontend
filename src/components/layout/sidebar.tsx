import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ReceiptIndianRupee as Receipt,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Users,
  Building2,
  CreditCard,
  RotateCcw,
  Wallet,
  BarChart3,
  FileSpreadsheet,
  UserCog,
  Settings,
  ChevronDown,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hasRole, MANAGER_ROLES, useSession } from '@/lib/session';
import { useOnlineStatus } from '@/lib/use-online';
import type { UserRole } from '@/types';
import { IconButton } from '../ui/button';

type NavItem = { name: string; href: string; icon: React.ElementType; roles?: UserRole[] };
type NavGroup = { id: string; label: string; items: NavItem[] };

// `roles` = who may open the page (mirrors the API's authorize() rules). Omitted = everyone.
const pinnedItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'POS Billing', href: '/billing', icon: ShoppingCart },
];

const navGroups: NavGroup[] = [
  {
    id: 'sales',
    label: 'Sales',
    items: [
      { name: 'Invoices', href: '/invoices', icon: Receipt },
      { name: 'Sales returns', href: '/returns', icon: RotateCcw, roles: MANAGER_ROLES },
      { name: 'Payments', href: '/payments', icon: CreditCard },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    items: [
      { name: 'Items', href: '/items', icon: Package },
      { name: 'Stock', href: '/inventory', icon: Boxes },
      { name: 'Purchases', href: '/purchases', icon: Truck, roles: MANAGER_ROLES },
    ],
  },
  {
    id: 'parties',
    label: 'Parties',
    items: [
      { name: 'Customers', href: '/customers', icon: Users },
      { name: 'Suppliers', href: '/suppliers', icon: Building2 },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { name: 'Expenses & cash book', href: '/expenses', icon: Wallet, roles: MANAGER_ROLES },
      { name: 'Reports', href: '/reports', icon: BarChart3, roles: MANAGER_ROLES },
      { name: 'GST reports', href: '/gst-reports', icon: FileSpreadsheet, roles: MANAGER_ROLES },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    items: [
      { name: 'Staff & roles', href: '/staff', icon: UserCog, roles: MANAGER_ROLES },
      { name: 'Settings', href: '/settings', icon: Settings, roles: MANAGER_ROLES },
    ],
  },
];

export const navigationItems: NavItem[] = [...pinnedItems, ...navGroups.flatMap((g) => g.items)];

const STORAGE_KEY = 'billpro_nav_groups';
const isHrefActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

const NavLink: React.FC<{ item: NavItem; active: boolean; onNavigate?: () => void }> = ({ item, active, onNavigate }) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex h-9 items-center gap-3 rounded-control px-3 text-sm transition-colors',
        active ? 'bg-primary-soft font-medium text-accent' : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
      )}
    >
      {active && <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-primary dark:bg-highlight" aria-hidden="true" />}
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      <span className="truncate">{item.name}</span>
    </Link>
  );
};

/** Flat product mark — a solid primary square with a standard icon (no gradient / glow). */
export const BrandMark: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => (
  <span
    className={cn(
      'flex shrink-0 items-center justify-center rounded-card bg-primary text-highlight',
      size === 'md' ? 'size-9' : 'size-8'
    )}
    aria-hidden="true"
  >
    <Receipt className={size === 'md' ? 'size-5' : 'size-4'} />
  </span>
);

export const Sidebar: React.FC<{ mobileOpen?: boolean; onClose?: () => void }> = ({ mobileOpen = false, onClose }) => {
  const { pathname } = useLocation();
  const { role } = useSession();
  const online = useOnlineStatus();

  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => hasRole(role, i.roles)) }))
    .filter((g) => g.items.length > 0);

  const groupIsActive = (group: NavGroup) => group.items.some((i) => isHrefActive(pathname, i.href));

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    navGroups.forEach((g) => (defaults[g.id] = true));
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...defaults, ...JSON.parse(stored) };
    } catch {
      /* ignore */
    }
    return defaults;
  });

  useEffect(() => {
    const active = navGroups.find(groupIsActive);
    if (active && !openGroups[active.id]) setOpenGroups((prev) => ({ ...prev, [active.id]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && <div className="fixed inset-0 z-30 bg-fg/40 lg:hidden" aria-hidden="true" onClick={onClose} />}

      <aside
        aria-label="Main navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-border bg-surface transition-transform duration-200 lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center justify-between gap-3 border-b border-border px-4">
          <Link to="/dashboard" className="flex items-center gap-2.5 rounded-control" onClick={onClose}>
            <BrandMark />
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-fg">Bill Pro</span>
              <span className="block text-xs text-fg-subtle">Billing, stock &amp; GST</span>
            </span>
          </Link>
          <IconButton label="Close menu" size="sm" className="lg:hidden" onClick={onClose}>
            <X />
          </IconButton>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-0.5">
            {pinnedItems.map((item) => (
              <NavLink key={item.href} item={item} active={isHrefActive(pathname, item.href)} onNavigate={onClose} />
            ))}
          </div>

          {visibleGroups.map((group) => {
            const isOpen = !!openGroups[group.id];
            const hasActive = groupIsActive(group);
            return (
              <div key={group.id} className="mt-4">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-2 rounded-control px-3 py-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle hover:text-fg"
                >
                  <span>{group.label}</span>
                  {!isOpen && hasActive && <span className="size-1.5 rounded-full bg-primary" aria-label="contains current page" />}
                  <ChevronDown
                    className={cn('ml-auto size-4 transition-transform', isOpen ? 'rotate-0' : '-rotate-90')}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <div className="mt-1 space-y-0.5">
                    {group.items.map((item) => (
                      <NavLink key={item.href} item={item} active={isHrefActive(pathname, item.href)} onNavigate={onClose} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Real connection state (previously a hard-coded "Ready" indicator) */}
        <div className="flex items-center gap-2 border-t border-border px-4 py-3 text-xs">
          {online ? (
            <>
              <Wifi className="size-4 text-success" aria-hidden="true" />
              <span className="text-fg-muted">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="size-4 text-warning" aria-hidden="true" />
              <span className="text-fg-muted">Offline — bills are saved on this device</span>
            </>
          )}
        </div>
      </aside>
    </>
  );
};
