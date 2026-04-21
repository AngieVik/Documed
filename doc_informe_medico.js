const DOC_INFORME_MEDICO = {
  id: "informe_medico",
  label: "Informe Médico",

  // Título que aparece en la cabecera del PDF generado
  pdfTitle: "INFORME DE ASISTENCIA MÉDICA",
  pdfSubtitle: "Servicio Extrahospitalario",

  // Campos del formulario HTML que son relevantes para esta plantilla.
  // Permite a app.js mostrar u ocultar secciones según la plantilla activa.
  visibleSections: [
    "datos-asistencia",
    "filiacion-paciente",
    "evaluacion-clinica",
    "resolucion-plan",
    "firmas",
  ],

  // ── Definición de estilos pdfmake compartidos por esta plantilla ──────
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
  },

  // ── Función que construye el array `content` de pdfmake ───────────────
  // Recibe el objeto `data` preparado por app.js::generarPDF()
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
      alergias,
      antecedentes,
      anamnesis,
      exploracion,
      tratamiento,
      diagnostico,
      planActuacion,
      hospitalDestino,
      constantesData,
      firmaPacienteContent,
      firmaMedicoContent,
      medico,
      colegiado,
    } = data;

    return [
      // Línea divisoria cabecera
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
          { text: lugarAsistencia, style: "labelVal" },
        ],
      },

      // FILIACIÓN
      { text: "FILIACIÓN DEL PACIENTE", style: "sectionHeader" },
      {
        margin: [0, 4, 0, 2],
        columns: [
          {
            width: "*",
            stack: [
              { text: "Nombre y Apellidos", style: "labelKey" },
              { text: nombrePaciente, style: "labelVal" },
            ],
          },
          {
            width: 100,
            stack: [
              { text: "DNI / NIE / Pasaporte", style: "labelKey" },
              { text: dniPaciente, style: "labelVal" },
            ],
          },
          {
            width: 90,
            stack: [
              { text: "Fecha de Nacimiento", style: "labelKey" },
              { text: fechaNacimiento, style: "labelVal" },
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
                    color: "#92400e",
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

      // EVALUACIÓN CLÍNICA
      { text: "EVALUACIÓN CLÍNICA", style: "sectionHeader" },
      {
        margin: [0, 4, 0, 4],
        stack: [
          { text: "Alergias (NAMC)", style: "labelKey" },
          { text: alergias, style: "labelVal", color: "#dc2626" },
        ],
      },
      {
        margin: [0, 0, 0, 4],
        stack: [
          { text: "Antecedentes Personales", style: "labelKey" },
          { text: antecedentes, style: "labelVal" },
        ],
      },
      {
        margin: [0, 0, 0, 8],
        stack: [
          { text: "Anamnesis", style: "labelKey" },
          { text: anamnesis, style: "labelVal" },
        ],
      },

      // Constantes vitales
      constantesData.length > 0
        ? {
            margin: [0, 0, 0, 8],
            table: {
              widths: ["auto", "*", "*", "*", "*", "*"],
              headerRows: 1,
              body: [
                [
                  { text: "", style: "tableHeader" },
                  { text: "TA (mmHg)", style: "tableHeader" },
                  { text: "FC (lpm)", style: "tableHeader" },
                  { text: "SpO2 (%)", style: "tableHeader" },
                  { text: "Temp (ºC)", style: "tableHeader" },
                  { text: "Glucemia", style: "tableHeader" },
                ],
                ...constantesData,
              ],
            },
            layout: {
              hLineWidth: (i) => (i === 0 || i === 1 ? 0.5 : 0.3),
              vLineWidth: () => 0.3,
              hLineColor: () => "#cbd5e1",
              vLineColor: () => "#cbd5e1",
              fillColor: (r) => (r % 2 === 0 ? "#f8fafc" : null),
            },
          }
        : {
            text: "(Sin constantes vitales registradas)",
            style: "firmaPendiente",
            margin: [0, 0, 0, 8],
          },

      {
        margin: [0, 0, 0, 8],
        stack: [
          { text: "Exploración Física", style: "labelKey" },
          { text: exploracion, style: "labelVal" },
        ],
      },

      // RESOLUCIÓN Y PLAN
      { text: "RESOLUCIÓN Y PLAN", style: "sectionHeader" },
      {
        margin: [0, 4, 0, 4],
        stack: [
          {
            text: "Juicio Clínico y Diagnóstico Presuntivo",
            style: "labelKey",
          },
          { text: diagnostico, style: "labelVal", bold: true },
        ],
      },
      {
        margin: [0, 0, 0, 4],
        stack: [
          { text: "Tratamiento Administrado In Situ", style: "labelKey" },
          { text: tratamiento, style: "labelVal" },
        ],
      },
      {
        margin: [0, 0, 0, 8],
        columns: [
          {
            width: "*",
            stack: [
              { text: "Plan de Actuación", style: "labelKey" },
              { text: planActuacion, style: "labelVal" },
            ],
          },
          {
            width: "*",
            stack: [
              { text: "Hospital / Centro de Destino", style: "labelKey" },
              { text: hospitalDestino, style: "labelVal" },
            ],
          },
        ],
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
      { text: "FIRMAS", style: "sectionHeader" },
      {
        margin: [0, 6, 0, 0],
        columns: [
          {
            width: "*",
            stack: [
              {
                text: tutorFirma
                  ? "FIRMA DEL TUTOR / REPRESENTANTE LEGAL"
                  : "FIRMA DEL PACIENTE",
                style: "firmaLabel",
                color: tutorFirma ? "#92400e" : "#0f172a",
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
                  : nombrePaciente,
                fontSize: 7.5,
                color: "#475569",
              },
            ],
          },
          { width: 20, text: "" },
          {
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
              {
                text: medico || "Facultativo",
                fontSize: 7.5,
                color: "#475569",
              },
            ],
          },
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
