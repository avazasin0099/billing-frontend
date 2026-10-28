import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Store,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '../ui/button';
import { SyncManager } from '@/offline/sync-manager';
import { api } from '@/services/api-client';
import { applyTheme, getStoredTheme, resolvesToDark, type Theme } from '@/lib/theme';

export const Topbar: React.FC = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('Owner');
  const [userRole, setUserRole] = useState<string>('OWNER');
  const [shopName, setShopName] = useState<string>('Main Branch - Dadar');
  const [theme, setTheme] = useState<Theme>(getStoredTheme());
  const isDark = resolvesToDark(theme);

  const toggleTheme = () => {
    const next: Theme = isDark ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      SyncManager.triggerSync(api);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync count check
    SyncManager.getPendingCount().then(setPendingSyncCount);

    const unsubscribe = SyncManager.subscribe((syncing, count) => {
      setIsSyncing(syncing);
      setPendingSyncCount(count);
    });

    // Load stored user info
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('billpro_user');
      const storedShop = localStorage.getItem('billpro_shop');
      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          setUserName(u.name || 'Staff');
          setUserRole(u.role || 'CASHIER');
        } catch {}
      }
      if (storedShop) {
        try {
          const s = JSON.parse(storedShop);
          setShopName(s.name || 'Main Branch');
        } catch {}
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await SyncManager.triggerSync(api);
    setIsSyncing(false);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('billpro_token');
      localStorage.removeItem('billpro_refresh_token');
      localStorage.removeItem('billpro_user');
    }
    navigate('/login');
  };

  return (
    <header className="h-16 bg-surface border-b border-border px-6 flex items-center justify-between shrink-0 z-20">
      {/* Current Active Shop Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-xl px-3 py-1.5 text-xs text-fg-muted">
          <Store className="w-3.5 h-3.5 text-brand" />
          <span className="font-semibold text-fg">{shopName}</span>
          <span className="text-fg-subtle">•</span>
          <span className="text-fg-subtle">GSTIN: 27AAPFU0939F1ZV</span>
        </div>
      </div>

      {/* Right Controls: Connectivity, Offline Queue & User Shift */}
      <div className="flex items-center gap-3">
        {/* Offline / Online Status Indicator */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <Wifi className="w-3.5 h-3.5" />
              <span>Online</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full animate-pulse">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline Mode</span>
            </span>
          )}

          {/* Pending Sync Queue Pill */}
          {pendingSyncCount > 0 && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing || !isOnline}
              className="flex items-center gap-1.5 text-xs bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 px-2.5 py-1 rounded-full transition-colors"
              title="Click to sync offline records"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{pendingSyncCount} Pending Sync</span>
            </button>
          )}
        </div>

        {/* Light / Dark Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle color theme"
          className="p-2 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="h-4 w-px bg-border"></div>

        {/* User Role & Logout */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-semibold text-fg leading-tight">{userName}</div>
            <div className="text-[10px] text-fg-subtle flex items-center justify-end gap-1 font-mono">
              <ShieldCheck className="w-3 h-3 text-brand" />
              <span>{userRole}</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-fg-subtle hover:text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg"
            title="Log out or switch cashier"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
