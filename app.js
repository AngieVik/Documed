// =========================================================================
// app.js — DocuMed · Lógica de Aplicación
// =========================================================================
import SignaturePad from 'signature_pad';
import pdfMake from 'pdfmake/build/pdfmake';
import DOMPurify from 'dompurify';
import { AppState, resetFormState } from './store.js';
import { CIE10_DB, FARMACOS_DB, HOSPITALES_DB } from './data.js';
import { DOC_TEMPLATES } from './templates.js';
import { UI_COMPONENTS } from './components.js';
import { WatchdogService } from './watchdog.js';

// ── Estado de módulo — Firmas ─────────────────────────────────────────────

const SignatureState = {
  paciente: null,
  medico:   null,
  testigos: [],
  counter:  0,
  resizeListenerAdded: false
};

// ── Ciclo de vida: registro y limpieza de listeners directos ─────────────

const _directListeners = [];

function _registerDirect(el, event, handler, options) {
  el.addEventListener(event, handler, options);
  _directListeners.push({ el, event, handler, options });
}

function teardown() {
  _directListeners.forEach(({ el, event, handler, options }) =>
    el.removeEventListener(event, handler, options)
  );
  _directListeners.length = 0;
  document.querySelectorAll('[data-ac-input]').forEach(inp => {
    if (inp._acController) { inp._acController.abort(); inp._acController = null; }
  });
}

// ── Utilidades de fecha ───────────────────────────────────────────────────

function parseLocalDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ── Utilidades UI ────────────────────────────────────────────────────────

function autoResize(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = textarea.scrollHeight + "px";
}

function toggleView(view) {
  document.getElementById("report-view").classList.toggle("hidden", view !== "report");
  document.getElementById("instructions-view").classList.toggle("hidden", view !== "instructions");
}

// ── Formulario clínico ───────────────────────────────────────────────────

function setDefaultDateTime() {
  const now  = new Date();
  const pad  = (n) => String(n).padStart(2, '0');
  const fecha = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const hora  = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  AppState.form['asistencia-fecha'] = fecha;
  AppState.form['asistencia-hora']  = hora;
  if (AppState.constantes[0]) AppState.constantes[0].hora = hora;

  const dateEl       = document.getElementById('asistencia-fecha');
  const timeEl       = document.getElementById('asistencia-hora');
  const horaConstEl  = document.querySelector('#constantes-container .input-hora');
  if (dateEl)      dateEl.value      = fecha;
  if (timeEl)      timeEl.value      = hora;
  if (horaConstEl) horaConstEl.value = hora;
}

function addConstantes() {
  const hora = new Date().toTimeString().substring(0, 5);
  AppState.constantes.push({ hora, ta: '', fc: '', fr: '', spo2: '', temp: '', gluc: '' });
  const clone = document.getElementById("constantes-row-template").content.cloneNode(true);
  const horaInput = clone.querySelector('.input-hora');
  if (horaInput) horaInput.value = hora;
  document.getElementById("constantes-container").appendChild(clone);
}

function addTestigo() {
  const index = SignatureState.counter++;
  const container = document.getElementById("testigos-container");
  const tempDiv = document.createElement('div');
  renderTemplate(UI_COMPONENTS.filaTestigo(index), tempDiv);
  while (tempDiv.firstChild) container.appendChild(tempDiv.firstChild);

  const canvas = document.getElementById(`canvas-testigo-${index}`);
  const pad = new SignaturePad(canvas, { penColor: "rgb(15,23,42)", minWidth: 0.8, maxWidth: 2.5 });

  SignatureState.testigos.push({ index, pad, canvas });
  AppState.testigos.push({ index, nombre: '', dni: '' });

  resizeCanvas(canvas, pad);
}

function removeTestigo(btn, index) {
  const entry = SignatureState.testigos.find(t => t.index === index);
  if (entry) entry.pad.off();
  SignatureState.testigos = SignatureState.testigos.filter(t => t.index !== index);
  AppState.testigos       = AppState.testigos.filter(t => t.index !== index);
  btn.closest('.testigo-row').remove();
}

function clearTestigoSignature(index) {
  const tp = SignatureState.testigos.find(t => t.index === index);
  if (tp) tp.pad.clear();
}


function clearReport() {
  if (!confirm("¿Borrar todos los datos clínicos?")) return;
  destroySignaturePads();
  document.getElementById("clinical-form").reset();
  document
    .querySelectorAll("#constantes-container .constantes-row:not(:first-of-type)")
    .forEach((row) => row.remove());
  document.querySelectorAll(".testigo-row").forEach(row => row.remove());
  document.querySelectorAll("textarea").forEach((ta) => (ta.style.height = "auto"));
  resetFormState();
  if (document.querySelector('.constantes-row')) {
    AppState.constantes.push({ hora: '', ta: '', fc: '', fr: '', spo2: '', temp: '', gluc: '' });
  }
  setDefaultDateTime();
  initSignaturePads();
}

function appendTratamiento() {
  const farmaco  = document.getElementById("farmaco-input");
  const dosis    = document.getElementById("dosis-input");
  const via      = document.getElementById("via-input");
  const textarea = document.getElementById("tratamiento-textarea");
  if (!farmaco.value) return;
  textarea.value += `- ${farmaco.value} (${dosis.value || "S/D"}) Vía: ${via.value}\n`;
  autoResize(textarea);
  syncElementToState(textarea);   // mutación silenciosa — el Store no recibe el evento 'input'
  farmaco.value = "";
  dosis.value   = "";
  farmaco.focus();
}

// ── Motor de Autocompletado Predictivo ────────────────────────────────────

function normalizeText(text) {
  if (!text) return "";
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function initMultiAutocomplete(inputId, database, isMulti = true) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.removeAttribute("list");
  input.dataset.acInput = "";
  
  // Garantizar que el padre sea relative para anclar el menú sin romper flexbox
  if (input.parentElement && window.getComputedStyle(input.parentElement).position === "static") {
    input.parentElement.style.position = "relative";
  }

  const menuId = `ac-menu-${inputId}`;
  let menu = document.getElementById(menuId);
  if (!menu) {
    menu = document.createElement("ul");
    menu.id = menuId;
    // Clases añadidas: top-full left-0 mt-1 para descolgar debajo del input
    menu.className = "absolute top-full left-0 mt-1 z-50 w-full bg-white border border-slate-300 rounded shadow-lg max-h-40 overflow-y-auto hidden text-xs text-slate-800";
    input.parentNode.insertBefore(menu, input.nextSibling);

    // Delegación única sobre el contenedor del menú — evita listeners por <li>
    menu.addEventListener("mousedown", function onMenuMousedown(e) {
      if (e.target.closest("li")) e.preventDefault();
    });
    menu.addEventListener("click", function onMenuClick(e) {
      const li = e.target.closest("li");
      if (!li?.dataset.match) return;
      const match = li.dataset.match;
      if (isMulti) {
        const parts = input.value.split(",");
        parts[parts.length - 1] = " " + match;
        input.value = parts.join(",").trim() + ", ";
      } else {
        input.value = match;
      }
      menu.classList.add("hidden");
      input.focus();
      syncElementToState(input);   // selección por clic — no dispara evento 'input' nativo
    });
  }

  if (input._acController) input._acController.abort();
  const controller = new AbortController();
  input._acController = controller;
  const { signal } = controller;

  let blurTimeout;
  let selectedIndex = -1;

  function highlightItem(index) {
    Array.from(menu.children).forEach((li, i) => {
      li.classList.toggle("bg-blue-100", i === index);
    });
  }

  // Extraemos la lógica a una función para poder llamarla al hacer clic o escribir
  function renderMenu() {
    selectedIndex = -1;
    const val = input.value;
    const parts = isMulti ? val.split(",") : [val];
    const currentFragment = parts[parts.length - 1].trim();

    const normalizedFragment = normalizeText(currentFragment);

    // Si el campo está vacío, mostramos las primeras 50 opciones. Si hay texto, filtramos.
    let matches = normalizedFragment.length === 0
      ? database.slice(0, 50)
      : database.filter(item => normalizeText(item).includes(normalizedFragment));

    if (matches.length > 0) {
      menu.innerHTML = "";
      matches.forEach(match => {
        const li = document.createElement("li");
        li.className = "px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0";
        li.textContent = match;
        li.dataset.match = match;
        menu.appendChild(li);
      });
      menu.classList.remove("hidden");
    } else {
      menu.classList.add("hidden");
    }
  }

  // Escuchadores de eventos para desplegar el menú — usando signal para limpieza automática
  input.addEventListener("input", renderMenu, { signal });
  input.addEventListener("click", renderMenu, { signal });

  input.addEventListener("focus", () => {
    clearTimeout(blurTimeout);
    renderMenu();
  }, { signal });

  input.addEventListener("blur", () => {
    blurTimeout = setTimeout(() => {
      menu.classList.add("hidden");
    }, 150);
  }, { signal });

  input.addEventListener("keydown", (e) => {
    if (menu.classList.contains("hidden")) return;
    const items = menu.children;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
      highlightItem(selectedIndex);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      highlightItem(selectedIndex);
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && items[selectedIndex]) {
        e.preventDefault();
        items[selectedIndex].click();
        selectedIndex = -1;
      }
    } else if (e.key === "Escape") {
      menu.classList.add("hidden");
      selectedIndex = -1;
    }
  }, { signal });
}
// ── Datalists (CIE-10, Fármacos, Hospitales) ────────────────────────────

function populateDatalists() {
  const container = document.getElementById("datalists-container");
  container.innerHTML = ""; // Se purga la dependencia del DOM nativo
}

function updateHospitalesDatalist() {
  const provincia     = document.getElementById("provincia-selector").value;
  const inputHospital = document.getElementById("hospital-destino");
  
  inputHospital.value = "";
  syncElementToState(inputHospital); // reset programático — no dispara evento 'input' nativo

  if (provincia && HOSPITALES_DB[provincia]) {
    // Invoca el motor predictivo: id, base de datos, isMulti = false
    initMultiAutocomplete("hospital-destino", HOSPITALES_DB[provincia], false);
  }
}

// ── Firmas (SignaturePad + canvas Retina) ────────────────────────────────

function destroySignaturePads() {
  if (SignatureState.paciente) { SignatureState.paciente.off(); SignatureState.paciente = null; }
  if (SignatureState.medico)   { SignatureState.medico.off();   SignatureState.medico   = null; }
  SignatureState.testigos.forEach(({ pad }) => pad.off());
  SignatureState.testigos = [];
  SignatureState.counter  = 0;
}

function resizeCanvas(canvas, pad) {
  const ratio  = Math.max(window.devicePixelRatio || 1, 1);
  const rect   = canvas.parentElement.getBoundingClientRect();
  const width  = rect.width;
  const height = width / 4;  // Ratio 1:4 (alto:ancho) idéntico al renderizado pdfmake
  canvas.width  = width  * ratio;
  canvas.height = height * ratio;
  canvas.style.width  = width  + "px";
  canvas.style.height = height + "px";
  canvas.getContext("2d").scale(ratio, ratio);
  pad.clear();
}

function clearSignature(type) {
  if (type === "paciente") SignatureState.paciente && SignatureState.paciente.clear();
  if (type === "medico")   SignatureState.medico   && SignatureState.medico.clear();
}

function initSignaturePads() {
  const canvasPaciente = document.getElementById("canvas-paciente");
  const canvasMedico   = document.getElementById("canvas-medico");

  if (canvasPaciente) SignatureState.paciente = new SignaturePad(canvasPaciente, { penColor: "rgb(15,23,42)", minWidth: 0.8, maxWidth: 2.5 });
  if (canvasMedico)   SignatureState.medico   = new SignaturePad(canvasMedico,   { penColor: "rgb(15,23,42)", minWidth: 0.8, maxWidth: 2.5 });

  if (canvasPaciente) resizeCanvas(canvasPaciente, SignatureState.paciente);
  if (canvasMedico)   resizeCanvas(canvasMedico,   SignatureState.medico);

  if (!SignatureState.resizeListenerAdded) {
    window.addEventListener("resize", () => {
      const cp = document.getElementById("canvas-paciente");
      const cm = document.getElementById("canvas-medico");
      if (cp && SignatureState.paciente) resizeCanvas(cp, SignatureState.paciente);
      if (cm && SignatureState.medico)   resizeCanvas(cm, SignatureState.medico);
      SignatureState.testigos.forEach(t => {
        if (t.canvas && document.body.contains(t.canvas)) {
          resizeCanvas(t.canvas, t.pad);
        }
      });
    });
    SignatureState.resizeListenerAdded = true;
  }
}

// ── Lógica de Tutor Legal ────────────────────────────────────────────────

function calcularEdadExacta(fechaNac) {
  const nacimiento = parseLocalDate(fechaNac);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

function checkAge() {
  const inputNacimiento = document.getElementById("paciente-nacimiento");
  const bloqueTutor = document.getElementById("bloque-tutor");
  const contenedorDependencia = document.getElementById("contenedor-dependencia");
  const checkDependencia = document.getElementById("check-dependencia");
  const labelFirmaPaciente = document.getElementById("label-firma-paciente");

  if (!inputNacimiento || !inputNacimiento.value) return;

  const edad = calcularEdadExacta(inputNacimiento.value);

  if (edad < 18) {
    if (bloqueTutor) bloqueTutor.classList.remove("hidden");
    if (contenedorDependencia) contenedorDependencia.classList.add("hidden");
    if (labelFirmaPaciente) labelFirmaPaciente.textContent = "Firma del Tutor Legal";
  } else {
    if (contenedorDependencia) contenedorDependencia.classList.remove("hidden");
    if (checkDependencia && checkDependencia.checked) {
      if (bloqueTutor) bloqueTutor.classList.remove("hidden");
      if (labelFirmaPaciente) labelFirmaPaciente.textContent = "Firma del Representante Legal";
    } else {
      if (bloqueTutor) bloqueTutor.classList.add("hidden");
      if (labelFirmaPaciente) labelFirmaPaciente.textContent = "Firma del Paciente";
    }
  }
}


// ── Handlers nombrados para delegación de cambios en elementos dinámicos ──

function handleProvinciaChange() { updateHospitalesDatalist(); }

function handleSinMedicoChange(checked) {
  document.getElementById("campos-testigos")?.classList.toggle("hidden", !checked);
  const lbl = document.getElementById("label-firma-facultativo");
  if (lbl) lbl.textContent = checked ? "Firma Testigos" : "Facultativo";
}

function handleTestigosEscenaChange(checked) {
  document.getElementById("campos-testigos")?.classList.toggle("hidden", !checked);
}

function handleDependenciaChange(checked) {
  document.getElementById("bloque-tutor")?.classList.toggle("hidden", !checked);
  const lbl = document.getElementById("label-firma-paciente");
  if (lbl) lbl.textContent = checked ? "Firma del Representante Legal" : "Firma del Paciente";
}

function onDynamicChange(e) {
  const t = e.target;
  switch (t.id) {
    case "provincia-selector":    handleProvinciaChange(); break;
    case "check-sin-medico":      handleSinMedicoChange(t.checked); break;
    case "check-testigos-escena": handleTestigosEscenaChange(t.checked); break;
    case "check-dependencia":     handleDependenciaChange(t.checked); break;
    case "paciente-nacimiento":   checkAge(); break;
  }
  syncElementToState(t);
}

function mount() {
  // 1. Poblar datalist de provincias (los cambios son manejados por onDynamicChange vía delegación)
  const provSelector = document.getElementById("provincia-selector");
  if (provSelector && provSelector.options.length <= 1) {
    Object.keys(HOSPITALES_DB).sort().forEach((prov) => {
      const opt = document.createElement("option");
      opt.value = prov;
      opt.textContent = prov;
      provSelector.appendChild(opt);
    });
  }

  // 2. Inicializar motor de firmas biométricas (tiene guard interno resizeListenerAdded)
  initSignaturePads();

  // 3. Autocompletado predictivo (AbortController por input para cleanup automático)
  initMultiAutocomplete("diagnostico", CIE10_DB, true);
  initMultiAutocomplete("input-alergias", FARMACOS_DB, true);
  initMultiAutocomplete("farmaco-input", FARMACOS_DB, false);

  // Los eventos change de los checkboxes y selects especiales (provincia-selector,
  // check-sin-medico, check-testigos-escena, check-dependencia, paciente-nacimiento)
  // son manejados por onDynamicChange, delegado en reportView desde initStaticEvents().
}

// ── Selector de plantilla ────────────────────────────────────────────────

/**
 * Renderiza HTML de plantilla médica en un contenedor DOM usando DOMPurify.
 * Allowlist explícita de elementos/atributos para formularios clínicos:
 * inputs, canvas de firma, iconos SVG inline, delegación de eventos con data-*.
 *
 * @param {string} htmlString - HTML generado por getSections() o UI_COMPONENTS.
 * @param {Element} contenedor - Elemento DOM destino donde se monta el contenido.
 */
function renderTemplate(htmlString, contenedor) {
  const fragment = DOMPurify.sanitize(htmlString, {
    ALLOWED_TAGS: [
      'div', 'span', 'p', 'strong', 'em', 'br', 'ul', 'ol', 'li',
      'h3', 'h4',
      'form', 'label', 'input', 'textarea', 'select', 'option', 'optgroup', 'button',
      'template',
      'canvas', 'img',
      'svg', 'line', 'polyline', 'path', 'circle', 'rect', 'polygon',
    ],
    ALLOWED_ATTR: [
      'id', 'class', 'style',
      'type', 'name', 'value', 'placeholder', 'rows', 'maxlength',
      'autocomplete', 'required', 'readonly', 'disabled', 'checked', 'selected', 'for',
      'data-action', 'data-index', 'data-target',
      'title', 'aria-label', 'aria-hidden', 'role', 'tabindex',
      'src', 'alt', 'width', 'height',
      'xmlns', 'viewBox', 'fill', 'stroke', 'stroke-width',
      'stroke-linecap', 'stroke-linejoin',
      'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'd', 'points',
    ],
    FORBID_TAGS: ['script', 'object', 'embed', 'applet', 'iframe'],
    FORBID_ATTR: ['formaction'],
    RETURN_DOM_FRAGMENT: true,
  });
  contenedor.innerHTML = '';
  contenedor.appendChild(fragment);
}

function getActiveTemplate() {
  const sel = document.getElementById("doc-selector");
  if (!sel || !sel.value) return null;
  return DOC_TEMPLATES[sel.value];
}

/**
 * Lectura única de DOM post-render para inicializar AppState.form con los
 * valores por defecto de la plantilla recién montada (ej: fecha/hora actual,
 * opciones preseleccionadas). Llamar solo desde switchTemplate().
 */
function hydrateInitialState() {
  const container = document.getElementById("dynamic-content");
  if (!container) return;

  container.querySelectorAll("input, select, textarea").forEach(el => {
    if (!el.id) return;
    AppState.form[el.id] = (el.type === 'checkbox' || el.type === 'radio')
      ? el.checked
      : el.value.trim();
    if (el.tagName === 'SELECT' && el.selectedIndex > 0) {
      AppState.form[el.id + '__text'] = el.options[el.selectedIndex].text;
    }
  });

  const firstRow = container.querySelector('.constantes-row');
  if (firstRow) {
    AppState.constantes = [{ hora: '', ta: '', fc: '', fr: '', spo2: '', temp: '', gluc: '' }];
  }

  // Sobrescribe fecha/hora con la hora real del dispositivo de forma determinista,
  // garantizando que el estado sea autoritativo antes de que el usuario edite nada.
  setDefaultDateTime();
}

function switchTemplate() {
  teardown();
  destroySignaturePads();
  resetFormState();
  const template = getActiveTemplate();
  AppState.templateKey = template ? Object.keys(DOC_TEMPLATES).find(k => DOC_TEMPLATES[k] === template) ?? null : null;

  const dynamicContainer = document.getElementById("dynamic-content");
  const mainTitle = document.querySelector("#report-view h1");

  if (!template) {
    if (dynamicContainer) {
      renderTemplate(`
        <div class="flex flex-col items-center justify-center p-16 text-slate-400 min-h-[50vh]">
          <img src="./icon-512.png" alt="DocuMed" class="w-32 h-32 opacity-20 mb-6 grayscale" />
          <p class="text-xs uppercase tracking-widest font-semibold">Seleccione un documento para comenzar</p>
        </div>
      `, dynamicContainer);
    }
    if (mainTitle) mainTitle.textContent = "DOCUMED";
    return;
  }

  if (dynamicContainer && template.getSections) {
    renderTemplate(template.getSections().join(""), dynamicContainer);
  }

  if (mainTitle) mainTitle.textContent = template.pdfTitle;

  mount();
  hydrateInitialState();
}

async function generarPDF(state = AppState) {
  const template = getActiveTemplate();
  if (!template) {
    alert("Seleccione un documento antes de generar el PDF.");
    return;
  }

  const btnPrint = document.getElementById("btn-print");
  const savedChildren = [...btnPrint.childNodes];
  btnPrint.disabled = true;
  const spanGenerando = document.createElement('span');
  spanGenerando.className = 'text-[10px]';
  spanGenerando.textContent = 'Generando...';
  btnPrint.replaceChildren(spanGenerando);
  // ── Extracción de estado: cero accesos al DOM ────────────────────────────
  const getVal = (id) => (state?.form?.[id] || "-");

  // Datos de asistencia
  const fecha        = getVal("asistencia-fecha");
  const hora         = getVal("asistencia-hora");
  const tipoServicio = state.form['asistencia-tipo__text'] || "";

  // Filiación
  const nombrePaciente = getVal("paciente-nombre") || "—";
  const dniPaciente    = getVal("paciente-dni") || "—";
  const fechaNacimiento= getVal("paciente-nacimiento") || "—";
  const lugarAsistencia= getVal("lugar-asistencia") || "—";

  // Tutor Legal / Representante
  const checkDependencia = state?.form?.["check-dependencia"] || false;
  const inputNac         = getVal("paciente-nacimiento");
  const esMenor          = inputNac !== "-" ? calcularEdadExacta(inputNac) < 18 : false;
  const tutorFirma       = esMenor || checkDependencia;
  const tutorNombre      = tutorFirma ? getVal("paciente-tutor-nombre") : null;
  const tutorDni         = tutorFirma ? getVal("paciente-tutor-dni")    : null;

  // Evaluación clínica — alergias
  const selAlergiasVal  = state.form['select-alergias']       || '';
  const selAlergiasText = state.form['select-alergias__text'] || 'Sin alergias conocidas';
  const inputAlergiasText = getVal("input-alergias");
  const alergias = selAlergiasVal === 'sin_alergias' || !selAlergiasVal
    ? 'Sin alergias conocidas'
    : selAlergiasVal === 'otras'
      ? inputAlergiasText || 'Otras alergias (no especificadas)'
      : inputAlergiasText ? `${selAlergiasText} - ${inputAlergiasText}` : selAlergiasText;

  const antecedentes = getVal("antecedentes") || "—";
  const anamnesis    = getVal("anamnesis") || "—";
  const exploracion  = getVal("exploracion") || "—";
  const tratamiento  = getVal("tratamiento-textarea") || "—";
  const diagnostico  = getVal("diagnostico") || "—";

  // Plan
  const planActuacion   = state.form['select-plan__text'] || "—";
  const hospitalDestino = getVal("hospital-destino") || "—";

  // Constantes vitales — leídas del estado, no del DOM
  const constantesData = state.constantes.map((row, i) => [
    { text: `Toma ${i + 1}`, style: "tableLabel" },
    { text: row.hora || "—", style: "tableData" },
    { text: row.ta   || "—", style: "tableData" },
    { text: row.fc   || "—", style: "tableData" },
    { text: row.fr   || "—", style: "tableData" },
    { text: row.spo2 || "—", style: "tableData" },
    { text: row.temp || "—", style: "tableData" },
    { text: row.gluc || "—", style: "tableData" },
  ]);

  // Datos empresa (constantes corporativas)
  const empresa   = "U24 Servicios Sanitarios S.L";
  const cif       = "B04905394";
  const direccion = "Av. Mare Nostrum, 195, Sector 20, 04009 Almería - Tlf: 950 92 03 93";

  // Datos del facultativo — leídos del estado (campos con ID en #dynamic-content)
  const medico      = getVal("input_firma_nombre");
  const colegiado   = getVal("input_firma_num");
  const categoria   = getVal("input_firma_cat");
  const firmaNombre = medico;
  const firmaNum    = colegiado;
  const firmaCat    = categoria;

  // Firmas — SignaturePad es un objeto computado efímero, no dato de negocio serializable
  const firmaPacienteContent =
    SignatureState.paciente && !SignatureState.paciente.isEmpty()
      ? { image: SignatureState.paciente.toDataURL("image/png"), width: 220, height: 70, margin: [0,4,0,0] }
      : { text: "(Sin firma del paciente)", style: "firmaPendiente", margin: [0,10,0,0] };

  const firmaMedicoContent =
    SignatureState.medico && !SignatureState.medico.isEmpty()
      ? { image: SignatureState.medico.toDataURL("image/png"), width: 220, height: 70, margin: [0,4,0,0] }
      : { text: "Firmado digitalmente mediante certificado PAdES", italics: true, fontSize: 8, color: "#334155", margin: [0,10,0,0] };

  // Datos de negativa (alta voluntaria)
  const negSituacion = getVal("neg-situacion");
  const negPropuesta = getVal("neg-propuesta");
  const negRiesgos   = getVal("neg-riesgos");
  const sinMedico    = state.form["check-sin-medico"] || false;

  // Testigos — índice compartido con SignatureState para recuperar la firma
  const testigosData = state.testigos
    .map(({ index, nombre, dni }) => {
      const padEntry = SignatureState.testigos.find(t => t.index === index);
      const firmaContent = padEntry && !padEntry.pad.isEmpty()
        ? padEntry.pad.toDataURL("image/png")
        : null;
      return { nombre, dni, firmaContent };
    })
    .filter(({ nombre, dni, firmaContent }) => nombre || dni || firmaContent);

  // Construir docDefinition delegando el content a la plantilla activa
  const docDefinition = {
    pageSize: "A4",
    pageMargins: [40, 50, 40, 50],
    defaultStyle: { font: "Roboto", fontSize: 9, color: "#1e293b" },
    styles: template.styles,
    header: {
      margin: [40, 15, 40, 0],
      columns: [
        { text: template.pdfTitle, style: "titulo", width: "*" },
        {
          text: empresa
            ? [{ text: empresa + "\n", style: "empresaNombre" }, { text: (cif ? "CIF: " + cif + "   " : "") + (direccion || ""), style: "empresaDato" }]
            : "",
          width: 200,
          alignment: "right",
        },
      ],
    },
    footer: (currentPage, pageCount) => ({
      margin: [40, 0, 40, 10],
      text: [
        { text: `${template.pdfSubtitle}  ·  `, style: "footerText" },
        { text: `Página ${currentPage} de ${pageCount}`,   style: "footerText" },
      ],
    }),
    content: template.buildContent({
      fecha, hora, tipoServicio,
      nombrePaciente, dniPaciente, fechaNacimiento, lugarAsistencia,
      alergias, antecedentes, anamnesis, exploracion,
      tratamiento, diagnostico, planActuacion, hospitalDestino,
      constantesData,
      firmaPacienteContent, firmaMedicoContent,
      empresa, cif, direccion, medico, colegiado, categoria, firmaNombre, firmaNum, firmaCat,
      tutorNombre, tutorDni, tutorFirma,
      negSituacion, negPropuesta, negRiesgos,
      sinMedico, testigosData,
    }),
  };

  // Nombre de archivo dinámico: YYYY-MM-DDIniciales.pdf
  const nombreRaw = getVal("paciente-nombre") || "";
  const iniciales = nombreRaw.length > 0
    ? nombreRaw.replace(/\s+/g, " ").split(" ").map((p) => p[0].toUpperCase()).join("")
    : "ANONIMO";

  const fechaInput = getVal("asistencia-fecha") || "";
  let fechaFormateada;
  if (fechaInput) {
    fechaFormateada = fechaInput;
  } else {
    const hoy = new Date();
    fechaFormateada = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`;
  }

  try {
    await new Promise((resolve, reject) => {
      try {
        pdfMake.createPdf(docDefinition).download(`${fechaFormateada}${iniciales}.pdf`, resolve);
      } catch (err) {
        reject(err);
      }
    });
  } catch (e) {
    console.error("Error al generar el PDF:", e);
    alert("No se pudo generar el PDF. Por favor, inténtalo de nuevo.");
  } finally {
    btnPrint.disabled = false;
    btnPrint.replaceChildren(...savedChildren);
  }
}

// ── Sincronización DOM → AppState ────────────────────────────────────────

/**
 * Escribe el valor de un elemento de formulario en AppState.
 * Llamar DESPUÉS de cualquier normalización de valor (ej: limpieza numérica).
 * @param {HTMLElement} el
 */
function syncElementToState(el) {
  const constRow   = el.closest('.constantes-row');
  const testigoRow = el.closest('.testigo-row');

  if (constRow) {
    // Indexación geométrica: posición real del nodo en el DOM, sin depender
    // de dataset.constIdx que puede desincronizarse tras eliminaciones de filas.
    const idx = Array.from(constRow.parentElement.children).indexOf(constRow);
    if (!AppState.constantes[idx]) {
      AppState.constantes[idx] = { hora: '', ta: '', fc: '', fr: '', spo2: '', temp: '', gluc: '' };
    }
    const fieldMap = {
      'input-hora': 'hora', 'input-ta': 'ta', 'input-fc': 'fc', 'input-fr': 'fr',
      'input-spo2': 'spo2', 'input-temp': 'temp', 'input-gluc': 'gluc',
    };
    for (const [cls, key] of Object.entries(fieldMap)) {
      if (el.classList.contains(cls)) AppState.constantes[idx][key] = el.value.trim();
    }
    return;
  }

  if (testigoRow) {
    const idx   = parseInt(testigoRow.dataset.index, 10);
    const entry = AppState.testigos.find(t => t.index === idx);
    if (entry) {
      if (el.classList.contains('input-testigo-nombre')) entry.nombre = el.value.trim();
      if (el.classList.contains('input-testigo-dni'))    entry.dni    = el.value.trim();
    }
    return;
  }

  if (!el.id) return;
  AppState.form[el.id] = (el.type === 'checkbox' || el.type === 'radio')
    ? el.checked
    : el.value.trim();
  // Capturar también el texto visible de selects (necesario en alergias, plan, tipoServicio)
  if (el.tagName === 'SELECT') {
    AppState.form[el.id + '__text'] = el.selectedIndex > 0
      ? el.options[el.selectedIndex].text
      : '';
  }
}

// ── Smart Input — Constantes Vitales ─────────────────────────────────────

/**
 * Avanza el foco al siguiente input de la fila al pulsar Enter.
 * Hace blur() cuando se alcanza el último campo (input-gluc).
 * Llamado desde el delegador keydown de reportView.
 */
function handleConstantesKeydown(e) {
  if (e.key !== 'Enter') return;
  const row = e.target.closest('.constantes-row');
  if (!row) return;
  e.preventDefault();
  const inputs = Array.from(row.querySelectorAll('input'));
  const i = inputs.indexOf(e.target);
  if (i === -1) return;
  i < inputs.length - 1 ? inputs[i + 1].focus() : e.target.blur();
}

/**
 * Auto-formatea el valor tecleado y salta al siguiente campo cuando se
 * detecta que el valor está completo según reglas clínicas.
 *
 * Retorna true si el input pertenece a una .constantes-row y fue procesado
 * (incluyendo la llamada a syncElementToState). Retorna false en cualquier
 * otro caso para que el delegador aplique el sync genérico.
 */
function handleConstantesSmartInput(e) {
  const el  = e.target;
  const row = el.closest('.constantes-row');
  if (!row) return false;

  // Regla Cero: backspace → no alterar el valor, pero sí sincronizar.
  if (e.inputType === 'deleteContentBackward') {
    syncElementToState(el);
    return true;
  }

  const rowInputs = Array.from(row.querySelectorAll('input'));
  const next      = rowInputs[rowInputs.indexOf(el) + 1] ?? null;
  let   v         = el.value;

  if (el.classList.contains('input-ta')) {
    v = v.replace(/[^0-9/]/g, '');
    if (!v.includes('/')) {
      // Sistólica: auto-inserta "/" cuando el prefijo determina que está completa.
      if      (/^[12]/.test(v) && v.length === 3) v += '/';
      else if (/^[3-9]/.test(v) && v.length === 2) v += '/';
    } else {
      // Diastólica: avanza foco cuando el sufijo está completo.
      const dias = v.split('/')[1] ?? '';
      if      (/^1/.test(dias)   && dias.length === 3) next?.focus();
      else if (/^[2-9]/.test(dias) && dias.length === 2) next?.focus();
    }

  } else if (el.classList.contains('input-fc')) {
    v = v.replace(/\D/g, '');
    if ((/^[12]/.test(v) && v.length === 3) || (/^[3-9]/.test(v) && v.length === 2)) {
      next?.focus();
    }

  } else if (el.classList.contains('input-fr')) {
    v = v.replace(/\D/g, '');
    if (v.length === 2) next?.focus();

  } else if (el.classList.contains('input-spo2')) {
    v = v.replace(/\D/g, '');
    if (v === '100' || (/^[5-9]/.test(v) && v.length === 2)) next?.focus();

  } else if (el.classList.contains('input-temp')) {
    v = v.replace(/[^0-9.]/g, '');
    if (v.length === 2 && !v.includes('.')) {
      v += '.';
    } else if (v.includes('.')) {
      const dec = v.split('.')[1] ?? '';
      if (dec.length >= 1) next?.focus();
    }

  } else if (el.classList.contains('input-gluc')) {
    v = v.replace(/\D/g, '');

  } else {
    // Input dentro de la fila pero sin clase de constante conocida (ej. input-hora).
    // Se deja intacto; el delegador invocará syncElementToState normalmente.
    return false;
  }

  el.value = v;
  syncElementToState(el);
  return true;
}

// ── Eventos estáticos y delegación de componentes dinámicos ──────────────

function initStaticEvents() {
  const reportView = document.getElementById("report-view");

  // Delegación de clicks para acciones de componentes dinámicos
  reportView.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    switch (btn.dataset.action) {
      case "addConstantes":         addConstantes(); break;
      case "addTestigo":            addTestigo(); break;
      case "removeTestigo":         removeTestigo(btn, Number(btn.dataset.index)); break;
      case "clearTestigoSignature": clearTestigoSignature(Number(btn.dataset.index)); break;
      case "clearSignature":        clearSignature(btn.dataset.target); break;
      case "appendTratamiento":     appendTratamiento(); break;
      case "removeConstantesRow": {
        if (!confirm("¿Eliminar esta toma de constantes?")) break;
        const row = btn.closest('.constantes-row');
        const idx = Array.from(row.parentElement.children).indexOf(row);
        if (idx !== -1) AppState.constantes.splice(idx, 1);
        row.remove();
        break;
      }
    }
  });

  // Delegación de input: autoResize + smart-input de constantes + sync a AppState.
  // handleConstantesSmartInput devuelve true si procesó el input (y ya llamó a
  // syncElementToState internamente); false para cualquier otro campo, donde el
  // sync genérico se aplica aquí directamente.
  reportView.addEventListener("input", (e) => {
    if (e.target.tagName === "TEXTAREA") autoResize(e.target);
    if (!handleConstantesSmartInput(e)) syncElementToState(e.target);
  });

  // Delegación de keydown: Enter en .constantes-row avanza el foco entre campos.
  reportView.addEventListener("keydown", handleConstantesKeydown);

  // Selects, checkboxes y campos especiales disparan 'change', no 'input'.
  // onDynamicChange ruta los casos especiales antes de sincronizar al AppState.
  reportView.addEventListener("change", onDynamicChange);
}

// ── Inicialización (window.onload) ────────────────────────────────────────

window.onload = () => {
  setDefaultDateTime();
  populateDatalists();
  initStaticEvents();

  document.getElementById("btn-info").addEventListener("click", () => toggleView("instructions"));
  document.getElementById("btn-report").addEventListener("click", () => toggleView("report"));
  document.getElementById("btn-clear").addEventListener("click", clearReport);
  document.getElementById("btn-print").addEventListener("click", () => generarPDF());

  // Selector de plantilla
  const docSelector = document.getElementById("doc-selector");
  if (docSelector) {
    docSelector.addEventListener("change", switchTemplate);
  }

  switchTemplate(); // Renderizado inicial

  // Watchdog LOPDGDD/GDPR — purga de componentes propios de app.js al expirar sesión.
  // watchdog.js no puede importar app.js (evita dependencia circular), por lo que
  // delega la destrucción de SignaturePads y autocomplete mediante este CustomEvent.
  document.addEventListener('watchdog:session-expired', () => {
    destroySignaturePads();
    teardown();
  });
  WatchdogService.initWatchdog();

  window.addEventListener("beforeunload", (e) => {
    e.preventDefault();
    e.returnValue = "";
  });
};

