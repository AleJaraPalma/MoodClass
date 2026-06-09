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
        'mc-bg': '#0D0D1A',
        'mc-surface': '#1A1A2E',
        'mc-card': '#16213E',
        'mc-purple': '#6C63FF',
        'mc-purple-light': '#8B83FF',
        'mc-text': '#F0F0FF',
        'mc-muted': '#A0A0C0',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      animation: {
        'gem-glow': 'gemGlow 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'pulse-slow': 'pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
