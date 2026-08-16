/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        surface2: 'rgb(var(--c-surface2) / <alpha-value>)',
        line: 'rgb(var(--c-border) / <alpha-value>)',
        line2: 'rgb(var(--c-border2) / <alpha-value>)',
        ink: 'rgb(var(--c-text) / <alpha-value>)',
        ink2: 'rgb(var(--c-text2) / <alpha-value>)',
        ink3: 'rgb(var(--c-text3) / <alpha-value>)',
        primary: 'rgb(var(--c-accent) / <alpha-value>)',
        'primary-strong': 'rgb(var(--c-accent-strong) / <alpha-value>)',
        'primary-soft': 'rgb(var(--c-accent-soft) / <alpha-value>)',
        success: 'rgb(var(--c-success) / <alpha-value>)',
        'success-soft': 'rgb(var(--c-success-soft) / <alpha-value>)',
        warning: 'rgb(var(--c-warning) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        'danger-soft': 'rgb(var(--c-danger-soft) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Space Grotesk Variable"', '"Inter Variable"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(23 21 26 / 0.05), 0 6px 20px rgb(23 21 26 / 0.05)',
        pop: '0 4px 12px rgb(23 21 26 / 0.08), 0 16px 44px rgb(23 21 26 / 0.14)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'sheet-up': {
          from: { opacity: '0', transform: 'translateY(24px) scale(0.99)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        pop: {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'check-pop': {
          '0%': { transform: 'scale(0.6)' },
          '60%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'dash-draw': {
          from: { 'stroke-dashoffset': '300' },
          to: { 'stroke-dashoffset': '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
        'fade-up': 'fade-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        'sheet-up': 'sheet-up 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        pop: 'pop 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
        'check-pop': 'check-pop 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        'toast-in': 'toast-in 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        'dash-draw': 'dash-draw 1.4s ease-out both',
      },
    },
  },
  plugins: [],
}
