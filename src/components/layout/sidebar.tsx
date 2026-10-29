import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
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
  Store,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = { name: string; href: string; icon: React.ElementType; highlight?: boolean };
type NavGroup = { id: string; label: string; items: NavItem[] };

// Primary actions pinned to the top (no group).
const pinnedItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'POS Billing', href: '/billing', icon: ShoppingCart, highlight: true },
];

// Everything else, organized into collapsible sections.
const navGroups: NavGroup[] = [
  {
    id: 'sales',
    label: 'Sales',
    items: [
      { name: 'Invoices', href: '/invoices', icon: Receipt },
      { name: 'Sales Returns', href: '/returns', icon: RotateCcw },
      { name: 'Recorded Payments', href: '/payments', icon: CreditCard },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    items: [
      { name: 'Items Catalog', href: '/items', icon: Package },
      { name: 'Inventory & Stock', href: '/inventory', icon: Boxes },
      { name: 'Purchases', href: '/purchases', icon: Truck },
    ],
  },
  {
    id: 'parties',
    label: 'Parties',
    items: [
      { name: 'Customers & Udhaar', href: '/customers', icon: Users },
      { name: 'Suppliers', href: '/suppliers', icon: Building2 },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { name: 'Expenses & Cashbook', href: '/expenses', icon: Wallet },
      { name: 'Reports', href: '/reports', icon: BarChart3 },
      { name: 'GST Reports (CA)', href: '/gst-reports', icon: FileSpreadsheet },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    items: [
      { name: 'Staff & Roles', href: '/staff', icon: UserCog },
      { name: 'Settings & Printer', href: '/settings', icon: Settings },
    ],
  },
];

// Flat list kept for any external reference / search.
export const navigationItems: NavItem[] = [...pinnedItems, ...navGroups.flatMap((g) => g.items)];

const STORAGE_KEY = 'billpro_nav_groups';

const isHrefActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

const NavLink: React.FC<{ item: NavItem; active: boolean; indented?: boolean }> = ({
  item,
  active,
  indented,
}) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      className={cn(
        'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group',
        indented && 'ml-1',
        active
          ? 'bg-brand/10 text-brand font-semibold'
          : 'text-fg-subtle hover:text-fg hover:bg-surface-2',
        item.highlight && !active && 'text-brand hover:text-brand font-semibold'
      )}
    >
      <Icon
        className={cn(
          'w-4 h-4 transition-transform group-hover:scale-110',
          active ? 'text-brand' : item.highlight ? 'text-brand' : 'text-fg-subtle'
        )}
      />
      <span>{item.name}</span>
      {item.highlight && (
        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand/10 text-brand border border-brand/30">
          FAST
        </span>
      )}
    </Link>
  );
};

export const Sidebar: React.FC = () => {
  const { pathname } = useLocation();

  const groupIsActive = (group: NavGroup) => group.items.some((i) => isHrefActive(pathname, i.href));

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    navGroups.forEach((g) => (defaults[g.id] = true)); // all open on first run
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...defaults, ...JSON.parse(stored) };
    } catch {
      /* ignore */
    }
    return defaults;
  });

  // Always reveal the group that contains the current page.
  useEffect(() => {
    const active = navGroups.find(groupIsActive);
    if (active && !openGroups[active.id]) {
      setOpenGroups((prev) => ({ ...prev, [active.id]: true }));
    }
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
    <aside className="w-64 bg-surface border-r border-border flex flex-col h-full shrink-0 select-none z-30">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-border flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-fg text-base tracking-tight leading-none">Bill Pro</h1>
            <span className="text-[10px] text-brand font-medium uppercase tracking-wider">Retail POS & GST</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {/* Pinned primary actions */}
        <div className="space-y-1">
          {pinnedItems.map((item) => (
            <NavLink key={item.href} item={item} active={isHrefActive(pathname, item.href)} />
          ))}
        </div>

        {/* Collapsible groups */}
        {navGroups.map((group) => {
          const isOpen = !!openGroups[group.id];
          const hasActive = groupIsActive(group);
          return (
            <div key={group.id} className="mt-4">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors"
              >
                <span>{group.label}</span>
                {/* Show a brand dot if the active page lives in a collapsed group */}
                {!isOpen && hasActive && <span className="w-1.5 h-1.5 rounded-full bg-brand" />}
                <ChevronDown
                  className={cn(
                    'w-3.5 h-3.5 ml-auto transition-transform',
                    isOpen ? 'rotate-0' : '-rotate-90'
                  )}
                />
              </button>

              {isOpen && (
                <div className="mt-1 space-y-1">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={isHrefActive(pathname, item.href)}
                      indented
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-border text-xs text-fg-subtle flex items-center justify-between">
        <span>V1.0 (Production)</span>
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Ready
        </span>
      </div>
    </aside>
  );
};
