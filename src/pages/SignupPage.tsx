import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Store,
  Building,
  Mail,
  Phone,
  Lock,
  FileText,
  ArrowRight,
  Eye,
  EyeOff,
  BadgeCheck,
  ShieldCheck,
  Receipt,
  Boxes,
  Search,
  Check,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/card';
import { api } from '@/services/api-client';
import { BUSINESS_TYPES, getBusinessType } from '@/lib/business-types';

// GST state codes for India (all states & union territories)
const INDIAN_STATES: { code: string; name: string }[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

// Fade example placeholders so they clearly read as hints, not filled-in values.
const PLACEHOLDER_FADE = 'placeholder:opacity-50';

const SHOWCASE_FEATURES = [
  { icon: Receipt, title: 'GST-ready billing', desc: 'Auto CGST/SGST/IGST on every invoice' },
  { icon: Boxes, title: 'Live stock & inventory', desc: 'Low-stock alerts and valuation built in' },
  { icon: ShieldCheck, title: 'Secure & offline-first', desc: 'Keep selling even when the net drops' },
];

export default function SignupPage() {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [gstin, setGstin] = useState('');
  const [stateCode, setStateCode] = useState('27');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Business type (searchable) + the categories chosen for that type.
  const [businessType, setBusinessType] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [typeOpen, setTypeOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState('');

  const selectedType = getBusinessType(businessType);
  const filteredTypes = BUSINESS_TYPES.filter((t) =>
    t.label.toLowerCase().includes(typeSearch.trim().toLowerCase())
  );

  const handlePickType = (id: string) => {
    const t = getBusinessType(id);
    setBusinessType(id);
    setTypeSearch(t?.label || '');
    setTypeOpen(false);
    // Pre-select all starter categories for the chosen type so setup stays "under 60 seconds".
    setSelectedCategories(t ? [...t.categories] : []);
    setCustomCategory('');
  };

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const addCustomCategory = () => {
    const name = customCategory.trim();
    if (!name) return;
    if (!selectedCategories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      setSelectedCategories((prev) => [...prev, name]);
    }
    setCustomCategory('');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await api.post('/auth/signup', {
        businessName,
        name,
        email: email || undefined,
        phone,
        password,
        gstin: gstin || undefined,
        state: INDIAN_STATES.find((s) => s.code === stateCode)?.name || '',
        stateCode,
        businessType: businessType || undefined,
        categories: selectedCategories.length ? selectedCategories : undefined,
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
    <div className="min-h-screen bg-surface-2 lg:grid lg:grid-cols-[1.05fr_1fr] selection:bg-brand/30">
      {/* ─── Left: Brand Showcase (desktop only) ─────────────────────────── */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 p-12 text-white">
        {/* Decorative glows */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-teal-300/20 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2.5">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/25">
              <Store className="w-6 h-6 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">Bill Pro</span>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Run your entire shop from one simple screen.
          </h2>
          <p className="mt-4 text-sm text-emerald-50/90 leading-relaxed">
            Billing, GST, inventory and customer khata — set up in under a minute and start
            selling at the counter today.
          </p>

          <ul className="mt-9 space-y-5">
            {SHOWCASE_FEATURES.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-3.5">
                <div className="mt-0.5 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 ring-1 ring-white/20 shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-emerald-50/80">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-emerald-50/80">
          <BadgeCheck className="w-4 h-4" />
          Trusted by retailers for everyday GST billing
        </div>
      </aside>

      {/* ─── Right: Registration Form ────────────────────────────────────── */}
      <main className="flex flex-col justify-center items-center p-5 sm:p-8 min-h-screen lg:min-h-0">
        <div className="w-full max-w-md">
          {/* Mobile brand mark */}
          <div className="flex lg:hidden flex-col items-center text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 shadow-xl shadow-emerald-500/25 mb-3">
              <Store className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-fg tracking-tight">Register your shop</h1>
            <p className="text-sm text-fg-subtle mt-1">Set up your business in under 60 seconds.</p>
          </div>

          <div className="bg-surface border border-border rounded-2xl shadow-xl shadow-black/5 p-6 sm:p-7">
            {errorMessage && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-5">
              {/* Business */}
              <Input
                label="Shop / Business Name"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                icon={<Building className="w-4 h-4" />}
                placeholder="e.g. Metro Supermarket"
                className={PLACEHOLDER_FADE}
              />

              {/* Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Owner / Contact Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rajesh Kumar"
                  className={PLACEHOLDER_FADE}
                />
                <Input
                  label="Mobile Phone"
                  type="tel"
                  inputMode="numeric"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  icon={<Phone className="w-4 h-4" />}
                  placeholder="9820011223"
                  maxLength={10}
                  error={phone.length > 0 && phone.length < 10 ? 'Enter a 10-digit mobile number' : undefined}
                  className={PLACEHOLDER_FADE}
                />
              </div>

              <Input
                label="Email (Optional)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                placeholder="owner@shop.com"
                className={PLACEHOLDER_FADE}
              />

              {/* Password with show/hide toggle */}
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="w-4 h-4" />}
                  placeholder="At least 8 characters"
                  className={`pr-10 ${PLACEHOLDER_FADE}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-[1.95rem] p-1 text-fg-subtle hover:text-fg rounded-md transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Business type section */}
              <div className="pt-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                    Business Type
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                {/* Searchable type picker */}
                <div className="relative">
                  <label className="block text-xs font-medium text-fg-muted mb-1.5">
                    What do you sell?
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-fg-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={typeSearch}
                      onChange={(e) => {
                        setTypeSearch(e.target.value);
                        setTypeOpen(true);
                        if (businessType) setBusinessType('');
                      }}
                      onFocus={() => setTypeOpen(true)}
                      onBlur={() => setTimeout(() => setTypeOpen(false), 150)}
                      placeholder="Search business type — grocery, electronics…"
                      className={`w-full bg-surface border border-border rounded-lg pl-10 pr-9 py-2 text-sm text-fg transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring ${PLACEHOLDER_FADE}`}
                    />
                    <ChevronDown className="w-4 h-4 text-fg-subtle absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {typeOpen && (
                    <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-auto bg-surface border border-border rounded-xl shadow-xl py-1">
                      {filteredTypes.length === 0 ? (
                        <li className="px-3 py-2 text-xs text-fg-subtle">No matching type</li>
                      ) : (
                        filteredTypes.map((t) => (
                          <li key={t.id}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handlePickType(t.id)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-surface-2 transition-colors ${
                                businessType === t.id ? 'bg-brand/10 text-brand' : 'text-fg'
                              }`}
                            >
                              <span className="text-base leading-none">{t.icon}</span>
                              <span className="flex-1">{t.label}</span>
                              {businessType === t.id && <Check className="w-4 h-4 text-brand" />}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>

                {/* Category multi-select, shown once a type is chosen */}
                {selectedType && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-fg-muted">
                        Categories for {selectedType.label}
                      </label>
                      <span className="text-[11px] text-fg-subtle">{selectedCategories.length} selected</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(new Set([...selectedType.categories, ...selectedCategories])).map((cat) => {
                        const active = selectedCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                              active
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-surface-2 text-fg-muted border-border hover:border-brand/50'
                            }`}
                          >
                            {active && <Check className="w-3 h-3" />}
                            {cat}
                          </button>
                        );
                      })}
                    </div>

                    {/* Add a custom category inline */}
                    <div className="flex items-center gap-2 mt-3">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 text-fg-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCustomCategory();
                            }
                          }}
                          placeholder="Add your own category…"
                          className={`w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-ring ${PLACEHOLDER_FADE}`}
                        />
                      </div>
                      <Button type="button" variant="secondary" size="sm" onClick={addCustomCategory}>
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* GST section */}
              <div className="pt-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                    Tax Details
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="GSTIN (Optional)"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    icon={<FileText className="w-4 h-4" />}
                    placeholder="27AAPFU0939F1ZV"
                    className={PLACEHOLDER_FADE}
                  />
                  <div>
                    <label className="block text-xs font-medium text-fg-muted mb-1.5">
                      State / UT (GST Code)
                    </label>
                    <select
                      value={stateCode}
                      onChange={(e) => setStateCode(e.target.value)}
                      className="w-full bg-surface border border-border rounded-lg px-3.5 py-2 text-sm text-fg transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.code} - {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <Button type="submit" variant="primary" className="w-full mt-1" isLoading={isLoading}>
                Create Business Account
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-fg-subtle mt-6">
            Already registered?{' '}
            <Link to="/login" className="text-brand hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
