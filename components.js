const INFO_TESTIGOS_LEGAL = "Los abajo firmantes, en calidad de testigos sanitarios, dan fe de la negativa del paciente tras haber sido debidamente informado.";

const CLAUSULA_LEGAL_HTML = `<strong>CLÁUSULA LEGAL</strong> (<strong>Ley 41/2002</strong> de Autonomía del Paciente)<br />El/la paciente identificado/a supra, en pleno uso de sus facultades y tras haber sido debidamente informado/a de su situación clínica, de las actuaciones propuestas por el equipo sanitario y de las posibles consecuencias derivadas de su no aceptación, <strong>DECLARA EXPRESAMENTE</strong> su negativa a recibir el tratamiento o traslado indicado, ejerciendo el derecho reconocido en el artículo 2.4 de la <strong>Ley 41/2002</strong>, de 14 de noviembre, básica reguladora de la autonomía del paciente. El equipo asistente queda exonerado de toda responsabilidad derivada de la presente negativa, habiendo cumplido con su deber de información conforme al artículo 4 de la citada Ley.`;

const CLAUSULA_LEGAL_PDF = [
  { text: "CLÁUSULA LEGAL", bold: true },
  { text: " (" },
  { text: "Ley 41/2002", bold: true },
  { text: " de Autonomía del Paciente)\nEl/la paciente identificado/a supra, en pleno uso de sus facultades y tras haber sido debidamente informado/a de su situación clínica, de las actuaciones propuestas por el equipo sanitario y de las posibles consecuencias derivadas de su no aceptación, " },
  { text: "DECLARA EXPRESAMENTE", bold: true },
  { text: " su negativa a recibir el tratamiento o traslado indicado, ejerciendo el derecho reconocido en el artículo 2.4 de la " },
  { text: "Ley 41/2002", bold: true },
  { text: ", de 14 de noviembre, básica reguladora de la autonomía del paciente. El equipo asistente queda exonerado de toda responsabilidad derivada de la presente negativa, habiendo cumplido con su deber de información conforme al artículo 4 de la citada Ley." }
];

// Tokens de diseño reutilizables — sistema clínico de alta densidad
const T = {
  label:       'block text-[10px] font-semibold text-slate-500 tracking-wide mb-0.5',
  labelSky:    'block text-[10px] font-semibold text-sky-700 tracking-wide mb-0.5',
  h3:          'text-[10px] font-semibold text-slate-500 tracking-widest uppercase',
  input:       'w-full border-b border-slate-200 bg-transparent py-0.5 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:border-sky-400 transition-colors',
  inputSky:    'w-full border-b border-sky-200 bg-transparent py-0.5 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:border-sky-500 transition-colors',
  select:      'w-full border-b border-slate-200 bg-transparent py-0.5 text-xs text-slate-800 focus:outline-none focus:border-sky-400 invalid:text-slate-400 transition-colors',
  inputMono:   'w-full border-b border-slate-200 bg-transparent py-0.5 text-xs text-center font-mono text-slate-800 focus:outline-none focus:border-sky-400 leading-tight transition-colors',
  iconBtn:     'focus:outline-none no-print',
  iconBtnAdd:  'text-sky-500 hover:text-sky-700 focus:outline-none no-print transition-colors',
  iconBtnRem:  'text-slate-400 hover:text-red-500 focus:outline-none no-print transition-colors',
  sigBtn:      'absolute top-1 right-1 text-[8px] bg-white border border-slate-200 hover:bg-sky-50 hover:border-sky-200 text-sky-600 px-1.5 py-0.5 rounded shadow-sm z-20 no-print transition-colors',
};

const ICON = {
  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  minus: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
};

const UI_COMPONENTS = {

  // ── Cabecera de Asistencia ──────────────────────────────────────────────
  // Grid 2 cols en xs → 3 cols en sm+
  // xs (360px): [Fecha][Hora] / [Tipo: span2] / [Lugar: span2]
  // sm (480px): [Fecha][Hora][Tipo] / [Lugar: span3]
  headerAsistencia() {
    return `
      <div id="datos-asistencia" class="section-block bg-sky-50/40 p-2 rounded print-border-none page-break-avoid">
        <h3 class="${T.h3} mb-2">Datos de la Asistencia</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2">
          <div>
            <label class="${T.label}">Fecha</label>
            <input id="asistencia-fecha" type="date" class="${T.input}" />
          </div>
          <div>
            <label class="${T.label}">Hora</label>
            <input id="asistencia-hora" type="time" class="${T.input}" />
          </div>
          <div class="col-span-2 sm:col-span-1">
            <label class="${T.label}">Tipo de Servicio</label>
            <select id="asistencia-tipo" required class="${T.select}">
              <option value="" disabled selected hidden></option>
              <option value="domicilio">Aviso Domiciliario</option>
              <option value="via_publica">Urgencia Vía Pública</option>
              <option value="traslado">Traslado Secundario</option>
              <option value="evento">Servicio Preventivo/Evento</option>
            </select>
          </div>
          <div class="col-span-2 sm:col-span-3">
            <label class="${T.label}">Lugar de Asistencia</label>
            <input id="lugar-asistencia" type="text" class="${T.input}" />
          </div>
        </div>
      </div>
    `;
  },

  // ── Filiación del Paciente ──────────────────────────────────────────────
  // Grid 1 col → 2 cols en xs → 4 cols en sm+
  // xs (360px): [Nombre: span2] / [DNI][F.Nac]
  // sm (480px): [Nombre: span2][DNI][F.Nac] en una sola fila
  filiacionPaciente() {
    return `
      <div id="filiacion-paciente" class="section-block page-break-avoid">
        <h3 class="${T.h3} mt-3 mb-2">Filiación del Paciente</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2">
          <div class="col-span-2">
            <label class="${T.label}">Nombre y Apellidos</label>
            <input id="paciente-nombre" type="text" class="${T.input}" />
          </div>
          <div>
            <label class="${T.label}">DNI / NIE / Pasaporte</label>
            <input id="paciente-dni" type="text" autocomplete="new-password" class="${T.input}" />
          </div>
          <div>
            <label class="${T.label}">Fecha Nacimiento</label>
            <input id="paciente-nacimiento" type="date" class="${T.input}" />
          </div>
        </div>

        <div id="contenedor-dependencia" class="hidden mt-2 px-2 py-1.5 bg-slate-50 rounded border-l-2 border-slate-300">
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" id="check-dependencia" class="w-3.5 h-3.5 rounded border-slate-300 text-sky-500 focus:ring-sky-400 focus:ring-offset-0">
            <span class="text-xs text-slate-700">Paciente dependiente / Precisa representante legal</span>
          </label>
        </div>

        <div id="bloque-tutor" class="hidden bg-sky-50/70 p-2 rounded mt-2 border border-sky-100">
          <h4 class="text-[10px] font-semibold text-sky-700 tracking-widest uppercase mb-1.5">Datos del Tutor / Representante</h4>
          <div class="grid grid-cols-1 xs:grid-cols-2 gap-x-3 gap-y-2">
            <div>
              <label class="${T.labelSky}">Nombre Tutor</label>
              <input type="text" id="paciente-tutor-nombre" class="${T.inputSky}" />
            </div>
            <div>
              <label class="${T.labelSky}">DNI Tutor</label>
              <input type="text" id="paciente-tutor-dni" class="${T.inputSky}" />
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ── Constantes Vitales ──────────────────────────────────────────────────
  // Grid 3 cols en xs → 6 cols en sm+  (5 vitales + botón acción)
  // xs (360px): [TA][FC][SpO2] / [Temp][Gluc][+]
  // sm (480px): [TA][FC][SpO2][Temp][Gluc][+] en una línea
  constantesVitales() {
    const row = (ids, labels, extra = '') => ids.map((id, i) => `
            <div>
              <label class="block text-[9px] font-semibold text-slate-500 tracking-wide mb-0.5 whitespace-nowrap">${labels[i]}</label>
              <input ${id ? `id="${id}"` : ''} type="text" maxlength="${[7,3,3,4,3][i]}"
                oninput="this.value = this.value.replace(${['/[^0-9\\\\/]/g', '/[^0-9]/g', '/[^0-9]/g', '/[^0-9.,]/g', '/[^0-9]/g'][i]}, '')"
                class="${extra}${T.inputMono}" />
            </div>`).join('');

    return `
      <div class="bg-slate-50/60 rounded p-2 mb-2 page-break-avoid" id="constantes-container">
        <div class="constantes-row">
          <div class="grid grid-cols-3 sm:grid-cols-6 gap-x-2 gap-y-1.5 items-end">
            ${row(['ta-1','fc-1','spo2-1','temp-1','gluc-1'],
                  ['TA mmHg','FC lpm','SpO2 %','Temp ºC','Gluc mg/dl'])}
            <div class="flex items-end justify-center pb-0.5">
              <button type="button" onclick="addConstantes()" class="${T.iconBtnAdd}" title="Añadir toma de constantes">
                ${ICON.plus}
              </button>
            </div>
          </div>
        </div>
      </div>

      <template id="constantes-row-template">
        <div class="constantes-row border-t border-dashed border-slate-200 mt-1.5 pt-1.5">
          <div class="grid grid-cols-3 sm:grid-cols-6 gap-x-2 gap-y-1.5 items-end">
            <div>
              <label class="block text-[9px] font-semibold text-slate-500 tracking-wide mb-0.5">TA</label>
              <input type="text" maxlength="7" oninput="this.value = this.value.replace(/[^0-9\\/]/g, '')" class="input-ta ${T.inputMono}" />
            </div>
            <div>
              <label class="block text-[9px] font-semibold text-slate-500 tracking-wide mb-0.5">FC</label>
              <input type="text" maxlength="3" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="input-fc ${T.inputMono}" />
            </div>
            <div>
              <label class="block text-[9px] font-semibold text-slate-500 tracking-wide mb-0.5">SpO2</label>
              <input type="text" maxlength="3" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="input-spo2 ${T.inputMono}" />
            </div>
            <div>
              <label class="block text-[9px] font-semibold text-slate-500 tracking-wide mb-0.5">Temp</label>
              <input type="text" maxlength="4" oninput="this.value = this.value.replace(/[^0-9.,]/g, '')" class="input-temp ${T.inputMono}" />
            </div>
            <div>
              <label class="block text-[9px] font-semibold text-slate-500 tracking-wide mb-0.5">Gluc</label>
              <input type="text" maxlength="3" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="input-gluc ${T.inputMono}" />
            </div>
            <div class="flex items-end justify-center pb-0.5">
              <button type="button" onclick="this.closest('.constantes-row').remove()" class="${T.iconBtnRem}" title="Eliminar toma">
                ${ICON.minus}
              </button>
            </div>
          </div>
        </div>
      </template>
    `;
  },

  // ── Cláusula Legal ─────────────────────────────────────────────────────
  clausulaLegal(texto) {
    return `
      <div class="bg-slate-50 border-l-2 border-slate-300 p-2 mb-2 mt-2 text-[9px] text-justify text-slate-600 leading-snug page-break-avoid">
        ${texto}
      </div>
    `;
  },

  // ── Fila de Testigo ─────────────────────────────────────────────────────
  // Grid 3→4 cols: [Nombre: span2][DNI][botón] + fila de firma debajo
  filaTestigo(index) {
    return `
      <div class="pt-2 border-t border-dashed border-slate-200 testigo-row">
        <div class="grid grid-cols-3 xs:grid-cols-4 gap-x-2 gap-y-1.5 items-end mb-2">
          <div class="col-span-2">
            <label class="${T.label}">Nombre Testigo</label>
            <input type="text" class="input-testigo-nombre ${T.input}" />
          </div>
          <div>
            <label class="${T.label}">DNI / NIE</label>
            <input type="text" class="input-testigo-dni ${T.input}" />
          </div>
          <div class="flex items-end justify-center pb-0.5">
            <button type="button" onclick="removeTestigo(this, ${index})" class="${T.iconBtnRem}" title="Eliminar testigo">
              ${ICON.minus}
            </button>
          </div>
        </div>
        <div class="relative">
          <label class="${T.label}">Firma del Testigo</label>
          <div class="border border-slate-200 rounded bg-white h-16 relative flex items-center justify-center overflow-hidden">
            <span class="absolute text-[10px] text-slate-300 italic text-center px-4 pointer-events-none select-none z-0">Firma en este recuadro.</span>
            <canvas id="canvas-testigo-${index}" class="w-full h-full rounded cursor-crosshair relative z-10 bg-transparent"></canvas>
            <button type="button" class="${T.sigBtn}" onclick="clearTestigoSignature(${index})">Borrar</button>
          </div>
        </div>
      </div>
    `;
  },

  // ── Bloque de Testigos ──────────────────────────────────────────────────
  testigos() {
    return `
      <div id="campos-testigos" class="hidden mt-2 bg-slate-50/50 p-2 rounded border border-slate-100 page-break-avoid">
        <div class="flex justify-between items-center mb-1.5">
          <h4 class="${T.h3}">Testigos Sanitarios</h4>
          <button type="button" onclick="addTestigo()" class="${T.iconBtnAdd}" title="Añadir testigo">
            ${ICON.plus}
          </button>
        </div>
        <p class="text-[9px] text-slate-500 italic mb-2 leading-snug">${INFO_TESTIGOS_LEGAL}</p>
        <div id="testigos-container"></div>
      </div>
    `;
  },

  // ── Firmas Biométricas ──────────────────────────────────────────────────
  // Grid 1 col → 2 cols en xs (360px+)
  // labelFacultativo ya no se muestra como texto estático: se usa disp_medico (config)
  // o los campos manuales input_firma_nombre/input_firma_num (sin config).
  firmas(labelPaciente) {
    return `
      <div id="firmas" class="section-block mt-4 pt-3 border-t border-slate-200 page-break-avoid">
        <div class="grid grid-cols-1 xs:grid-cols-2 gap-3">
          <!-- COLUMNA PACIENTE -->
          <div class="flex flex-col">
            <div class="flex-1 flex flex-col justify-end pb-1">
              <span id="label-firma-paciente" class="text-[10px] font-semibold text-slate-700 tracking-wide">${labelPaciente}</span>
            </div>
            <div class="border border-slate-200 rounded bg-white h-16 relative flex items-center justify-center overflow-hidden">
              <span class="absolute text-[10px] text-slate-300 italic text-center px-4 pointer-events-none select-none z-0">Acepto la asistencia prestada.</span>
              <canvas id="canvas-paciente" class="w-full h-full rounded cursor-crosshair relative z-10 bg-transparent"></canvas>
              <button type="button" class="${T.sigBtn}" onclick="clearSignature('paciente')">Borrar</button>
            </div>
          </div>

          <!-- COLUMNA FACULTATIVO -->
          <div class="flex flex-col">
            <div class="flex-1 flex flex-col justify-end pb-1">
              <!-- Datos de config (visibles cuando hay configuración guardada) -->
              <div id="disp_firma_info" class="hidden flex flex-col gap-0.5 overflow-hidden">
                <span class="text-[8px] text-sky-600 font-bold block" id="disp_categoria"></span>
                <span class="text-[9px] text-slate-600 font-semibold truncate" id="disp_medico"></span>
                <span class="text-[8px] text-slate-500" id="disp_colegiado_container">(<span id="disp_colegiado"></span>)</span>
              </div>
              <!-- Inputs manuales (visibles cuando NO hay configuración) -->
              <div id="firma-manual-inputs" class="flex flex-col gap-0.5 no-print">
                <input type="text" id="input_firma_cat" placeholder="Categoría profesional"
                  class="border-b border-slate-200 bg-transparent py-0.5 text-[10px] text-sky-600 font-semibold placeholder-slate-300 focus:outline-none focus:border-sky-400 transition-colors" />
                <div class="flex gap-1">
                  <input type="text" id="input_firma_nombre" placeholder="Nombre del facultativo / diplomado/a"
                    class="flex-1 border-b border-slate-200 bg-transparent py-0.5 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:border-sky-400 transition-colors" />
                  <input type="text" id="input_firma_num" placeholder="Nº Col./Dip."
                    class="w-20 border-b border-slate-200 bg-transparent py-0.5 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:border-sky-400 transition-colors" />
                </div>
              </div>
            </div>
            <div class="border border-slate-200 rounded bg-white h-16 relative flex items-center justify-center overflow-hidden">
              <span class="absolute text-[10px] text-slate-300 italic text-center px-4 pointer-events-none select-none z-0">El documento será firmado digitalmente.</span>
              <canvas id="canvas-medico" class="w-full h-full rounded cursor-crosshair relative z-10 bg-transparent"></canvas>
              <button type="button" class="${T.sigBtn}" onclick="clearSignature('medico')">Borrar</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};

export { UI_COMPONENTS, CLAUSULA_LEGAL_HTML, CLAUSULA_LEGAL_PDF, INFO_TESTIGOS_LEGAL };
