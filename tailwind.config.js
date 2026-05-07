/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './*.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Roboto Condensed como fuente clínica principal
        sans: ['"Roboto Condensed"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      screens: {
        // Sistema de 6 niveles para control milimétrico en pantallas médicas
        xs: '360px',  // Móviles pequeños (sobreescribe nada, es nuevo)
        sm: '480px',  // Móviles grandes / Phablets (sobreescribe default 640px)
        // md: '768px'   Tablets verticales   (igual al default de Tailwind)
        // lg: '1024px'  Tablets horizontales (igual al default de Tailwind)
        // xl: '1280px'  Portátiles           (igual al default de Tailwind)
        // 2xl:'1536px'  Monitores            (igual al default de Tailwind)
      },
    },
  },
  plugins: [],
};
