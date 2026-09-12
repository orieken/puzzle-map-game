/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#090a0b',
        coal: '#111315',
        ash: '#1a1d20',
        bone: '#d8d2c4',
        ember: '#d96b3b',
        acid: '#b8cc5c',
        fog: '#858b86',
      },
      fontFamily: {
        display: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        ember: '0 0 28px rgba(217, 107, 59, 0.18)',
        acid: '0 0 24px rgba(184, 204, 92, 0.15)',
      },
    },
  },
  plugins: [],
}
