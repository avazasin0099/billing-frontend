import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isClient, setIsClient] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!localStorage.getItem('billpro_token')) navigate('/login');
  }, [navigate]);

  // Close the mobile drawer on navigation.
  useEffect(() => setMenuOpen(false), [pathname]);

  if (!isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas" role="status" aria-label="Loading">
        <Loader2 className="size-6 animate-spin text-accent" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-canvas font-sans text-fg antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-control focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-fg"
      >
        Skip to content
      </a>
      <Sidebar mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex h-screen min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 focus:outline-none sm:p-6">
          <div className="mx-auto h-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
};
