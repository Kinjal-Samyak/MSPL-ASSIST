/** Reads an "R G B" CSS variable and returns Tailwind's standard opacity-aware color function, so
 * e.g. `bg-primary/10` works the same as any built-in Tailwind color. */
function withOpacity(variable) {
  return ({ opacityValue }) =>
    opacityValue === undefined
      ? `rgb(var(${variable}))`
      : `rgb(var(${variable}) / ${opacityValue})`;
}

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Enterprise theme tokens - the single source of truth for the app's visual language.
        // Values reference "R G B" CSS variables (defined in src/styles/globals.css) via
        // Tailwind's rgb(var(...) / <alpha-value>) convention, so opacity modifiers keep working
        // (bg-primary/10, ring-primary/20) and dark mode can swap every value in one place. Every
        // shared component in components/ui, components/layout, components/tables and the
        // AppLayout chrome consumes these instead of raw Tailwind slate/blue/etc utilities.
        background: withOpacity('--color-background'),
        surface: withOpacity('--color-surface'),
        sidebar: {
          DEFAULT: withOpacity('--color-sidebar'),
          hover: withOpacity('--color-sidebar-hover'),
        },
        primary: {
          DEFAULT: withOpacity('--color-primary'),
          hover: withOpacity('--color-primary-hover'),
        },
        accent: withOpacity('--color-accent'),
        border: withOpacity('--color-border'),
        success: withOpacity('--color-success'),
        warning: withOpacity('--color-warning'),
        danger: withOpacity('--color-danger'),
        info: withOpacity('--color-info'),
        neutral: withOpacity('--color-neutral'),
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
