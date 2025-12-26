/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        // Custom Dark Colors agar zaroorat padi
        slate: {
          850: '#151e32',
          950: '#020617', 
        }
      }
    },
  },
  plugins: [],
}