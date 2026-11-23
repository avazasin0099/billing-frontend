import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, Mail, Lock, ArrowRight, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/card';
import { Tabs } from '@/components/ui/page';
import { BrandMark } from '@/components/layout/sidebar';
import { api } from '@/services/api-client';

type LoginMode = 'password' | 'pin';

export default function LoginPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<LoginMode>('password');
  // Never pre-fill credentials (the demo quick-fill below exists only in dev builds).
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const storeSession = (data: any) => {
    localStorage.setItem('billpro_token', data.tokens.accessToken);
    localStorage.setItem('billpro_refresh_token', data.tokens.refreshToken);
    localStorage.setItem('billpro_user', JSON.stringify(data.user));
    localStorage.setItem('billpro_shop', JSON.stringify(data.shop));
    localStorage.setItem('billpro_shop_id', data.shop.id);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await api.post('/auth/login', { identifier, password });
      if (data.tokens?.accessToken) {
        storeSession(data);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setErrorMessage('Enter your 4–6 digit counter PIN.');
      return;
    }
    const shopId = localStorage.getItem('billpro_shop_id');
    if (!shopId) {
      setErrorMessage('Sign in with your email or mobile and password once on this device before using a counter PIN.');
      return;
    }
    setErrorMessage('');
    setIsLoading(true);
    try {
      const data = await api.post('/auth/pin-login', { pin, shopId });
      if (data.tokens?.accessToken) {
        storeSession(data);
        navigate('/billing'); // Cashiers go straight to the POS.
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid PIN');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (role: 'owner' | 'manager' | 'cashier') => {
    const demo = {
      owner: ['admin@billpro.local', 'Admin@1234', '1234'],
      manager: ['manager@billpro.local', 'Manager@1234', '2345'],
      cashier: ['cashier@billpro.local', 'Cashier@1234', '3456'],
    }[role];
    setIdentifier(demo[0]);
    setPassword(demo[1]);
    setPin(demo[2]);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <main className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark />
          <h1 className="mt-3 text-xl font-semibold text-fg">Sign in to Bill Pro</h1>
          <p className="mt-1 text-sm text-fg-muted">Billing, stock and GST for your shop</p>
        </div>

        <div className="rounded-card border border-border bg-surface p-6 shadow-sm">
          <Tabs<LoginMode>
            label="Sign-in method"
            fullWidth
            value={activeTab}
            onChange={(v) => {
              setActiveTab(v);
              setErrorMessage('');
            }}
            items={[
              { value: 'password', label: 'Password', icon: Lock },
              { value: 'pin', label: 'Counter PIN', icon: KeyRound },
            ]}
            className="mb-5"
          />

          {errorMessage && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-card border border-danger/30 bg-danger-soft p-3 text-sm text-danger"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {errorMessage}
            </div>
          )}

          {activeTab === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <Input
                label="Email or mobile number"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                icon={<Mail />}
                placeholder="you@shop.com or 98200 11223"
                autoComplete="username"
                autoFocus
              />
              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock />}
                autoComplete="current-password"
              />
              <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
                Sign in <ArrowRight />
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePinLogin} className="space-y-4">
              <div>
                <label htmlFor="counter-pin" className="mb-1.5 block text-sm font-medium text-fg">
                  Counter PIN
                </label>
                <input
                  id="counter-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  aria-describedby="counter-pin-hint"
                  className="h-14 w-full rounded-control border border-border-strong bg-surface text-center font-mono text-2xl tracking-[0.5em] text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
                <p id="counter-pin-hint" className="mt-1.5 text-xs text-fg-subtle">
                  4–6 digits, set by the shop owner for this counter.
                </p>
              </div>
              <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
                Start shift <ArrowRight />
              </Button>
            </form>
          )}

          {/* Demo credentials — development builds only (never shipped to production) */}
          {import.meta.env.DEV && (
            <div className="mt-6 border-t border-border pt-4">
              <p className="mb-2 text-center text-xs font-medium text-fg-subtle">Development: fill demo login</p>
              <div className="grid grid-cols-3 gap-2">
                {(['owner', 'manager', 'cashier'] as const).map((r) => (
                  <Button key={r} variant="secondary" size="sm" onClick={() => handleQuickFill(r)} className="capitalize">
                    {r}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-fg-muted">
          Setting up a new shop?{' '}
          <Link to="/signup" className="font-medium text-accent hover:underline">
            Register your business
          </Link>
        </p>
      </main>
    </div>
  );
}
