import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, KeyRound, Mail, Lock, ShieldCheck, ArrowRight, UserCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/card';
import { api } from '@/services/api-client';

export default function LoginPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'password' | 'pin'>('password');
  const [email, setEmail] = useState('admin@billpro.local');
  const [password, setPassword] = useState('Admin@1234');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await api.post('/auth/login', { email, password });
      if (data.tokens?.accessToken) {
        localStorage.setItem('billpro_token', data.tokens.accessToken);
        localStorage.setItem('billpro_refresh_token', data.tokens.refreshToken);
        localStorage.setItem('billpro_user', JSON.stringify(data.user));
        localStorage.setItem('billpro_shop', JSON.stringify(data.shop));
        localStorage.setItem('billpro_shop_id', data.shop.id);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setErrorMessage('Please enter a valid 4-to-6 digit PIN');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await api.post('/auth/pin-login', { pin });
      if (data.tokens?.accessToken) {
        localStorage.setItem('billpro_token', data.tokens.accessToken);
        localStorage.setItem('billpro_refresh_token', data.tokens.refreshToken);
        localStorage.setItem('billpro_user', JSON.stringify(data.user));
        localStorage.setItem('billpro_shop', JSON.stringify(data.shop));
        localStorage.setItem('billpro_shop_id', data.shop.id);
        navigate('/billing'); // Cashiers go straight to billing POS!
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid PIN code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (role: 'owner' | 'manager' | 'cashier') => {
    if (role === 'owner') {
      setEmail('admin@billpro.local');
      setPassword('Admin@1234');
      setPin('1234');
    } else if (role === 'manager') {
      setEmail('manager@billpro.local');
      setPassword('Manager@1234');
      setPin('2345');
    } else {
      setEmail('cashier@billpro.local');
      setPassword('Cashier@1234');
      setPin('3456');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-indigo-500/30">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 shadow-xl shadow-indigo-500/25 mb-3">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Bill Pro</h1>
          <p className="text-sm text-slate-400 mt-1">Retail Billing, Stock & GST System</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          {/* Tab Selector */}
          <div className="flex bg-slate-950/80 p-1 rounded-xl mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('password');
                setErrorMessage('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'password'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Password Login
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('pin');
                setErrorMessage('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'pin'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              Counter PIN (Fast)
            </button>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              {errorMessage}
            </div>
          )}

          {activeTab === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                placeholder="you@shop.com"
              />

              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                placeholder="••••••••"
              />

              <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
                Sign in to Register
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePinLogin} className="space-y-4">
              <div className="text-center mb-2">
                <p className="text-xs text-slate-400">
                  Enter your cashier shift PIN for fast point-of-sale counter access
                </p>
              </div>

              <div className="flex justify-center">
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-44 text-center tracking-[0.5em] text-2xl font-mono py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <Button type="submit" variant="primary" className="w-full mt-4" isLoading={isLoading}>
                Unlock Counter Shift
              </Button>
            </form>
          )}

          {/* Demo Credentials Quick Switcher */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-2 text-center">
              Quick Demo Fill
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('owner')}
                className="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-[11px] text-slate-300 transition-colors text-center"
              >
                Owner
                <span className="block text-[9px] text-slate-500 font-mono">PIN: 1234</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('manager')}
                className="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-[11px] text-slate-300 transition-colors text-center"
              >
                Manager
                <span className="block text-[9px] text-slate-500 font-mono">PIN: 2345</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('cashier')}
                className="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-[11px] text-slate-300 transition-colors text-center"
              >
                Cashier
                <span className="block text-[9px] text-slate-500 font-mono">PIN: 3456</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Signup Link */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Setting up a new shop?{' '}
          <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Register Business
          </Link>
        </p>
      </div>
    </div>
  );
}
