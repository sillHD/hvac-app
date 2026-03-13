/** @type {import('tailwindcss').Config} */
module.exports = {
  // include CSS files as well, because we use @apply with custom
  // utilities (e.g. `focus:border-accent`) inside globals.css.  If the
  // content glob omits `.css`, JIT will never see those class names and
  // they won't be generated, leading to "unknown utility class" errors.
  content: ['./src/**/*.{js,ts,jsx,tsx,css}'],
  theme: {
    extend: {
      colors: {
        accent: '#5c7cfa',
      },
    },
  },
  plugins: [],
};