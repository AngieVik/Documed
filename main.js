// 1. Estilos (Tailwind compilado vía PostCSS)
import './style.css';

// 2. Librerías NPM
import SignaturePad from 'signature_pad';
import pdfMake from 'pdfmake/build/pdfmake';
// vfs_fonts.js es un módulo UMD/CJS sin default export.
// Se importa como side-effect: ejecuta window.pdfMake = window.pdfMake||{};
// window.pdfMake.vfs = {...fonts...} sobre un objeto temporal en window.
import 'pdfmake/build/vfs_fonts';

// 3. Módulo principal de la aplicación (configura window.onload y event listeners)
import './app.js';

// 4. Registro del Service Worker generado por vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';

// Transferir los datos de fuentes del objeto temporal al motor pdfMake real.
// Los imports estáticos se resuelven antes de ejecutar el cuerpo del módulo,
// por lo que window.pdfMake.vfs ya está cargado en este punto.
pdfMake.vfs = window.pdfMake?.vfs ?? {};

// Exponer en window las instancias que pueden necesitar handlers inline residuales
window.pdfMake = pdfMake;
window.SignaturePad = SignaturePad;

registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[DocuMed] Nueva versión disponible. Actualizando...');
  },
  onOfflineReady() {
    console.log('[DocuMed] Listo para uso sin conexión.');
  },
});
