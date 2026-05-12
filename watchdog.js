// =========================================================================
// watchdog.js — DocuMed · WatchdogService
// Módulo de seguridad LOPDGDD (3/2018) / GDPR (UE) 2016/679
//
// Responsabilidad única: detectar inactividad del usuario y purgar los datos
// clínicos en memoria (AppState) al superar el umbral de tiempo establecido.
//
// Importa únicamente desde store.js para evitar dependencias circulares con
// app.js. La limpieza de componentes específicos (SignaturePads, autocomplete)
// se delega mediante CustomEvent('watchdog:session-expired'), al que app.js
// se suscribe.
// =========================================================================

import { AppState, resetFormState } from './store.js';

// ── Constantes de tiempo ──────────────────────────────────────────────────

const TIMEOUT_MS        = 30 * 60 * 1000; // 30 min → caducidad de sesión
const WARNING_MS        = 29 * 60 * 1000; // 29 min → umbral de advertencia modal
const THROTTLE_MS       = 1_000;          // Mínimo entre actualizaciones de actividad
const CHECK_INTERVAL_MS = 10_000;         // Pulso de comprobación cada 10 s
                                           // (granularidad de minuto, sin saturar CPU)

// ── WatchdogService (IIFE) ────────────────────────────────────────────────
//
// Patrón IIFE: crea un ámbito privado para las variables de estado, evitando
// polución del espacio de nombres global. Devuelve exclusivamente la API pública.

export const WatchdogService = (() => {

  // ── Estado privado del módulo ─────────────────────────────────────────
  let _lastActivity  = 0;
  let _lastThrottle  = 0;
  let _intervalId    = null;
  let _warningShown  = false;
  let _initialized   = false;   // Guard idempotente para initWatchdog()

  // ── Modal de advertencia ──────────────────────────────────────────────
  //
  // Se inyecta una sola vez en el DOM al inicializar. Usa exclusivamente
  // clases Tailwind ya presentes en el bundle (tailwind.config.js content
  // incluye './*.js', por lo que watchdog.js es escaneado en el build).
  // No requiere archivo CSS adicional.

  function _createModal() {
    if (document.getElementById('watchdog-modal')) return;

    const overlay = document.createElement('div');
    overlay.id        = 'watchdog-modal';
    overlay.className = 'fixed bottom-6 inset-x-0 z-[9999] flex justify-center pointer-events-none';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-live', 'assertive');
    overlay.setAttribute('aria-atomic', 'true');

    overlay.innerHTML = `
      <div id="watchdog-modal-box"
           class="pointer-events-auto max-w-sm w-full mx-4 bg-amber-50 border
                  border-amber-300 rounded-lg shadow-xl p-4 flex gap-3 items-start
                  opacity-0 translate-y-4 transition-all duration-300">
        <svg class="shrink-0 text-amber-500 mt-0.5"
             xmlns="http://www.w3.org/2000/svg" width="20" height="20"
             viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9"  x2="12"    y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-amber-900">Sesión a punto de caducar</p>
          <p class="text-xs text-amber-800 mt-0.5">
            Por normativa <strong>LOPDGDD/GDPR</strong>, la sesión se cerrará en
            <strong>1 minuto</strong> por inactividad.
            Cualquier interacción la reanudará automáticamente.
          </p>
        </div>
        <button id="watchdog-dismiss"
                class="shrink-0 text-amber-600 hover:text-amber-900 transition-colors"
                aria-label="Descartar aviso">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
               viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6"  x2="6"  y2="18"/>
            <line x1="6"  y1="6"  x2="18" y2="18"/>
          </svg>
        </button>
      </div>`;

    document.body.appendChild(overlay);

    // El botón dismiss solo oculta el aviso visualmente; no reinicia el timer.
    // resetTimer() se activa por actividad real del usuario (mousemove, keydown...).
    document.getElementById('watchdog-dismiss')
      ?.addEventListener('click', _hideModal);
  }

  function _showModal() {
    const box = document.getElementById('watchdog-modal-box');
    if (!box) return;
    // requestAnimationFrame garantiza que la transición CSS se aplica tras el repaint
    requestAnimationFrame(() => {
      box.classList.remove('opacity-0', 'translate-y-4');
      box.classList.add('opacity-100', 'translate-y-0');
    });
  }

  function _hideModal() {
    const box = document.getElementById('watchdog-modal-box');
    if (!box) return;
    box.classList.add('opacity-0', 'translate-y-4');
    box.classList.remove('opacity-100', 'translate-y-0');
  }

  // ── Page Visibility API ───────────────────────────────────────────────
  //
  // Los navegadores pausan setInterval en pestañas ocultas y en PWAs que
  // pasan a segundo plano (comportamiento confirmado en Chromium ≥ 88 y en
  // iOS Safari). Al volver a primer plano, los intervalos pendientes se
  // disparan todos juntos de forma incorrecta. La solución es usar
  // Date.now() como reloj de referencia: el delta real de inactividad es
  // siempre Date.now() - _lastActivity, independientemente de cuántos
  // intervalos se hayan ejecutado o pausado.
  //
  // Función nombrada (no closure anónima) — requisito de removeEventListener.

  function _onVisibilityChange() {
    if (document.visibilityState === 'visible') checkInactivity();
  }

  // ── API pública ───────────────────────────────────────────────────────

  /**
   * Actualiza el timestamp de última actividad.
   *
   * Throttling manual sin dependencias externas: compara Date.now() con
   * _lastThrottle. Si el intervalo es menor que THROTTLE_MS (1 s), ignora
   * el evento. Esto evita que mousemove (que puede dispararse cientos de veces
   * por segundo) sature el hilo principal en sesiones largas con tablet activa.
   *
   * Función nombrada — la misma referencia se pasa a addEventListener y a
   * removeEventListener en purgeSystem(). Una closure anónima crearía un
   * objeto de función nuevo en cada llamada, imposibilitando la eliminación.
   */
  function resetTimer() {
    const now = Date.now();
    if (now - _lastThrottle < THROTTLE_MS) return;
    _lastThrottle = now;
    _lastActivity = now;
    if (_warningShown) {
      _warningShown = false;
      _hideModal();
    }
  }

  /**
   * Evalúa el delta de inactividad y actúa según el umbral alcanzado.
   * Invocado por el setInterval interno y por _onVisibilityChange.
   */
  function checkInactivity() {
    const elapsed = Date.now() - _lastActivity;

    if (elapsed >= TIMEOUT_MS) {
      purgeSystem();
      return;
    }

    if (elapsed >= WARNING_MS && !_warningShown) {
      _warningShown = true;
      showWarningModal();
    }
  }

  /** Expone el evento de advertencia al minuto 29. */
  function showWarningModal() {
    _showModal();
  }

  /**
   * Interfaz destructiva invocada al alcanzar el minuto 30.
   *
   * Orden de operaciones:
   * 1. Detener el intervalo propio — evita doble ejecución.
   * 2. Eliminar los listeners del Watchdog — evita memory leaks del propio módulo.
   * 3. Cerrar el modal de advertencia.
   * 4. Purgar AppState (datos clínicos en memoria).
   * 5. Purgar el formulario dinámico del DOM.
   * 6. Emitir CustomEvent para que app.js destruya SignaturePads y autocomplete.
   *    Este evento desacopla el Watchdog de los internos de app.js y evita
   *    la dependencia circular watchdog.js ↔ app.js.
   */
  function purgeSystem() {
    clearInterval(_intervalId);
    _intervalId  = null;
    _initialized = false;

    ['mousemove', 'keydown', 'touchstart'].forEach(ev =>
      document.removeEventListener(ev, resetTimer)
    );
    document.removeEventListener('visibilitychange', _onVisibilityChange);

    _hideModal();

    AppState.templateKey = null;
    resetFormState();

    document.getElementById('clinical-form')?.reset();
    const dyn = document.getElementById('dynamic-content');
    if (dyn) dyn.innerHTML = '';
    const sel = document.getElementById('doc-selector');
    if (sel) sel.value = '';

    document.dispatchEvent(new CustomEvent('watchdog:session-expired', {
      detail: { reason: 'inactivity', ts: Date.now() },
      bubbles: false,
    }));
  }

  /**
   * Inicializa el Watchdog: captura el timestamp inicial, registra los
   * detectores de actividad y arranca el intervalo de comprobación.
   * Guard _initialized — seguro llamar varias veces (HMR, reintentos).
   */
  function initWatchdog() {
    if (_initialized) return;
    _initialized  = true;
    _lastActivity = Date.now();
    _lastThrottle = 0;
    _warningShown = false;

    _createModal();

    // { passive: true } señala al navegador que estos handlers nunca invocan
    // preventDefault(), permitiéndole optimizar el procesamiento de scroll
    // y eventos táctiles (crítico en tablets médicas Android / iPadOS).
    ['mousemove', 'keydown', 'touchstart'].forEach(ev =>
      document.addEventListener(ev, resetTimer, { passive: true })
    );

    document.addEventListener('visibilitychange', _onVisibilityChange);

    _intervalId = setInterval(checkInactivity, CHECK_INTERVAL_MS);
  }

  return { initWatchdog, resetTimer, checkInactivity, showWarningModal, purgeSystem };

})();
