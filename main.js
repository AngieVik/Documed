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

// ── Flujo de actualización del SW — Estrategia Prompt ────────────────────
//
// _triggerUpdate almacena la referencia a updateSW(true) fuera del callback
// de onNeedRefresh. El banner se crea de forma lazy (solo cuando hay update),
// y su botón necesita acceder a la función sin importar el orden de ejecución.

let _triggerUpdate = null;

function _createUpdateBanner() {
  if (document.getElementById('sw-update-banner')) return;

  const el = document.createElement('div');
  el.id = 'sw-update-banner';
  // Posicionado en top-14 (bajo la navbar fija de h-10) y right-3,
  // para no solaparse con el watchdog-modal que ocupa el bottom-center.
  el.className = [
    'fixed top-14 right-3 z-[9998]',
    'max-w-xs w-full',
    'bg-sky-50 border border-sky-300 rounded-lg shadow-xl p-3',
    'flex gap-2.5 items-start',
    'opacity-0 -translate-y-2 transition-all duration-300',
    'pointer-events-none',
  ].join(' ');

  el.innerHTML = `
    <svg class="shrink-0 text-sky-500 mt-0.5"
         xmlns="http://www.w3.org/2000/svg" width="18" height="18"
         viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
    <div class="flex-1 min-w-0">
      <p class="text-xs font-semibold text-sky-900">Nueva versión disponible</p>
      <p class="text-[10px] text-sky-700 mt-0.5">
        Actualiza cuando finalices el informe actual. Los datos no se perderán.
      </p>
      <div class="flex gap-2 mt-2">
        <button id="sw-update-confirm"
                class="text-[10px] bg-sky-600 text-white rounded px-2.5 py-1
                       hover:bg-sky-500 transition-colors font-medium">
          Actualizar ahora
        </button>
        <button id="sw-update-dismiss"
                class="text-[10px] text-sky-700 border border-sky-300 rounded
                       px-2.5 py-1 hover:bg-sky-100 transition-colors">
          Más tarde
        </button>
      </div>
    </div>`;

  document.body.appendChild(el);

  // Confirmación: invoca updateSW(true) → SW salta la espera, se activa,
  // reclama clientes (clientsClaim: true en workbox) y window.location.reload().
  document.getElementById('sw-update-confirm').addEventListener('click', () => {
    _triggerUpdate?.();
  });

  // Descarte: solo oculta el banner. El SW sigue en estado 'waiting'.
  // La próxima vez que el usuario abra la app, onNeedRefresh volverá a disparar.
  document.getElementById('sw-update-dismiss').addEventListener('click', () => {
    _hideUpdateBanner();
  });
}

function _showUpdateBanner() {
  _createUpdateBanner();
  // requestAnimationFrame garantiza que el elemento ya está en el DOM
  // antes de iniciar la transición CSS de entrada.
  requestAnimationFrame(() => {
    const el = document.getElementById('sw-update-banner');
    if (!el) return;
    el.classList.remove('opacity-0', '-translate-y-2', 'pointer-events-none');
    el.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');
  });
}

function _hideUpdateBanner() {
  const el = document.getElementById('sw-update-banner');
  if (!el) return;
  el.classList.add('opacity-0', '-translate-y-2', 'pointer-events-none');
  el.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
}

// registerSW devuelve updateSW(reloadPage?: boolean).
// onNeedRefresh se dispara de forma asíncrona (después de que el SW detecta
// una nueva versión en red), por lo que const updateSW ya está inicializado
// cuando se invoca el callback — no hay riesgo de TDZ.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    _triggerUpdate = () => updateSW(true); // reloadPage = true → window.location.reload()
    _showUpdateBanner();
  },
  onOfflineReady() {
    console.info('[DocuMed PWA] Modo offline activo — todos los recursos cacheados.');
  },
});
