// =========================================================================
// app.js — DocuMed · Lógica de Aplicación
// Depende de: data.js (CIE10_DB, FARMACOS_DB, HOSPITALES_DB)
//             templates.js (DOC_TEMPLATES)
//             SignaturePad (CDN), pdfmake (CDN)
// =========================================================================

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

const CONFIG_KEYS = ["empresa", "cif", "direccion", "medico", "colegiado"];

function saveConfig() {
  CONFIG_KEYS.forEach((key) =>
    localStorage.setItem(`documed_${key}`, document.getElementById(`cfg_${key}`).value)
  );
  alert("Configuración guardada.");
  toggleView("report");
}

function loadConfig() {
  CONFIG_KEYS.forEach((key) => {
    const val = localStorage.getItem(`documed_${key}`);
    if (val) document.getElementById(`cfg_${key}`).value = val;
  });
  loadConfigToReport();
}

function loadConfigToReport() {
  CONFIG_KEYS.forEach((key) => {
    const displayEl = document.getElementById(`disp_${key}`);
    if (displayEl) displayEl.textContent = localStorage.getItem(`documed_${key}`) || "";
  });
  if (!localStorage.getItem("documed_empresa"))
    document.getElementById("disp_empresa").innerHTML =
      '<span class="text-red-500 no-print">⚠️ Configure los datos</span>';
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
  if (typeof window.testigoCounter === "undefined") window.testigoCounter = 0;
  if (!window.testigosPads) window.testigosPads = [];
  
  const index = window.testigoCounter++;
  const container = document.getElementById("testigos-container");
  container.insertAdjacentHTML('beforeend', UI_COMPONENTS.filaTestigo(index));
  
  const canvas = document.getElementById(`canvas-testigo-${index}`);
  const pad = new SignaturePad(canvas, { penColor: "rgb(15,23,42)", minWidth: 0.8, maxWidth: 2.5 });
  
  window.testigosPads.push({ index, pad, canvas });
  
  resizeCanvas(canvas, pad);
}

function removeTestigo(btn, index) {
  btn.closest('.testigo-row').remove();
  if (window.testigosPads) {
    window.testigosPads = window.testigosPads.filter(t => t.index !== index);
  }
}

function clearTestigoSignature(index) {
  if (window.testigosPads) {
    const tp = window.testigosPads.find(t => t.index === index);
    if (tp && tp.pad) tp.pad.clear();
  }
}


function clearReport() {
  if (confirm("¿Borrar todos los datos clínicos?")) {
    document.getElementById("clinical-form").reset();
    document
      .querySelectorAll("#constantes-container .constantes-row:not(:first-of-type)")
      .forEach((row) => row.remove());
    document.querySelectorAll(".testigo-row").forEach(row => row.remove());
    if (window.testigosPads) window.testigosPads = [];
    document.querySelectorAll("textarea").forEach((ta) => (ta.style.height = "auto"));
    setDefaultDateTime();
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
  
  if (input.parentElement && window.getComputedStyle(input.parentElement).position === "static") {
    input.parentElement.style.position = "relative";
  }

  const menuId = `ac-menu-${inputId}`;
  let menu = document.getElementById(menuId);
  if (!menu) {
    menu = document.createElement("ul");
    menu.id = menuId;
    menu.className = "absolute z-50 w-full bg-white border border-slate-300 rounded shadow-lg max-h-40 overflow-y-auto hidden text-xs text-slate-800";
    input.parentNode.insertBefore(menu, input.nextSibling);
  }

  let blurTimeout;

  input.addEventListener("input", (e) => {
    const val = e.target.value;
    const parts = isMulti ? val.split(",") : [val];
    const currentFragment = parts[parts.length - 1].trim();

    if (currentFragment.length >= 2) {
      const normalizedFragment = normalizeText(currentFragment);
      const matches = database.filter(item => normalizeText(item).includes(normalizedFragment));
      
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
    } else {
      menu.classList.add("hidden");
    }
  });

  input.addEventListener("blur", () => {
    blurTimeout = setTimeout(() => {
      menu.classList.add("hidden");
    }, 150);
  });

  input.addEventListener("focus", () => {
    clearTimeout(blurTimeout);
  });
}

// ── Datalists (CIE-10, Fármacos, Hospitales) ────────────────────────────

function populateDatalists() {
  const container = document.getElementById("datalists-container");
  const htmlHospitales = `<datalist id="dl_hospitales"></datalist>`;
  container.innerHTML = htmlHospitales;
}

function updateHospitalesDatalist() {
  const provincia     = document.getElementById("provincia-selector").value;
  const dlHospitales  = document.getElementById("dl_hospitales");
  const inputHospital = document.getElementById("hospital-destino");
  dlHospitales.innerHTML = "";
  inputHospital.value    = "";
  if (provincia && HOSPITALES_DB[provincia]) {
    HOSPITALES_DB[provincia].forEach((hospital) => {
      const opt = document.createElement("option");
      opt.value = hospital;
      dlHospitales.appendChild(opt);
    });
  }
}

// ── Firmas (SignaturePad + canvas Retina) ────────────────────────────────

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
  if (type === "paciente") window.padPaciente && window.padPaciente.clear();
  if (type === "medico")   window.padMedico   && window.padMedico.clear();
}

function initSignaturePads() {
  const canvasPaciente = document.getElementById("canvas-paciente");
  const canvasMedico   = document.getElementById("canvas-medico");

  if (canvasPaciente) window.padPaciente = new SignaturePad(canvasPaciente, { penColor: "rgb(15,23,42)", minWidth: 0.8, maxWidth: 2.5 });
  if (canvasMedico) window.padMedico   = new SignaturePad(canvasMedico,   { penColor: "rgb(15,23,42)", minWidth: 0.8, maxWidth: 2.5 });

  if (canvasPaciente) resizeCanvas(canvasPaciente, window.padPaciente);
  if (canvasMedico) resizeCanvas(canvasMedico,   window.padMedico);

  window.testigosPads = [];
  window.testigoCounter = 0;

  if (!window.resizeListenerAdded) {
    window.addEventListener("resize", () => {
      const cp = document.getElementById("canvas-paciente");
      const cm = document.getElementById("canvas-medico");
      if (cp && window.padPaciente) resizeCanvas(cp, window.padPaciente);
      if (cm && window.padMedico) resizeCanvas(cm, window.padMedico);
      if (window.testigosPads) {
        window.testigosPads.forEach(t => {
          if (t.canvas && document.body.contains(t.canvas)) {
            resizeCanvas(t.canvas, t.pad);
          }
        });
      }
    });
    window.resizeListenerAdded = true;
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

  const fechaNac = new Date(inputNacimiento.value);
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
    const fn = new Date(inputNac);
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

  // Configuración empresa
  const empresa   = localStorage.getItem("documed_empresa")   || "";
  const cif       = localStorage.getItem("documed_cif")       || "";
  const direccion = localStorage.getItem("documed_direccion") || "";
  const medico    = localStorage.getItem("documed_medico")    || "";
  const colegiado = localStorage.getItem("documed_colegiado") || "";

  // Firmas
  const firmaPacienteContent =
    window.padPaciente && !window.padPaciente.isEmpty()
      ? { image: window.padPaciente.toDataURL("image/png"), width: 220, height: 70, margin: [0,4,0,0] }
      : { text: "(Sin firma del paciente)", style: "firmaPendiente", margin: [0,10,0,0] };

  const firmaMedicoContent =
    window.padMedico && !window.padMedico.isEmpty()
      ? { image: window.padMedico.toDataURL("image/png"), width: 220, height: 70, margin: [0,4,0,0] }
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
    if (canvas && window.testigosPads) {
      const match = window.testigosPads.find(t => t.canvas === canvas);
      if (match && match.pad && !match.pad.isEmpty()) {
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
      empresa, cif, direccion, medico, colegiado,
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

  pdfMake.createPdf(docDefinition).download(`${fechaFormateada}${iniciales}.pdf`);
}

// ── Inicialización (window.onload) ────────────────────────────────────────

window.onload = () => {
  loadConfig();
  setDefaultDateTime();
  populateDatalists();

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

  // Service Worker (PWA offline)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }
};
