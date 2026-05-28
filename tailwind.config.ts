import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Heebo', 'Rubik', 'system-ui', 'sans-serif'],
        num: ['Rubik', 'Heebo', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#0f2a44',
          50: '#f3f6fa',
          100: '#e3ecf5',
          200: '#c2d3e6',
          300: '#94b1d0',
          400: '#5f87b3',
          500: '#3e6a98',
          600: '#1f4d7a',
          700: '#173a5e',
          800: '#0f2a44',
          900: '#0a1c2e',
        },
        accent: {
          DEFAULT: '#d4af37',
          light: '#e6c768',
          dark: '#a8862a',
        },
        olive: { DEFAULT: '#4d6b3c', light: '#5f8348' },
        ok:    { DEFAULT: '#16a34a', soft: '#dcfce7' },
        warn:  { DEFAULT: '#ea7c1d', soft: '#ffe7cf' },
        bad:   { DEFAULT: '#c53030', soft: '#fde2e2' },
        info:  { DEFAULT: '#2563eb', soft: '#dbeafe' },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 42, 68, 0.06)',
        card: '0 6px 18px rgba(15, 42, 68, 0.08)',
        lift: '0 14px 36px rgba(15, 42, 68, 0.12)',
      },
      borderRadius: { xl2: '20px' },
    },
  },
  plugins: [],
};

export default config;
