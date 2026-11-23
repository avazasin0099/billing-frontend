import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building, Mail, Phone, Lock, FileText, ArrowRight, Eye, EyeOff, Search, Check, Tag, ChevronDown, CircleAlert } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/card';
import { BrandMark } from '@/components/layout/sidebar';
import { api } from '@/services/api-client';
import { BUSINESS_TYPES, getBusinessType } from '@/lib/business-types';
import { cn } from '@/lib/utils';

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
];

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <legend className="mb-3 w-full border-b border-border pb-2 text-sm font-semibold text-fg">{children}</legend>
);

export default function SignupPage() {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gstin, setGstin] = useState('');
  const [stateCode, setStateCode] = useState('27');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Business type (searchable) + the categories chosen for that type.
  const [businessType, setBusinessType] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [typeOpen, setTypeOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState('');

  const selectedType = getBusinessType(businessType);
  const filteredTypes = BUSINESS_TYPES.filter((t) => t.label.toLowerCase().includes(typeSearch.trim().toLowerCase()));

  // Inline validation (shown after the first submit attempt, or as soon as a field has content).
  const phoneError = phone.length > 0 && phone.length < 10 ? 'Enter a 10-digit mobile number' : undefined;
  const passwordError = (submitted || password.length > 0) && password.length < 6 ? 'Use at least 6 characters' : undefined;
  const confirmError =
    (submitted || confirmPassword.length > 0) && confirmPassword !== password ? 'Passwords do not match' : undefined;
  const gstinError = gstin
    ? !GSTIN_REGEX.test(gstin)
      ? 'GSTIN must be 15 characters, e.g. 27AAAAA0000A1Z5'
      : gstin.slice(0, 2) !== stateCode
        ? `GSTIN starts with ${gstin.slice(0, 2)}, but the selected state code is ${stateCode}`
        : undefined
    : undefined;

  const handlePickType = (id: string) => {
    const t = getBusinessType(id);
    setBusinessType(id);
    setTypeSearch(t?.label || '');
    setTypeOpen(false);
    // Pre-select all starter categories for the chosen type so setup stays quick.
    setSelectedCategories(t ? [...t.categories] : []);
    setCustomCategory('');
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const addCustomCategory = () => {
    const cat = customCategory.trim();
    if (!cat) return;
    if (!selectedCategories.some((c) => c.toLowerCase() === cat.toLowerCase())) {
      setSelectedCategories((prev) => [...prev, cat]);
    }
    setCustomCategory('');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (phone.length !== 10 || password.length < 6 || confirmPassword !== password || gstinError) {
      setErrorMessage('Please fix the highlighted fields.');
      return;
    }
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
    <div className="flex min-h-screen justify-center bg-canvas px-4 py-10">
      <main className="w-full max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <BrandMark />
          <div>
            <h1 className="text-xl font-semibold text-fg">Register your shop</h1>
            <p className="text-sm text-fg-muted">Set up billing, stock and GST in about a minute.</p>
          </div>
        </div>

        <div className="rounded-card border border-border bg-surface p-6 shadow-sm sm:p-8">
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-2 rounded-card border border-danger/30 bg-danger-soft p-3 text-sm text-danger"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSignup} noValidate className="space-y-8">
            <fieldset className="space-y-4">
              <SectionTitle>Business</SectionTitle>
              <Input
                label="Shop / business name"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                icon={<Building />}
                placeholder="As printed on your bills"
                autoComplete="organization"
              />

              {/* Searchable business-type combobox */}
              <div className="relative">
                <label htmlFor="business-type" className="mb-1.5 block text-sm font-medium text-fg">
                  What do you sell?
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
                  <input
                    id="business-type"
                    type="text"
                    role="combobox"
                    aria-expanded={typeOpen}
                    aria-controls="business-type-list"
                    aria-autocomplete="list"
                    value={typeSearch}
                    onChange={(e) => {
                      setTypeSearch(e.target.value);
                      setTypeOpen(true);
                      if (businessType) setBusinessType('');
                    }}
                    onFocus={() => setTypeOpen(true)}
                    onBlur={() => setTimeout(() => setTypeOpen(false), 150)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setTypeOpen(false);
                      if (e.key === 'Enter' && typeOpen && filteredTypes[0]) {
                        e.preventDefault();
                        handlePickType(filteredTypes[0].id);
                      }
                    }}
                    placeholder="Grocery, electronics, pharmacy…"
                    className="h-10 w-full rounded-control border border-border-strong bg-surface pl-9 pr-9 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
                </div>

                {typeOpen && (
                  <ul
                    id="business-type-list"
                    role="listbox"
                    className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-card border border-border bg-surface py-1 shadow-lg"
                  >
                    {filteredTypes.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-fg-subtle">No matching business type</li>
                    ) : (
                      filteredTypes.map((t) => {
                        const Icon = t.icon;
                        const selected = businessType === t.id;
                        return (
                          <li key={t.id} role="option" aria-selected={selected}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handlePickType(t.id)}
                              className={cn(
                                'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2',
                                selected ? 'bg-primary-soft text-accent' : 'text-fg'
                              )}
                            >
                              <Icon className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                              <span className="flex-1">{t.label}</span>
                              {selected && <Check className="size-4 text-accent" aria-hidden="true" />}
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                )}
              </div>

              {selectedType && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-fg">Starter categories</p>
                    <span className="text-xs text-fg-subtle">{selectedCategories.length} selected</span>
                  </div>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Starter categories">
                    {Array.from(new Set([...selectedType.categories, ...selectedCategories])).map((cat) => {
                      const active = selectedCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          aria-pressed={active}
                          className={cn(
                            'inline-flex h-8 items-center gap-1 rounded-full border px-3 text-sm transition-colors',
                            active
                              ? 'border-primary bg-primary-soft text-accent'
                              : 'border-border-strong bg-surface text-fg-muted hover:bg-surface-2'
                          )}
                        >
                          {active && <Check className="size-3.5" aria-hidden="true" />}
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    <Input
                      aria-label="Add your own category"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomCategory();
                        }
                      }}
                      icon={<Tag />}
                      placeholder="Add your own category"
                    />
                    <Button type="button" variant="secondary" onClick={addCustomCategory}>
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </fieldset>

            <fieldset className="space-y-4">
              <SectionTitle>Owner &amp; login</SectionTitle>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Owner name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  autoComplete="name"
                />
                <Input
                  label="Mobile number"
                  type="tel"
                  inputMode="numeric"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  icon={<Phone />}
                  placeholder="10-digit mobile"
                  maxLength={10}
                  autoComplete="tel-national"
                  error={phoneError || (submitted && phone.length === 0 ? 'Mobile number is required' : undefined)}
                />
              </div>
              <Input
                label="Email"
                hint="Optional. You can sign in with your mobile number instead."
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail />}
                placeholder="you@business.com"
                autoComplete="email"
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock />}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  error={passwordError}
                  suffix={
                    <IconButton
                      size="sm"
                      label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </IconButton>
                  }
                />
                <Input
                  label="Confirm password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  icon={<Lock />}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  error={confirmError}
                />
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <SectionTitle>GST details</SectionTitle>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select label="State / UT" value={stateCode} onChange={(e) => setStateCode(e.target.value)} required>
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} · {s.name}
                    </option>
                  ))}
                </Select>
                <Input
                  label="GSTIN"
                  hint="Optional. Leave blank if not GST-registered."
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  icon={<FileText />}
                  placeholder="15-character GSTIN"
                  maxLength={15}
                  className="font-mono uppercase"
                  error={gstinError}
                />
              </div>
            </fieldset>

            <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
              Create account <ArrowRight />
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-fg-muted">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
