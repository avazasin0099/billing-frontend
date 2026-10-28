/** @type {import('tailwindcss').Config} */
const withAlpha = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens (resolve per theme via CSS variables in index.css)
        canvas: withAlpha('--canvas'),
        surface: {
          DEFAULT: withAlpha('--surface'),
          2: withAlpha('--surface-2'),
        },
        border: withAlpha('--border'),
        fg: {
          DEFAULT: withAlpha('--fg'),
          muted: withAlpha('--fg-muted'),
          subtle: withAlpha('--fg-subtle'),
        },
        ring: withAlpha('--ring'),
        // Accent that adapts per theme (emerald-600 light / emerald-400 dark)
        brand: withAlpha('--brand'),
        // Fixed emerald scale for solid fills / gradients (works in both themes)
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        slate: {
          850: '#172033',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
