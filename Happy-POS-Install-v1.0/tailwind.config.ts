import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef3e2',
          100: '#fde3b4',
          200: '#fbc982',
          300: '#f9af4f',
          400: '#f79f2e',
          500: '#f59000',
          600: '#e07d00',
          700: '#c46800',
          800: '#a85400',
          900: '#7d3b00',
        }
      },
      fontFamily: {
        thai: ['Sarabun', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
export default config
