import { UI_COMPONENTS } from './components.js';

export const DOC_ASUNCION_FACULTATIVA = {
  id: "asuncion_facultativa",
  label: "Asunción Facultativa en Escena",

  pdfTitle: "DOCUMENTO DE ASUNCIÓN FACULTATIVA EN ESCENA",
  pdfSubtitle: "Transferencia de Responsabilidad Médico-Legal y Mando Clínico",

  visibleSections: [
    "datos-asistencia",
    "filiacion-paciente",
    "datos-interviniente",
    "estado-transferencia",
    "firmas",
  ],

  getSections() {
    // Importamos los componentes globales. Si no estuvieran en el scope por la migración a módulos,
    // asegúrate de que UI_COMPONENTS esté exportado/importado adecuadamente.
    return [
      UI_COMPONENTS.headerAsistencia(),
      UI_COMPONENTS.filiacionPaciente(),
      `
        <div id="datos-interviniente" class="section-block page-break-avoid bg-sky-50/50 p-2 sm:p-3 rounded border border-sky-100 mt-2">
          <h3 class="text-[10px] font-bold text-sky-800 tracking-wider mb-2 uppercase border-b border-sky-100 pb-1">1. Facultativo Interviniente (Asume el Mando)</h3>
          <div class="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-5 gap-2">
            <div class="sm:col-span-2">
              <label class="block text-[9px] font-semibold text-slate-500 tracking-wide mb-0.5">Nombre y Apellidos del Facultativo</label>
              <input id="af-nombre" type="text" class="w-full border-b border-slate-200 bg-transparent py-0.5 text-[10px] text-slate-800 focus:outline-none focus:border-sky-400 transition-colors" />
            </div>
            <div>
              <label class="block text-[9px] font-semibold text-slate-500 tracking-wide mb-0.5">DNI / NIE</label>
              <input id="af-dni" type="text" class="w-full border-b border-slate-200 bg-transparent py-0.5 text-[10px] text-slate-800 focus:outline-none focus:border-sky-400 transition-colors" />
            </div>
            <div>
              <label class="block text-[9px] font-semibold text-slate-500 tracking-wide mb-0.5">Nº Colegiado</label>
              <input id="af-colegiado" type="text" class="w-full border-b border-slate-200 bg-transparent py-0.5 text-[10px] text-slate-800 focus:outline-none focus:border-sky-400 transition-colors" />
            </div>
            <div>
              <label class="block text-[9px] font-bold text-red-600 tracking-wide mb-0.5">Hora Exacta Asunción</label>
              <input id="af-hora" type="time" class="w-full border-b border-red-200 bg-transparent py-0.5 text-[10px] text-red-800 font-bold focus:outline-none focus:border-red-400 transition-colors" />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-[9px] font-semibold text-slate-500 tracking-wide mb-0.5">Provincia de Colegiación</label>
              <input id="af-provincia" type="text" class="w-full border-b border-slate-200 bg-transparent py-0.5 text-[10px] text-slate-800 focus:outline-none focus:border-sky-400 transition-colors" />
            </div>
          </div>
        </div>
        
        <div id="estado-transferencia" class="section-block page-break-avoid bg-white p-2 sm:p-3 rounded border border-slate-100 mt-2">
          <h3 class="text-[10px] font-bold text-slate-700 tracking-wider mb-2 uppercase border-b border-slate-100 pb-1">2. Snapshot Clínico en la Transferencia</h3>
          <div class="grid grid-cols-1 gap-2">
            <div>
              <label class="block text-[9px] font-semibold text-slate-500 tracking-wide mb-0.5">Nivel de Consciencia (AVDN / Glasgow)</label>
              <input id="af-consciencia" type="text" class="w-full border-b border-slate-200 bg-transparent py-0.5 text-[10px] text-slate-800 focus:outline-none focus:border-sky-400" placeholder="Ej: Alerta, Responde a dolor..." />
            </div>
            <div>
              <label class="block text-[9px] font-semibold text-slate-500 tracking-wide mb-0.5">Intervenciones y Fármacos administrados PREVIOS a la asunción</label>
              <textarea id="af-intervenciones" rows="2" class="w-full border-b border-slate-200 bg-transparent py-0.5 text-[10px] text-slate-800 focus:outline-none focus:border-sky-400" oninput="if(typeof autoResize === 'function') autoResize(this)"></textarea>
            </div>
          </div>
        </div>
      `,
      `<div class="mt-2 pt-2 border-t border-slate-100">
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" id="check-testigos-escena" class="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            onchange="document.getElementById('campos-testigos').classList.toggle('hidden', !this.checked)">
          <span class="text-xs font-semibold text-slate-700">Añadir testigos en escena</span>
        </label>
      </div>`,
      UI_COMPONENTS.testigos(),
      UI_COMPONENTS.clausulaLegal(`<strong>CLÁUSULA DE EXONERACIÓN Y DIRECCIÓN MÉDICA (Ley 44/2003 y Ley 41/2002):</strong><br/>El facultativo identificado en este documento, tras acreditar su identidad y titulación médica, <strong>ASUME</strong> de forma voluntaria, expresa e indelegable la Dirección Médica y el control de la asistencia sanitaria del paciente en la escena. Al amparo de la legislación sanitaria vigente, <strong>EXIME</strong> al equipo de emergencias originalmente interviniente de toda responsabilidad civil, penal o administrativa derivada de las decisiones clínicas, triaje, tratamientos y destino de traslado determinados a partir de la hora exacta de asunción aquí firmada. El equipo de emergencias actuará en adelante bajo las directrices estrictas de dicho facultativo.`),
      UI_COMPONENTS.firmas("FACULTATIVO INTERVINIENTE (Asume)")
    ];
  },

  styles: {
    titulo: { fontSize: 13, bold: true, color: "#0f172a", margin: [0, 0, 0, 2] },
    subtitulo: { fontSize: 8.5, color: "#475569", margin: [0, 0, 0, 0] },
    empresaNombre: { fontSize: 10, bold: true, color: "#0f172a" },
    empresaDato: { fontSize: 8, color: "#64748b" },
    sectionHeader: { fontSize: 8, bold: true, color: "#0f172a", fillColor: "#f1f5f9", margin: [4, 4, 4, 4], characterSpacing: 0.5 },
    labelKey: { fontSize: 8, bold: true, color: "#64748b" },
    labelVal: { fontSize: 9, color: "#0f172a" },
    firmaLabel: { fontSize: 8, bold: true, color: "#0f172a" },
    firmaPendiente: { fontSize: 8, italics: true, color: "#94a3b8" },
    footerText: { fontSize: 7, color: "#94a3b8", alignment: "center" },
  },

  buildContent(data) {
    const {
      fecha, hora, lugarAsistencia, nombrePaciente, dniPaciente,
      firmaPacienteContent, firmaMedicoContent, testigosData,
      medico, colegiado, categoria, firmaCat,
    } = data;

    const categoriaFirmante = categoria || firmaCat || "";
    const nombreFirmante    = medico || "—";
    const numFirmante       = colegiado || "";

    // Extracción limpia directa del DOM para no alterar app.js
    const getDomVal = (id) => document.getElementById(id) && document.getElementById(id).value.trim() !== "" ? document.getElementById(id).value.trim() : "—";
    
    const afNombre = getDomVal("af-nombre");
    const afDni = getDomVal("af-dni");
    const afColegiado = getDomVal("af-colegiado");
    const afProvincia = getDomVal("af-provincia");
    const afHora = getDomVal("af-hora");
    const afConsciencia = getDomVal("af-consciencia");
    const afIntervenciones = getDomVal("af-intervenciones");

    return [
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: "#334155" }], margin: [0, 4, 0, 8] },

      { text: "DATOS DE LA ASISTENCIA Y FILIACIÓN", style: "sectionHeader" },
      {
        margin: [0, 4, 0, 8],
        columns: [
          { width: "auto", stack: [{ text: "Fecha", style: "labelKey" }, { text: fecha || "—", style: "labelVal" }] },
          { width: 30, text: "" },
          { width: "auto", stack: [{ text: "Hora Llegada", style: "labelKey" }, { text: hora || "—", style: "labelVal" }] },
          { width: 30, text: "" },
          { width: "*", stack: [{ text: "Lugar de Asistencia", style: "labelKey" }, { text: lugarAsistencia || "—", style: "labelVal" }] },
        ]
      },
      {
        margin: [0, 0, 0, 8],
        columns: [
          { width: "*", stack: [{ text: "Paciente", style: "labelKey" }, { text: nombrePaciente || "—", style: "labelVal" }] },
          { width: 100, stack: [{ text: "DNI / NIE", style: "labelKey" }, { text: dniPaciente || "—", style: "labelVal" }] },
        ]
      },

      { text: "1. Facultativo interviniente - Asume el mando", style: "sectionHeader" },
      {
        margin: [0, 4, 0, 4],
        columns: [
          { width: "*", stack: [{ text: "Nombre y Apellidos", style: "labelKey" }, { text: afNombre, style: "labelVal", bold: true, color: "#0369a1" }] },
          { width: 90, stack: [{ text: "DNI / NIE", style: "labelKey" }, { text: afDni, style: "labelVal" }] },
          { width: 80, stack: [{ text: "Nº Colegiado", style: "labelKey" }, { text: afColegiado, style: "labelVal" }] },
        ]
      },
      {
        margin: [0, 0, 0, 8],
        columns: [
          { width: "*", stack: [{ text: "Provincia de Colegiación", style: "labelKey" }, { text: afProvincia, style: "labelVal" }] },
          { width: 120, stack: [{ text: "HORA EXACTA DE ASUNCIÓN", style: "labelKey" }, { text: afHora, style: "labelVal", bold: true, color: "#dc2626" }] },
        ]
      },

      { text: "2. ESTADO CLÍNICO EN EL MOMENTO DE LA TRANSFERENCIA", style: "sectionHeader" },
      {
        margin: [0, 4, 0, 4],
        stack: [{ text: "Nivel de Consciencia", style: "labelKey" }, { text: afConsciencia, style: "labelVal" }]
      },
      {
        margin: [0, 0, 0, 8],
        stack: [{ text: "Intervenciones y Fármacos administrados por el equipo original", style: "labelKey" }, { text: afIntervenciones, style: "labelVal" }]
      },

      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.3, lineColor: "#d1d5db" }], margin: [0, 4, 0, 6] },
      {
        fontSize: 7.5, lineHeight: 1.2, alignment: "justify", margin: [0, 6, 0, 8],
        text: [
          { text: "CLÁUSULA DE EXONERACIÓN Y DIRECCIÓN MÉDICA (Ley 44/2003 y Ley 41/2002):\n", bold: true },
          "El facultativo identificado en este documento, tras acreditar su identidad y titulación médica, ASUME de forma voluntaria, expresa e indelegable la Dirección Médica y el control de la asistencia sanitaria del paciente en la escena. Al amparo de la legislación sanitaria vigente, EXIME al equipo de emergencias originalmente interviniente de toda responsabilidad civil, penal o administrativa derivada de las decisiones clínicas, triaje, tratamientos y destino de traslado determinados a partir de la hora de asunción aquí firmada. El equipo actuará en adelante bajo las directrices de dicho facultativo."
        ]
      },

      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#cbd5e1" }], margin: [0, 4, 0, 8] },
      { text: "FIRMAS Y ACREDITACIÓN", style: "sectionHeader" },
      {
        margin: [0, 6, 0, 0],
        columns: [
          {
            width: "*",
            stack: [
              { text: "FACULTATIVO INTERVINIENTE (Asume)", style: "firmaLabel" },
              firmaPacienteContent,
              { canvas: [{ type: "line", x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 0.5, lineColor: "#94a3b8" }], margin: [0, 4, 0, 2] },
              { text: "Firma", fontSize: 7.5, color: "#475569" },
            ],
          },
          { width: 20, text: "" },
          {
            width: "*",
            stack: [
              ...(categoriaFirmante ? [{ text: categoriaFirmante, bold: true, fontSize: 7, color: "#0284c7", margin: [0, 0, 0, 1] }] : []),
              { text: "RESPONSABLE DEL EQUIPO (Cede el mando)", style: "firmaLabel", color: "#0369a1" },
              ...(numFirmante ? [{ text: `Nº Col/Dip: ${numFirmante}`, fontSize: 7, color: "#64748b" }] : []),
              firmaMedicoContent,
              { canvas: [{ type: "line", x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 0.5, lineColor: "#94a3b8" }], margin: [0, 4, 0, 2] },
              { text: nombreFirmante, fontSize: 7.5, color: "#475569" },
            ],
          },
        ],
      },

      // Testigos dinámicos renderizados al final
      testigosData && testigosData.length > 0 ? {
        margin: [0, 15, 0, 0],
        stack: [
          { text: "TESTIGOS EN ESCENA (Opcional)", style: "firmaLabel" },
          ...testigosData.map((t) => ({
             columns: [
               { width: "*", stack: [{ text: `Nombre: ${t.nombre || "—"}\nDNI: ${t.dni || "—"}`, fontSize: 8, margin: [0, 5, 0, 0] }] },
               { width: 200, stack: [
                 t.firmaContent ? { image: t.firmaContent, width: 150, height: 45, margin: [0, 0, 0, 0] } : { text: "(Firma pendiente)", style: "firmaPendiente", margin: [0, 10, 0, 5] },
                 { canvas: [{ type: "line", x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.5, lineColor: "#94a3b8" }] }
               ] }
             ],
             margin: [0, 0, 0, 10]
          }))
        ]
      } : null,

      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.3, lineColor: "#e2e8f0" }], margin: [0, 16, 0, 6] },
      { fontSize: 6.5, color: "#475569", alignment: "justify", text: "DOCUMENTO LEGAL VINCULANTE. El registro de firmas conlleva la aceptación de los términos estipulados y la transferencia de responsabilidad de acuerdo al artículo 4 y correlativos de la Ley 44/2003 de Ordenación de las Profesiones Sanitarias." }
    ];
  }
};