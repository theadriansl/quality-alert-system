/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          primary: '#0F3B5F',
          secondary: '#5C6770',
          accent: '#0072CE',

          background: '#F4F6F8',
          surface: '#FFFFFF',
          section: '#E6EAEE',

          success: '#2E7D32',
          warning: '#C77700',
          error: '#B00020',
          info: '#1565C0',

          text: {
            primary: '#1C1F23',
            secondary: '#6B7280',
            muted: '#A0A4A8'
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      borderRadius: {
        industrial: '4px'
      },
      boxShadow: {
        industrial: '0 1px 3px rgba(0,0,0,0.08)'
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
