/** @type {import('tailwindcss').Config} */
const withAlpha = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Semantic tokens only — they resolve per theme via CSS variables in src/index.css.
      // Components must use these, never raw palette classes (emerald-600, #hex, …).
      colors: {
        canvas: withAlpha('--canvas'),
        surface: {
          DEFAULT: withAlpha('--surface'),
          2: withAlpha('--surface-2'),
        },
        border: {
          DEFAULT: withAlpha('--border'),
          strong: withAlpha('--border-strong'),
        },
        fg: {
          DEFAULT: withAlpha('--fg'),
          muted: withAlpha('--fg-muted'),
          subtle: withAlpha('--fg-subtle'),
        },
        primary: {
          DEFAULT: withAlpha('--primary'),
          hover: withAlpha('--primary-hover'),
          fg: withAlpha('--primary-fg'),
          soft: withAlpha('--primary-soft'),
        },
        accent: withAlpha('--accent'),
        // Lime highlight — fills only, always with `text-highlight-fg` (black).
        highlight: { DEFAULT: withAlpha('--highlight'), fg: withAlpha('--highlight-fg') },
        ring: withAlpha('--ring'),
        success: { DEFAULT: withAlpha('--success'), soft: withAlpha('--success-soft') },
        warning: { DEFAULT: withAlpha('--warning'), soft: withAlpha('--warning-soft') },
        danger: {
          DEFAULT: withAlpha('--danger'),
          hover: withAlpha('--danger-hover'),
          soft: withAlpha('--danger-soft'),
        },
        info: { DEFAULT: withAlpha('--info'), soft: withAlpha('--info-soft') },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        // Standard radii: controls 6px, cards/modals 8px.
        control: '6px',
        card: '8px',
      },
    },
  },
  plugins: [],
};
