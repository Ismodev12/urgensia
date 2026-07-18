/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'teal-medical': '#0F766E',
        'turquoise': '#14B8A6',
        'accent-cyan': '#06B6D4',
        'bg-main': '#F8FAFC',
        'night-blue': '#0F172A',
        'soft-gray': '#64748B',
        'manchester-1': '#DC2626',
        'manchester-2': '#EA580C',
        'manchester-3': '#EAB308',
        'manchester-4': '#22C55E',
        'manchester-5': '#3B82F6',
      },
      fontFamily: {
        sans: ['Figtree', 'Noto Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'large': '0 10px 40px -10px rgba(0, 0, 0, 0.15)',
        'teal': '0 4px 20px rgba(15, 118, 110, 0.3)',
      },
    },
  },
  plugins: [],
}
