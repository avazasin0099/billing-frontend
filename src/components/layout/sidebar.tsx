import React from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'POS Billing', href: '/billing', icon: ShoppingCart, highlight: true },
  { name: 'Invoices', href: '/invoices', icon: Receipt },
  { name: 'Items Catalog', href: '/items', icon: Package },
  { name: 'Inventory & Stock', href: '/inventory', icon: Boxes },
  { name: 'Purchases', href: '/purchases', icon: Truck },
  { name: 'Customers & Udhaar', href: '/customers', icon: Users },
  { name: 'Suppliers', href: '/suppliers', icon: Building2 },
  { name: 'Recorded Payments', href: '/payments', icon: CreditCard },
  { name: 'Sales Returns', href: '/returns', icon: RotateCcw },
  { name: 'Expenses & Cashbook', href: '/expenses', icon: Wallet },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'GST Reports (CA)', href: '/gst-reports', icon: FileSpreadsheet },
  { name: 'Staff & Roles', href: '/staff', icon: UserCog },
  { name: 'Settings & Printer', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { pathname } = useLocation();

  return (
    <aside className="w-64 bg-slate-900/90 backdrop-blur-md border-r border-slate-800 flex flex-col h-screen sticky top-0 shrink-0 select-none z-30">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-tight leading-none">Bill Pro</h1>
            <span className="text-[10px] text-indigo-400 font-medium uppercase tracking-wider">Retail POS & GST</span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group',
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60',
                item.highlight && !isActive && 'text-indigo-400 hover:text-indigo-300 font-semibold'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 transition-transform group-hover:scale-110',
                  isActive ? 'text-white' : item.highlight ? 'text-indigo-400' : 'text-slate-400'
                )}
              />
              <span>{item.name}</span>
              {item.highlight && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  FAST
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
        <span>V1.0 (Production)</span>
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Ready
        </span>
      </div>
    </aside>
  );
};
