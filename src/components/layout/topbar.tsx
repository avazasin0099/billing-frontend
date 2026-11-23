import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WifiOff, RefreshCw, LogOut, Store, Sun, Moon, Menu, ChevronDown, CloudUpload, UserRound } from 'lucide-react';
import { SyncManager } from '@/offline/sync-manager';
import { api } from '@/services/api-client';
import { applyTheme, getStoredTheme, resolvesToDark, type Theme } from '@/lib/theme';
import { useSession } from '@/lib/session';
import { useOnlineStatus } from '@/lib/use-online';
import { cn } from '@/lib/utils';
import { IconButton } from '../ui/button';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { toast } from '../ui/toast';

const ROLE_LABEL: Record<string, string> = { OWNER: 'Owner', MANAGER: 'Manager', CASHIER: 'Cashier' };

export const Topbar: React.FC<{ onOpenMenu?: () => void }> = ({ onOpenMenu }) => {
  const navigate = useNavigate();
  const { user, shop } = useSession();
  const isOnline = useOnlineStatus();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [theme, setTheme] = useState<Theme>(getStoredTheme());
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutPrompt, setLogoutPrompt] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDark = resolvesToDark(theme);

  useEffect(() => {
    const handleOnline = () => SyncManager.triggerSync(api);
    window.addEventListener('online', handleOnline);

    // Initial count, then push any bills queued earlier for this shop.
    SyncManager.getPendingCount().then((count) => {
      setPendingSyncCount(count);
      if (count > 0 && navigator.onLine) SyncManager.triggerSync(api);
    });

    const unsubscribe = SyncManager.subscribe((syncing, count) => {
      setIsSyncing(syncing);
      setPendingSyncCount(count);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      unsubscribe();
    };
  }, []);

  // Close the user menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const toggleTheme = () => {
    const next: Theme = isDark ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    const { synced, failed } = await SyncManager.triggerSync(api, { manual: true });
    setIsSyncing(false);
    if (failed > 0) {
      toast.error(`${failed} offline bill(s) were rejected`, 'They are still saved on this device. Ask a manager to review them.');
    } else if (synced > 0) {
      toast.success(`${synced} offline bill(s) synced`);
    }
  };

  const doLogout = () => {
    // Revoke the refresh token server-side (best effort) so a copied token can't be reused.
    const refreshToken = localStorage.getItem('billpro_refresh_token');
    if (refreshToken) api.post('/auth/logout', { refreshToken }).catch(() => {});

    localStorage.removeItem('billpro_token');
    localStorage.removeItem('billpro_refresh_token');
    localStorage.removeItem('billpro_user');
    // billpro_shop_id / billpro_shop are kept: this device is the shop's counter and
    // Counter-PIN login needs to know which shop it belongs to.
    navigate('/login');
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    if (navigator.onLine) await SyncManager.triggerSync(api).catch(() => {});
    const unsynced = await SyncManager.getTotalPendingCount();
    if (unsynced > 0) setLogoutPrompt(unsynced);
    else doLogout();
  };

  const initials = (user?.name || 'U')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <IconButton label="Open menu" className="lg:hidden" onClick={onOpenMenu}>
          <Menu />
        </IconButton>
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Store className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
          <span className="truncate font-medium text-fg">{shop?.name || 'Shop'}</span>
          {shop?.gstin && (
            <span className="hidden truncate text-fg-subtle md:inline">
              · GSTIN <span className="font-mono">{shop.gstin}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isOnline && (
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-warning/30 bg-warning-soft px-3 text-xs font-medium text-warning">
            <WifiOff className="size-3.5" aria-hidden="true" />
            Offline
          </span>
        )}

        {pendingSyncCount > 0 && (
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing || !isOnline}
            title={isOnline ? 'Send offline bills to the server now' : 'Will sync when back online'}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-accent/30 bg-primary-soft px-3 text-xs font-medium text-accent transition-colors hover:bg-primary-soft/70 disabled:opacity-60"
          >
            {isSyncing ? (
              <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <CloudUpload className="size-3.5" aria-hidden="true" />
            )}
            {pendingSyncCount} pending sync
          </button>
        )}

        <IconButton label={isDark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme}>
          {isDark ? <Sun /> : <Moon />}
        </IconButton>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex h-10 items-center gap-2 rounded-control px-1.5 transition-colors hover:bg-surface-2"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-highlight text-xs font-semibold text-highlight-fg">
              {initials}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block max-w-[10rem] truncate text-sm font-medium text-fg">{user?.name || 'User'}</span>
              <span className="block text-xs text-fg-subtle">{ROLE_LABEL[user?.role || ''] || user?.role}</span>
            </span>
            <ChevronDown className={cn('size-4 text-fg-subtle transition-transform', menuOpen && 'rotate-180')} aria-hidden="true" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-card border border-border bg-surface py-1 shadow-lg"
            >
              <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                <UserRound className="size-4 text-fg-subtle" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{user?.name}</p>
                  <p className="truncate text-xs text-fg-subtle">{user?.email || user?.phone}</p>
                </div>
              </div>
              <button
                role="menuitem"
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-fg hover:bg-surface-2"
              >
                <LogOut className="size-4 text-fg-subtle" aria-hidden="true" />
                Log out / switch cashier
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={logoutPrompt !== null}
        onClose={() => setLogoutPrompt(null)}
        onConfirm={() => {
          setLogoutPrompt(null);
          doLogout();
        }}
        tone="primary"
        title="Unsynced bills on this device"
        confirmLabel="Log out anyway"
        message={
          <>
            <strong className="text-fg">{logoutPrompt} offline bill(s)</strong> haven't reached the server yet. They
            stay saved on this device and sync automatically on the next login to this shop.
          </>
        }
      />
    </header>
  );
};
