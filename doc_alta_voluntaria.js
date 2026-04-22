const DOC_ALTA_VOLUNTARIA = {
  id: "alta_voluntaria",
  label: "Alta Voluntaria / Negativa",

  pdfTitle: "DOCUMENTO DE ALTA VOLUNTARIA Y NEGATIVA A ASISTENCIA",
  pdfSubtitle: "Documento basado en la Ley 41/2002",

  visibleSections: [
    "datos-asistencia",
    "filiacion-paciente",
    "seccion-negativa",
    "firmas",
  ],

  getSections() {
    return [
      UI_COMPONENTS.headerAsistencia(),
      UI_COMPONENTS.filiacionPaciente(),
      `
        <div id="seccion-negativa" class="section-block page-break-avoid bg-slate-50 p-3 rounded mt-3">
          <h3 class="text-xs font-bold text-slate-800 tracking-wider mb-3 uppercase">DECLARACIÓN DE ALTA VOLUNTARIA / NEGATIVA</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-[10px] font-bold text-slate-500 tracking-wide mb-1">Situación Clínica</label>
              <textarea id="neg-situacion" rows="2" class="w-full border-b border-slate-300 bg-transparent py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600" placeholder="" oninput="autoResize(this)"></textarea>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-500 tracking-wide mb-1">Propuesta Asistencial Rechazada</label>
              <textarea id="neg-propuesta" rows="2" class="w-full border-b border-slate-300 bg-transparent py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600" placeholder="" oninput="autoResize(this)"></textarea>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-500 tracking-wide mb-1">Riesgos Advertidos</label>
              <textarea id="neg-riesgos" rows="2" class="w-full border-b border-slate-300 bg-transparent py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600" placeholder="" oninput="autoResize(this)"></textarea>
            </div>
            <div class="mt-4 pt-2 border-t border-slate-200">
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" id="check-sin-medico" class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500">
                <span class="text-xs font-semibold text-slate-800">Sin facultativo presente (Testigos Sanitarios)</span>
              </label>
            </div>
          </div>
        </div>
      `,
      UI_COMPONENTS.testigos(),
      UI_COMPONENTS.clausulaLegal(CLAUSULA_LEGAL_HTML),
      UI_COMPONENTS.firmas("Firma del Paciente", "Facultativo"),
    ];
  },

  styles: {
    titulo: {
      fontSize: 14,
      bold: true,
      color: "#0f172a",
      margin: [0, 0, 0, 2],
    },
    subtitulo: { fontSize: 9, color: "#475569", margin: [0, 0, 0, 0] },
    empresaNombre: { fontSize: 10, bold: true, color: "#0f172a" },
    empresaDato: { fontSize: 8, color: "#64748b" },
    sectionHeader: {
      fontSize: 8,
      bold: true,
      color: "#0f172a",
      fillColor: "#f1f5f9",
      margin: [4, 4, 4, 4],
      characterSpacing: 0.5,
    },
    labelKey: { fontSize: 8, bold: true, color: "#64748b" },
    labelVal: { fontSize: 9, color: "#0f172a" },
    tableLabel: {
      fontSize: 8,
      bold: true,
      color: "#475569",
      alignment: "center",
    },
    tableData: { fontSize: 9, color: "#0f172a", alignment: "center" },
    tableHeader: {
      fontSize: 7.5,
      bold: true,
      color: "#ffffff",
      fillColor: "#334155",
      alignment: "center",
      margin: [2, 3, 2, 3],
    },
    firmaLabel: { fontSize: 8, bold: true, color: "#0f172a" },
    firmaPendiente: { fontSize: 8, italics: true, color: "#94a3b8" },
    footerText: { fontSize: 7, color: "#94a3b8", alignment: "center" },
    clausula: {
      fontSize: 7.5,
      color: "#374151",
      alignment: "justify",
      lineHeight: 1.3,
    },
    clausulaTitulo: {
      fontSize: 8,
      bold: true,
      color: "#1e293b",
      margin: [0, 6, 0, 2],
    },
    testigo: { fontSize: 8, bold: true, color: "#0f172a" },
  },

  buildContent(data) {
    const {
      fecha,
      hora,
      tipoServicio,
      nombrePaciente,
      dniPaciente,
      fechaNacimiento,
      lugarAsistencia,
      tutorNombre,
      tutorDni,
      tutorFirma,
      negSituacion,
      negPropuesta,
      negRiesgos,
      sinMedico,
      testigosData,
      firmaPacienteContent,
      firmaMedicoContent,
      empresa,
      cif,
      direccion,
      medico,
      colegiado,
    } = data;

    // Bloque de firmas condicional
    const firmaPacienteCol = {
      width: "*",
      stack: [
        {
          text: tutorFirma
            ? "FIRMA DEL TUTOR / REPRESENTANTE LEGAL"
            : "FIRMA DEL PACIENTE",
          style: "firmaLabel",
        },
        firmaPacienteContent,
        {
          canvas: [
            {
              type: "line",
              x1: 0,
              y1: 0,
              x2: 220,
              y2: 0,
              lineWidth: 0.5,
              lineColor: "#94a3b8",
            },
          ],
          margin: [0, 4, 0, 2],
        },
        {
          text: tutorFirma
            ? `Representante legal identificada/o: ${tutorNombre || "—"}${tutorDni ? ` (DNI: ${tutorDni})` : ""}`
            : nombrePaciente || "Paciente",
          fontSize: 7.5,
          color: "#475569",
        },
      ],
    };

    let firmaFacultativoCol;
    if (sinMedico) {
      firmaFacultativoCol = {
        width: "*",
        stack: [
          {
            text: "TESTIGOS SANITARIOS",
            style: "firmaLabel",
          },
          {
            text: INFO_TESTIGOS_LEGAL,
            italics: true,
            fontSize: 7.5,
            color: "#475569",
            margin: [0, 4, 0, 10],
          },
          ...(testigosData && testigosData.length > 0
            ? testigosData.map((t) => ({
                stack: [
                  {
                    text: `Testigo: ${t.nombre || "—"} (DNI: ${t.dni || "—"})`,
                    fontSize: 8,
                    margin: [0, 6, 0, 10],
                  },
                  t.firmaContent
                    ? {
                        image: t.firmaContent,
                        width: 200,
                        height: 60,
                        margin: [0, 0, 0, 0],
                      }
                    : {
                        text: "(Firma pendiente)",
                        italics: true,
                        fontSize: 8,
                        color: "#94a3b8",
                        margin: [0, 15, 0, 15],
                      },
                  {
                    canvas: [
                      {
                        type: "line",
                        x1: 0,
                        y1: 0,
                        x2: 220,
                        y2: 0,
                        lineWidth: 0.5,
                        lineColor: "#94a3b8",
                      },
                    ],
                    margin: [0, 2, 0, 2],
                  },
                  {
                    text: "Firma",
                    fontSize: 7,
                    color: "#6b7280",
                    italics: true,
                    margin: [0, 0, 0, 10],
                  },
                ],
              }))
            : [
                {
                  text: "Sin testigos especificados",
                  italics: true,
                  fontSize: 8,
                  color: "#94a3b8",
                  margin: [0, 10, 0, 0],
                },
              ]),
        ],
      };
    } else {
      firmaFacultativoCol = {
        width: "*",
        stack: [
          {
            text: `Facultativo: ${medico}${colegiado ? " (Nº Col: " + colegiado + ")" : ""}`,
            style: "firmaLabel",
          },
          firmaMedicoContent,
          {
            canvas: [
              {
                type: "line",
                x1: 0,
                y1: 0,
                x2: 220,
                y2: 0,
                lineWidth: 0.5,
                lineColor: "#94a3b8",
              },
            ],
            margin: [0, 4, 0, 2],
          },
          { text: medico || "Facultativo", fontSize: 7.5, color: "#475569" },
        ],
      };
    }

    return [
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 1.5,
            lineColor: "#334155",
          },
        ],
        margin: [0, 4, 0, 8],
      },

      // DATOS DE LA ASISTENCIA
      { text: "DATOS DE LA ASISTENCIA", style: "sectionHeader" },
      {
        margin: [0, 4, 0, 8],
        columns: [
          [
            { text: "Fecha", style: "labelKey" },
            { text: fecha || "—", style: "labelVal" },
          ],
          [
            { text: "Hora", style: "labelKey" },
            { text: hora || "—", style: "labelVal" },
          ],
          [
            { text: "Tipo de servicio", style: "labelKey" },
            { text: tipoServicio || "—", style: "labelVal" },
          ],
        ],
      },
      {
        margin: [0, 0, 0, 8],
        stack: [
          { text: "Lugar de Asistencia", style: "labelKey" },
          { text: lugarAsistencia || "—", style: "labelVal" },
        ],
      },

      // FILIACIÓN
      { text: "IDENTIFICACIÓN DEL PACIENTE", style: "sectionHeader" },
      {
        margin: [0, 4, 0, 2],
        columns: [
          {
            width: "*",
            stack: [
              { text: "Nombre y Apellidos", style: "labelKey" },
              { text: nombrePaciente || "—", style: "labelVal" },
            ],
          },
          {
            width: 100,
            stack: [
              { text: "DNI / NIE / Pasaporte", style: "labelKey" },
              { text: dniPaciente || "—", style: "labelVal" },
            ],
          },
          {
            width: 90,
            stack: [
              { text: "Fecha de Nacimiento", style: "labelKey" },
              { text: fechaNacimiento || "—", style: "labelVal" },
            ],
          },
        ],
      },
      tutorNombre
        ? {
            margin: [0, 0, 0, 2],
            columns: [
              {
                width: "*",
                stack: [
                  { text: "Tutor Legal (Representante)", style: "labelKey" },
                  {
                    text: tutorNombre,
                    style: "labelVal",
                    bold: true,
                  },
                ],
              },
              {
                width: 100,
                stack: [
                  { text: "DNI Tutor", style: "labelKey" },
                  { text: tutorDni || "—", style: "labelVal" },
                ],
              },
              { width: 90, text: "" },
            ],
          }
        : null,

      // DECLARACIÓN DE NEGATIVA
      {
        text: "DECLARACIÓN DE ALTA VOLUNTARIA / NEGATIVA",
        style: "sectionHeader",
      },
      {
        margin: [0, 4, 0, 4],
        stack: [
          { text: "Situación Clínica", style: "labelKey" },
          { text: negSituacion || "—", style: "labelVal" },
        ],
      },
      {
        margin: [0, 0, 0, 4],
        stack: [
          { text: "Propuesta Asistencial Rechazada", style: "labelKey" },
          { text: negPropuesta || "—", style: "labelVal" },
        ],
      },
      {
        margin: [0, 0, 0, 8],
        stack: [
          { text: "Riesgos Advertidos", style: "labelKey" },
          { text: negRiesgos || "—", style: "labelVal" },
        ],
      },

      // CLÁUSULA LEGAL (Ley 41/2002)
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 0.3,
            lineColor: "#d1d5db",
          },
        ],
        margin: [0, 4, 0, 6],
      },
      {
        fontSize: 7,
        lineHeight: 1.2,
        alignment: "justify",
        margin: [0, 6, 0, 8],
        text: CLAUSULA_LEGAL_PDF,
      },

      // FIRMAS
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 0.5,
            lineColor: "#cbd5e1",
          },
        ],
        margin: [0, 4, 0, 8],
      },
      { text: "FIRMAS Y ACREDITACIÓN", style: "sectionHeader" },
      {
        margin: [0, 6, 0, 0],
        columns: [
          firmaPacienteCol,
          { width: 20, text: "" },
          firmaFacultativoCol,
        ],
      },

      // Pie legal
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 0.3,
            lineColor: "#e2e8f0",
          },
        ],
        margin: [0, 16, 0, 6],
      },
      {
        fontSize: 6.5,
        color: "#475569",
        alignment: "justify",
        text: "PROTECCIÓN DE DATOS: Conforme al RGPD (UE) 2016/679 y LOPDGDD 3/2018, sus datos de salud serán tratados por la entidad emisora para la prestación y gestión de la asistencia sanitaria. Puede ejercer sus derechos de acceso, rectificación, supresión y oposición dirigiéndose al Responsable del Tratamiento a través de la dirección postal indicada en la cabecera de este documento.\n\nINFORMACIÓN CLÍNICA: Documento emitido conforme a la Ley 41/2002. Su contenido es de carácter estrictamente confidencial, está amparado por el secreto profesional y destinado exclusivamente a garantizar la continuidad asistencial del paciente.",
      },
    ];
  },
};
