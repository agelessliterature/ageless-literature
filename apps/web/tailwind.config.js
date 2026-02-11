/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#000000',
          dark: '#000318',
          light: '#1a1e3c',
        },
        secondary: {
          DEFAULT: '#d4af37',
          dark: '#b8962e',
          light: '#e0c158',
        },
        // Ageless Literature Brand Colors
        ageless: {
          navy: '#0c0c2b',
          gold: '#c6a664',
          cream: '#f9f7f3',
        },
        black: '#000000',
        warning: '#FFD700',
        alert: '#c95c76',
        success: '#99c625',
      },
      fontFamily: {
        sans: [
          'var(--font-montserrat)',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        montserrat: ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
