// 1. Estilos (Tailwind compilado vía PostCSS)
import './style.css';

// 2. Librerías NPM
import SignaturePad from 'signature_pad';
import pdfMake from 'pdfmake/build/pdfmake';
// Vite optimiza vfs_fonts como CJS→ESM: el default export contiene { pdfMake: { vfs: {...} } }
// vfsFontsPlugin en vite.config.js transforma vfs_fonts añadiendo 'export default __vfs'
// garantizando que el default import funciona en dev Y en build (Rollup)
import pdfFonts from 'pdfmake/build/vfs_fonts';

// 3. Módulo principal de la aplicación (configura window.onload y event listeners)
import './app.js';

// 4. Registro del Service Worker generado por vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';

pdfMake.vfs = pdfFonts?.pdfMake?.vfs ?? {};

registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[DocuMed] Nueva versión disponible. Actualizando...');
  },
  onOfflineReady() {
    console.log('[DocuMed] Listo para uso sin conexión.');
  },
});
