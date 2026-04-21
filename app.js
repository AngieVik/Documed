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

function clearReport() {
  if (confirm("¿Borrar todos los datos clínicos?")) {
    document.getElementById("clinical-form").reset();
    document
      .querySelectorAll("#constantes-container .constantes-row:not(:first-of-type)")
      .forEach((row) => row.remove());
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

// ── Datalists (CIE-10, Fármacos, Hospitales) ────────────────────────────

function populateDatalists() {
  const container = document.getElementById("datalists-container");

  let htmlCie10 = `<datalist id="dl_cie10">`;
  CIE10_DB.forEach((item) => (htmlCie10 += `<option value="${item}">`));
  htmlCie10 += `</datalist>`;

  let htmlFarmacos = `<datalist id="dl_farmacos">`;
  FARMACOS_DB.forEach((item) => (htmlFarmacos += `<option value="${item}">`));
  htmlFarmacos += `</datalist>`;

  const htmlHospitales = `<datalist id="dl_hospitales"></datalist>`;

  container.innerHTML = htmlCie10 + htmlFarmacos + htmlHospitales;

  const provSelector = document.getElementById("provincia-selector");
  Object.keys(HOSPITALES_DB).sort().forEach((prov) => {
    const opt = document.createElement("option");
    opt.value = prov;
    opt.textContent = prov;
    provSelector.appendChild(opt);
  });
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

  window.padPaciente = new SignaturePad(canvasPaciente, { penColor: "rgb(15,23,42)", minWidth: 0.8, maxWidth: 2.5 });
  window.padMedico   = new SignaturePad(canvasMedico,   { penColor: "rgb(15,23,42)", minWidth: 0.8, maxWidth: 2.5 });

  resizeCanvas(canvasPaciente, window.padPaciente);
  resizeCanvas(canvasMedico,   window.padMedico);

  window.addEventListener("resize", () => {
    resizeCanvas(canvasPaciente, window.padPaciente);
    resizeCanvas(canvasMedico,   window.padMedico);
  });
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


// ── Selector de plantilla ────────────────────────────────────────────────

function getActiveTemplate() {
  const sel = document.getElementById("doc-selector");
  const id  = sel ? sel.value : "informe_medico";
  return DOC_TEMPLATES[id] || DOC_TEMPLATES["informe_medico"];
}

function switchTemplate() {
  const template = getActiveTemplate();

  // 1. Ocultar todas las secciones primero
  document.querySelectorAll(".section-block").forEach(block => {
    block.classList.add("hidden");
  });

  // 2. Mostrar solo las que están en el array visibleSections de la plantilla
  if (template.visibleSections) {
    template.visibleSections.forEach(secId => {
      const el = document.getElementById(secId);
      if (el) el.classList.remove("hidden");
    });
  }

  // 3. Cambiar el título visual de la página
  const mainTitle = document.querySelector("#report-view h1");
  if (mainTitle) mainTitle.textContent = template.pdfTitle;

  // 4. Actualizar etiqueta dinámica
  const labelFirma = document.getElementById("label-firma-facultativo");
  if (labelFirma) {
    labelFirma.textContent = template.id === "alta_voluntaria" ? "Testigos" : "Facultativo";
  }

  // 5. Resetear estado del toggle y testigos
  const checkSinMedico = document.getElementById("check-sin-medico");
  if (checkSinMedico) checkSinMedico.checked = false;
  const camposTestigos = document.getElementById("campos-testigos");
  if (camposTestigos) camposTestigos.classList.add("hidden");
}

// ── Motor de generación de PDF ───────────────────────────────────────────

async function generarPDF() {
  const template = getActiveTemplate();
  const getVal   = (el) => (el ? el.value.trim() : "");

  // Datos de asistencia
  const fechaEl     = document.querySelector('#clinical-form input[type="date"]');
  const horaEl      = document.querySelector('#clinical-form input[type="time"]');
  const tipoServEl  = document.querySelector("#clinical-form select");
  const fecha        = fechaEl ? fechaEl.value : "";
  const hora         = horaEl  ? horaEl.value  : "";
  const tipoServicio = tipoServEl ? tipoServEl.options[tipoServEl.selectedIndex]?.text || "" : "";

  // Filiación
  const nombrePaciente = getVal(document.getElementById("paciente-nombre")) || "—";
  const dniPaciente    = getVal(document.getElementById("paciente-dni")) || "—";
  const fechaNacimiento= getVal(document.getElementById("paciente-nacimiento")) || "—";
  const lugarAsistencia= getVal(document.getElementById("lugar-asistencia")) || "—";

  // Tutor Legal / Representante
  const tutorNombre = getVal(document.getElementById("paciente-tutor-nombre"));
  const tutorDni    = getVal(document.getElementById("paciente-tutor-dni"));
  
  const checkDependencia = document.getElementById("check-dependencia")?.checked || false;
  let esMenor = false;
  const inputNac = document.getElementById("paciente-nacimiento");
  if (inputNac && inputNac.value) {
    const fn = new Date(inputNac.value);
    const h = new Date();
    let ed = h.getFullYear() - fn.getFullYear();
    if (h.getMonth() < fn.getMonth() || (h.getMonth() === fn.getMonth() && h.getDate() < fn.getDate())) ed--;
    if (ed < 18) esMenor = true;
  }
  const tutorFirma = esMenor || checkDependencia;

  // Evaluación clínica
  const textareas   = document.querySelectorAll("#clinical-form textarea");
  const selectAlergias = document.querySelector('#clinical-form select[class*="red"]');
  const inputAlergias = document.getElementById("input-alergias");
  
  let alergias = "Sin alergias conocidas";
  if (selectAlergias) {
    const selVal = selectAlergias.value;
    const selText = selectAlergias.options[selectAlergias.selectedIndex]?.text || "Sin alergias conocidas";
    const inputText = getVal(inputAlergias);
    
    if (selVal === "sin_alergias") {
      alergias = "Sin alergias conocidas";
    } else if (selVal === "otras") {
      alergias = inputText ? inputText : "Otras alergias (no especificadas)";
    } else {
      alergias = inputText ? `${selText} - ${inputText}` : selText;
    }
  }
  const antecedentes= getVal(textareas[0]) || "—";
  const anamnesis   = getVal(textareas[1]) || "—";
  const exploracion = getVal(textareas[2]) || "—";
  const tratamiento = getVal(document.getElementById("tratamiento-textarea")) || "—";
  const diagnostico = getVal(document.querySelector('#clinical-form input[list="dl_cie10"]')) || "—";

  // Plan
  const planSelects  = document.querySelectorAll("#clinical-form select");
  const planIdx      = planSelects.length >= 2 ? planSelects[1] : null;
  let planActuacion  = planIdx ? planIdx.options[planIdx.selectedIndex]?.text : "";
  planActuacion = planActuacion || "—";
  const hospitalDestino = getVal(document.getElementById("hospital-destino")) || "—";

  // Constantes vitales
  const constRows = document.querySelectorAll(".constantes-row");
  const constantesData = [];
  constRows.forEach((row, i) => {
    const vals = row.querySelectorAll("input");
    if (vals.length >= 5) {
      constantesData.push([
        { text: i === 0 ? "Toma 1" : `Toma ${i + 1}`, style: "tableLabel" },
        { text: getVal(vals[0]) || "—", style: "tableData" },
        { text: getVal(vals[1]) || "—", style: "tableData" },
        { text: getVal(vals[2]) || "—", style: "tableData" },
        { text: getVal(vals[3]) || "—", style: "tableData" },
        { text: getVal(vals[4]) || "—", style: "tableData" },
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
  const negSituacion   = getVal(document.getElementById("neg-situacion"));
  const negPropuesta   = getVal(document.getElementById("neg-propuesta"));
  const negRiesgos     = getVal(document.getElementById("neg-riesgos"));
  const sinMedico      = document.getElementById("check-sin-medico")?.checked || false;
  const testigo1Nombre = getVal(document.getElementById("testigo1-nombre"));
  const testigo1Dni    = getVal(document.getElementById("testigo1-dni"));
  const testigo2Nombre = getVal(document.getElementById("testigo2-nombre"));
  const testigo2Dni    = getVal(document.getElementById("testigo2-dni"));

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
      sinMedico, testigo1Nombre, testigo1Dni, testigo2Nombre, testigo2Dni,
    }),
  };

  // Nombre de archivo dinámico: YYYY-MM-DDIniciales.pdf
  const nombreRaw = (document.getElementById("paciente-nombre")?.value || "").trim();
  const iniciales = nombreRaw.length > 0
    ? nombreRaw.replace(/\s+/g, " ").split(" ").map((p) => p[0].toUpperCase()).join("")
    : "ANONIMO";

  const fechaInput = document.getElementById("asistencia-fecha")?.value || "";
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

  initSignaturePads();

  // Selector de plantilla
  const docSelector = document.getElementById("doc-selector");
  if (docSelector) {
    docSelector.addEventListener("change", switchTemplate);
  }

  // Toggle testigos sanitarios
  const checkSinMedico = document.getElementById("check-sin-medico");
  if (checkSinMedico) {
    checkSinMedico.addEventListener("change", (e) => {
      const camposTestigos = document.getElementById("campos-testigos");
      if (camposTestigos) {
        if (e.target.checked) camposTestigos.classList.remove("hidden");
        else camposTestigos.classList.add("hidden");
      }
    });
  }

  // Lógica de Tutor y Dependencia
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

  switchTemplate(); // Renderizado inicial

  // Service Worker (PWA offline)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }
};
