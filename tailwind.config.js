/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#35724E',
          dark: '#2b5c40',
          darker: '#234b35',
          light: '#e8f2ec',
          pale: '#f4f9f5',
        },
        linkgreen: '#035924',
        ink: '#231F1E',
        soft: '#6b7280',
        line: '#e5e7eb',
        chip: '#e9ecef',
        danger: '#d64545',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        card: '8px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,.06)',
        lift: '0 6px 18px rgba(35,31,30,.12)',
      },
    },
  },
  plugins: [],
};