// =========================================================================
// app.js — DocuMed · Lógica de Aplicación
// =========================================================================
import SignaturePad from 'signature_pad';
import pdfMake from 'pdfmake/build/pdfmake';
import { CIE10_DB, FARMACOS_DB, HOSPITALES_DB } from './data.js';
import { DOC_TEMPLATES } from './templates.js';
import { UI_COMPONENTS } from './components.js';

// ── Estado de módulo — Firmas ─────────────────────────────────────────────

const SignatureState = {
  paciente: null,
  medico:   null,
  testigos: [],
  counter:  0,
};
let resizeListenerAdded = false;

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
  document.getElementById("config-view").classList.toggle("hidden", view !== "config");
  document.getElementById("report-view").classList.toggle("hidden", view !== "report");
  document.getElementById("instructions-view").classList.toggle("hidden", view !== "instructions");
  if (view === "report") loadConfigToReport();
}

// ── Persistencia (localStorage) ──────────────────────────────────────────

const CONFIG_KEYS = ["medico", "colegiado", "categoria"];

function saveConfig() {
  try {
    CONFIG_KEYS.forEach((key) =>
      localStorage.setItem(`documed_${key}`, document.getElementById(`cfg_${key}`).value)
    );
    alert("Configuración guardada.");
  } catch (e) {
    console.error("Error al guardar configuración:", e);
    alert("No se pudo guardar la configuración. El almacenamiento local no está disponible.");
  }
  toggleView("report");
}

function loadConfig() {
  try {
    CONFIG_KEYS.forEach((key) => {
      const val = localStorage.getItem(`documed_${key}`);
      if (val) document.getElementById(`cfg_${key}`).value = val;
    });
  } catch (e) {
    console.warn("localStorage no disponible; configuración omitida.", e);
  }
  loadConfigToReport();
}

function loadConfigToReport() {
  try {
    CONFIG_KEYS.forEach((key) => {
      const displayEl = document.getElementById(`disp_${key}`);
      if (displayEl) displayEl.textContent = localStorage.getItem(`documed_${key}`) || "";
    });

    // Cabecera de firma: mostrar config guardada o inputs manuales
    const hasMedico = !!localStorage.getItem("documed_medico");
    const dispInfo  = document.getElementById("disp_firma_info");
    const manualInputs = document.getElementById("firma-manual-inputs");
    if (dispInfo)      dispInfo.classList.toggle("hidden", !hasMedico);
    if (manualInputs)  manualInputs.classList.toggle("hidden", hasMedico);
    // Actualizar colegiado y categoría en los spans de display
    const dispCol = document.getElementById("disp_colegiado");
    if (dispCol) dispCol.textContent = localStorage.getItem("documed_colegiado") || "";
    const dispCat = document.getElementById("disp_categoria");
    if (dispCat) dispCat.textContent = localStorage.getItem("documed_categoria") || "";
  } catch (e) {
    console.warn("No se pudo cargar configuración en el reporte.", e);
  }
}

// ── Formulario clínico ───────────────────────────────────────────────────

function setDefaultDateTime() {
  const now = new Date();
  const dateEl = document.querySelector('input[type="date"]');
  const timeEl = document.querySelector('input[type="time"]');
  if (dateEl) dateEl.value = now.toISOString().split("T")[0];
  if (timeEl) timeEl.value = now.toTimeString().substring(0, 5);
}

function addConstantes() {
  const clone = document.getElementById("constantes-row-template").content.cloneNode(true);
  document.getElementById("constantes-container").appendChild(clone);
}

function addTestigo() {
  const index = SignatureState.counter++;
  const container = document.getElementById("testigos-container");
  container.insertAdjacentHTML('beforeend', UI_COMPONENTS.filaTestigo(index));

  const canvas = document.getElementById(`canvas-testigo-${index}`);
  const pad = new SignaturePad(canvas, { penColor: "rgb(15,23,42)", minWidth: 0.8, maxWidth: 2.5 });

  SignatureState.testigos.push({ index, pad, canvas });

  resizeCanvas(canvas, pad);
}

function removeTestigo(btn, index) {
  const entry = SignatureState.testigos.find(t => t.index === index);
  if (entry) entry.pad.off();
  SignatureState.testigos = SignatureState.testigos.filter(t => t.index !== index);
  btn.closest('.testigo-row').remove();
}

function clearTestigoSignature(index) {
  const tp = SignatureState.testigos.find(t => t.index === index);
  if (tp) tp.pad.clear();
}


function clearReport() {
  if (confirm("¿Borrar todos los datos clínicos?")) {
    destroySignaturePads();
    document.getElementById("clinical-form").reset();
    document
      .querySelectorAll("#constantes-container .constantes-row:not(:first-of-type)")
      .forEach((row) => row.remove());
    document.querySelectorAll(".testigo-row").forEach(row => row.remove());
    document.querySelectorAll("textarea").forEach((ta) => (ta.style.height = "auto"));
    setDefaultDateTime();
    initSignaturePads();
  }
}

function appendTratamiento() {
  const farmaco  = document.getElementById("farmaco-input");
  const dosis    = document.getElementById("dosis-input");
  const via      = document.getElementById("via-input");
  const textarea = document.getElementById("tratamiento-textarea");
  if (!farmaco.value) return;
  textarea.value += `- ${farmaco.value} (${dosis.value || "S/D"}) Vía: ${via.value}\n`;
  autoResize(textarea);
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
  }

  if (input._acController) input._acController.abort();
  const controller = new AbortController();
  input._acController = controller;
  const { signal } = controller;

  let blurTimeout;

  // Extraemos la lógica a una función para poder llamarla al hacer clic o escribir
  function renderMenu() {
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

        li.addEventListener("mousedown", (evt) => {
          evt.preventDefault();
        });

        li.addEventListener("click", () => {
          if (isMulti) {
            parts[parts.length - 1] = " " + match;
            input.value = parts.join(",").trim() + ", ";
          } else {
            input.value = match;
          }
          menu.classList.add("hidden");
          input.focus();
        });
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
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const rect  = canvas.parentElement.getBoundingClientRect();
  canvas.width  = rect.width  * ratio;
  canvas.height = rect.height * ratio;
  canvas.style.width  = rect.width  + "px";
  canvas.style.height = rect.height + "px";
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

  if (!resizeListenerAdded) {
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
    resizeListenerAdded = true;
  }
}

// ── Lógica de Tutor Legal ────────────────────────────────────────────────

function checkAge() {
  const inputNacimiento = document.getElementById("paciente-nacimiento");
  const bloqueTutor = document.getElementById("bloque-tutor");
  const contenedorDependencia = document.getElementById("contenedor-dependencia");
  const checkDependencia = document.getElementById("check-dependencia");
  const labelFirmaPaciente = document.getElementById("label-firma-paciente");

  if (!inputNacimiento || !inputNacimiento.value) return;

  const fechaNac = parseLocalDate(inputNacimiento.value);
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const m = hoy.getMonth() - fechaNac.getMonth();
  
  if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) {
    edad--;
  }

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


// ── Renderizado Dinámico ────────────────────────────────────────────────
function getFormData() {
  const container = document.getElementById("dynamic-content");
  if (!container) return {};
  
  const data = {};
  const elements = container.querySelectorAll("input, select, textarea");
  elements.forEach((el) => {
    if (el.id) {
      if (el.type === "checkbox" || el.type === "radio") {
        data[el.id] = el.checked;
      } else {
        data[el.id] = el.value.trim();
      }
    }
  });
  return data;
}

function rebindGlobalEvents() {
  // 1. Inicializar Datalist de Provincias (si la plantilla lo requiere)
  const provSelector = document.getElementById("provincia-selector");
  if (provSelector && provSelector.options.length <= 1) {
    Object.keys(HOSPITALES_DB).sort().forEach((prov) => {
      const opt = document.createElement("option");
      opt.value = prov;
      opt.textContent = prov;
      provSelector.appendChild(opt);
    });
  }

  // 2. Inicializar Motor de Firmas Biométricas
  initSignaturePads();

  // 3. Reasignar eventos nativos del DOM
  const checkSinMedico = document.getElementById("check-sin-medico");
  if (checkSinMedico) {
    checkSinMedico.addEventListener("change", (e) => {
      const camposTestigos = document.getElementById("campos-testigos");
      const labelFirmaFacultativo = document.getElementById("label-firma-facultativo");
      const dispMedico = document.getElementById("disp_medico");
      const dispColegiadoContainer = document.getElementById("disp_colegiado_container");
      
      if (e.target.checked) {
        if (camposTestigos) camposTestigos.classList.remove("hidden");
        if (labelFirmaFacultativo) labelFirmaFacultativo.textContent = "Firma Testigos";
        if (dispMedico) dispMedico.classList.add("hidden");
        if (dispColegiadoContainer) dispColegiadoContainer.classList.add("hidden");
      } else {
        if (camposTestigos) camposTestigos.classList.add("hidden");
        if (labelFirmaFacultativo) labelFirmaFacultativo.textContent = "Facultativo";
        if (dispMedico) dispMedico.classList.remove("hidden");
        if (dispColegiadoContainer) dispColegiadoContainer.classList.remove("hidden");
      }
    });
  }

  const nacimientoInput = document.getElementById("paciente-nacimiento");
  if (nacimientoInput) {
    nacimientoInput.addEventListener("change", checkAge);
  }

  const checkDependencia = document.getElementById("check-dependencia");
  if (checkDependencia) {
    checkDependencia.addEventListener("change", (e) => {
      const bloqueTutor = document.getElementById("bloque-tutor");
      const labelFirmaPaciente = document.getElementById("label-firma-paciente");
      if (e.target.checked) {
        if (bloqueTutor) bloqueTutor.classList.remove("hidden");
        if (labelFirmaPaciente) labelFirmaPaciente.textContent = "Firma del Representante Legal";
      } else {
        if (bloqueTutor) bloqueTutor.classList.add("hidden");
        if (labelFirmaPaciente) labelFirmaPaciente.textContent = "Firma del Paciente";
      }
    });
  }

  // 4. Autocompletado Predictivo
  initMultiAutocomplete("diagnostico", CIE10_DB, true);
  initMultiAutocomplete("input-alergias", FARMACOS_DB, true);
  initMultiAutocomplete("farmaco-input", FARMACOS_DB, false);
}

// ── Selector de plantilla ────────────────────────────────────────────────

function getActiveTemplate() {
  const sel = document.getElementById("doc-selector");
  if (!sel || !sel.value) return null; // Permite el estado nulo
  return DOC_TEMPLATES[sel.value];
}

function switchTemplate() {
  destroySignaturePads();
  const template = getActiveTemplate();

  const dynamicContainer = document.getElementById("dynamic-content");
  const mainTitle = document.querySelector("#report-view h1");

  if (!template) {
    if (dynamicContainer) {
      dynamicContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center p-16 text-slate-400 min-h-[50vh]">
          <img src="./icon-512.png" alt="DocuMed" class="w-32 h-32 opacity-20 mb-6 grayscale" />
          <p class="text-xs uppercase tracking-widest font-semibold">Seleccione un documento para comenzar</p>
        </div>
      `;
    }
    if (mainTitle) mainTitle.textContent = "DOCUMED";
    return;
  }

  if (dynamicContainer && template.getSections) {
    dynamicContainer.innerHTML = template.getSections().join("");
  }

  if (mainTitle) mainTitle.textContent = template.pdfTitle;

  rebindGlobalEvents();
}

async function generarPDF() {
  const template = getActiveTemplate();
  if (!template) {
    alert("Seleccione un documento antes de generar el PDF.");
    return;
  }

  const btnPrint = document.getElementById("btn-print");
  const originalHTML = btnPrint.innerHTML;
  btnPrint.disabled = true;
  btnPrint.innerHTML = `<span class="text-[10px]">Generando...</span>`;
  const formData = getFormData();
  const getVal   = (id) => (formData[id] || "");

  // Datos de asistencia
  const fecha        = getVal("asistencia-fecha");
  const hora         = getVal("asistencia-hora");
  const tipoServEl  = document.getElementById("asistencia-tipo");
  const tipoServicio = tipoServEl && tipoServEl.selectedIndex > 0 ? tipoServEl.options[tipoServEl.selectedIndex].text : "";

  // Filiación
  const nombrePaciente = getVal("paciente-nombre") || "—";
  const dniPaciente    = getVal("paciente-dni") || "—";
  const fechaNacimiento= getVal("paciente-nacimiento") || "—";
  const lugarAsistencia= getVal("lugar-asistencia") || "—";

  // Tutor Legal / Representante
  const tutorNombre = getVal("paciente-tutor-nombre");
  const tutorDni    = getVal("paciente-tutor-dni");
  
  const checkDependencia = formData["check-dependencia"] || false;
  let esMenor = false;
  const inputNac = getVal("paciente-nacimiento");
  if (inputNac) {
    const fn = parseLocalDate(inputNac);
    const h = new Date();
    let ed = h.getFullYear() - fn.getFullYear();
    if (h.getMonth() < fn.getMonth() || (h.getMonth() === fn.getMonth() && h.getDate() < fn.getDate())) ed--;
    if (ed < 18) esMenor = true;
  }
  const tutorFirma = esMenor || checkDependencia;

  // Evaluación clínica
  const selectAlergias = document.getElementById("select-alergias");
  let alergias = "Sin alergias conocidas";
  if (selectAlergias) {
    const selVal  = selectAlergias.value;
    const selText = selectAlergias.options[selectAlergias.selectedIndex]?.text || "Sin alergias conocidas";
    const inputText = getVal("input-alergias");

    if (selVal === "sin_alergias") {
      alergias = "Sin alergias conocidas";
    } else if (selVal === "otras") {
      alergias = inputText ? inputText : "Otras alergias (no especificadas)";
    } else {
      alergias = inputText ? `${selText} - ${inputText}` : selText;
    }
  }
  const antecedentes= getVal("antecedentes") || "—";
  const anamnesis   = getVal("anamnesis") || "—";
  const exploracion = getVal("exploracion") || "—";
  const tratamiento = getVal("tratamiento-textarea") || "—";
  const diagnostico = getVal("diagnostico") || "—";

  // Plan
  const selectPlan  = document.getElementById("select-plan");
  const planActuacion = (selectPlan && selectPlan.selectedIndex > 0)
                        ? selectPlan.options[selectPlan.selectedIndex].text
                        : "—";
  const hospitalDestino = getVal("hospital-destino") || "—";

  // Constantes vitales
  const constRows = document.querySelectorAll(".constantes-row");
  const constantesData = [];
  constRows.forEach((row, i) => {
    const vals = row.querySelectorAll("input");
    if (vals.length >= 5) {
      const v0 = vals[0] ? vals[0].value.trim() : "";
      const v1 = vals[1] ? vals[1].value.trim() : "";
      const v2 = vals[2] ? vals[2].value.trim() : "";
      const v3 = vals[3] ? vals[3].value.trim() : "";
      const v4 = vals[4] ? vals[4].value.trim() : "";
      constantesData.push([
        { text: i === 0 ? "Toma 1" : `Toma ${i + 1}`, style: "tableLabel" },
        { text: v0 || "—", style: "tableData" },
        { text: v1 || "—", style: "tableData" },
        { text: v2 || "—", style: "tableData" },
        { text: v3 || "—", style: "tableData" },
        { text: v4 || "—", style: "tableData" },
      ]);
    }
  });

  // Datos empresa (constantes corporativas)
  const empresa   = "U24 Servicios Sanitarios S.L";
  const cif       = "B04905394";
  const direccion = "Av. Mare Nostrum, 195, Sector 20, 04009 Almería - Tlf: 950 92 03 93";

  // Configuración del facultativo
  const medico    = localStorage.getItem("documed_medico")    || "";
  const colegiado = localStorage.getItem("documed_colegiado") || "";
  const categoria = localStorage.getItem("documed_categoria") || "";

  // Campos manuales de firma (visibles cuando no hay config guardada)
  const firmaNombre = (document.getElementById("input_firma_nombre")?.value || "").trim();
  const firmaNum    = (document.getElementById("input_firma_num")?.value    || "").trim();
  const firmaCat    = (document.getElementById("input_firma_cat")?.value    || "").trim();

  // Firmas
  const firmaPacienteContent =
    SignatureState.paciente && !SignatureState.paciente.isEmpty()
      ? { image: SignatureState.paciente.toDataURL("image/png"), width: 220, height: 70, margin: [0,4,0,0] }
      : { text: "(Sin firma del paciente)", style: "firmaPendiente", margin: [0,10,0,0] };

  const firmaMedicoContent =
    SignatureState.medico && !SignatureState.medico.isEmpty()
      ? { image: SignatureState.medico.toDataURL("image/png"), width: 220, height: 70, margin: [0,4,0,0] }
      : { text: "Firmado digitalmente mediante certificado PAdES", italics: true, fontSize: 8, color: "#334155", margin: [0,10,0,0] };

  // Datos de negativa (alta voluntaria)
  const negSituacion   = getVal("neg-situacion");
  const negPropuesta   = getVal("neg-propuesta");
  const negRiesgos     = getVal("neg-riesgos");
  const sinMedico      = formData["check-sin-medico"] || false;
  
  // Testigos dinámicos
  const testigoRows = document.querySelectorAll(".testigo-row");
  const testigosData = [];
  testigoRows.forEach((row) => {
    const nombre = row.querySelector(".input-testigo-nombre")?.value.trim();
    const dni = row.querySelector(".input-testigo-dni")?.value.trim();
    
    let firmaContent = null;
    const canvas = row.querySelector("canvas");
    if (canvas) {
      const match = SignatureState.testigos.find(t => t.canvas === canvas);
      if (match && !match.pad.isEmpty()) {
        firmaContent = match.pad.toDataURL("image/png");
      }
    }
    
    if (nombre || dni || firmaContent) {
      testigosData.push({ nombre, dni, firmaContent });
    }
  });

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
    btnPrint.innerHTML = originalHTML;
  }
}

// ── Eventos estáticos y delegación de componentes dinámicos ──────────────

function initStaticEvents() {
  document.getElementById("btn-save-config").addEventListener("click", saveConfig);

  document.getElementById("report-view").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    switch (btn.dataset.action) {
      case "addConstantes":         addConstantes(); break;
      case "addTestigo":            addTestigo(); break;
      case "removeTestigo":         removeTestigo(btn, Number(btn.dataset.index)); break;
      case "clearTestigoSignature": clearTestigoSignature(Number(btn.dataset.index)); break;
      case "clearSignature":        clearSignature(btn.dataset.target); break;
    }
  });
}

// ── Inicialización (window.onload) ────────────────────────────────────────

window.onload = () => {
  loadConfig();
  setDefaultDateTime();
  populateDatalists();
  initStaticEvents();

  document.getElementById("btn-info").addEventListener("click", () => toggleView("instructions"));
  document.getElementById("btn-config").addEventListener("click", () => toggleView("config"));
  document.getElementById("btn-report").addEventListener("click", () => toggleView("report"));
  document.getElementById("btn-clear").addEventListener("click", clearReport);
  document.getElementById("btn-print").addEventListener("click", generarPDF);



  // Selector de plantilla
  const docSelector = document.getElementById("doc-selector");
  if (docSelector) {
    docSelector.addEventListener("change", switchTemplate);
  }

  switchTemplate(); // Renderizado inicial

  window.addEventListener("beforeunload", (e) => {
    e.preventDefault();
    e.returnValue = "";
  });
};

// Las funciones de components.js y index.html ya no necesitan window.*:
// están vinculadas via initStaticEvents() + event delegation.
// Estas 3 se mantienen porque doc_*.js contienen oninput/onclick inline que las referencian.
window.autoResize               = autoResize;
window.appendTratamiento        = appendTratamiento;
window.updateHospitalesDatalist = updateHospitalesDatalist;
