import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, Building, Mail, Phone, Lock, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/card';
import { api } from '@/services/api-client';

export default function SignupPage() {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [gstin, setGstin] = useState('');
  const [stateCode, setStateCode] = useState('27');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await api.post('/auth/signup', {
        businessName,
        name,
        email,
        phone,
        password,
        gstin: gstin || undefined,
        state: 'Maharashtra',
        stateCode,
      });

      if (data.tokens?.accessToken) {
        localStorage.setItem('billpro_token', data.tokens.accessToken);
        localStorage.setItem('billpro_refresh_token', data.tokens.refreshToken);
        localStorage.setItem('billpro_user', JSON.stringify(data.user));
        localStorage.setItem('billpro_shop', JSON.stringify(data.shop));
        localStorage.setItem('billpro_shop_id', data.shop.id);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 shadow-xl shadow-indigo-500/25 mb-3">
            <Store className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Register Your Shop</h1>
          <p className="text-sm text-slate-400 mt-1">Setup your business in under 60 seconds</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              label="Shop / Business Name"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              icon={<Building className="w-4 h-4" />}
              placeholder="e.g. Metro Supermarket"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Owner / Contact Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rajesh Kumar"
              />
              <Input
                label="Mobile Phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                icon={<Phone className="w-4 h-4" />}
                placeholder="9820011223"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                placeholder="owner@shop.com"
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="GSTIN (Optional for non-GST)"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                icon={<FileText className="w-4 h-4" />}
                placeholder="27AAPFU0939F1ZV"
              />
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">State Code</label>
                <select
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="27">27 - Maharashtra</option>
                  <option value="29">29 - Karnataka</option>
                  <option value="07">07 - Delhi</option>
                  <option value="24">24 - Gujarat</option>
                  <option value="33">33 - Tamil Nadu</option>
                  <option value="36">36 - Telangana</option>
                  <option value="09">09 - Uttar Pradesh</option>
                </select>
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full mt-4" isLoading={isLoading}>
              Create Business Account
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Already registered?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
