/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0D1117',
        card: '#1A1F2B',
        border: '#2C313C',
        text: '#E6E6E6',
        textSecondary: '#A0A0A0',
        accentCyan: '#00E0D5',
        accentPurple: '#B79DF2',
        accentBlue: '#A3C6FF',
        accentLavender: '#C2A4FF',
        debuggerGreen: '#95F2C4',
        debuggerBlue: '#6FCBFF',
        debuggerPurple: '#D9A8F3',
        alertRed: '#FF6B6B',
        highlightYellow: '#FFD600',
      },
    },
  },
  plugins: [],
} 