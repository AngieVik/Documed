const UI_COMPONENTS = {
  headerAsistencia() {
    return `
      <div id="datos-asistencia" class="section-block bg-slate-50 p-3 rounded print-border-none page-break-avoid">
        <h3 class="text-xs font-bold text-slate-800 tracking-wider mb-3 uppercase">
          Datos de la Asistencia
        </h3>
        <div class="grid grid-cols-3 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-[10px] font-bold text-slate-500 tracking-wide mb-1">Fecha</label>
            <input id="asistencia-fecha" type="date" class="w-full border-b border-slate-300 bg-transparent py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-600" />
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 tracking-wide mb-1">Hora de asistencia</label>
            <input id="asistencia-hora" type="time" class="w-full border-b border-slate-300 bg-transparent py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-600" />
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 tracking-wide mb-1">Tipo de Servicio</label>
            <select id="asistencia-tipo" required class="w-full border-b border-slate-300 bg-transparent py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-600 invalid:text-slate-400">
              <option value="" disabled selected hidden></option>
              <option value="domicilio" class="text-slate-800">Aviso Domiciliario</option>
              <option value="via_publica" class="text-slate-800">Urgencia Vía Pública</option>
              <option value="traslado" class="text-slate-800">Traslado Secundario</option>
              <option value="evento" class="text-slate-800">Servicio Preventivo/Evento</option>
            </select>
          </div>
          <div class="col-span-3">
            <label class="block text-[10px] font-bold text-slate-500 tracking-wide mb-1">Lugar de Asistencia</label>
            <input id="lugar-asistencia" type="text" class="w-full border-b border-slate-300 bg-transparent py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600" placeholder="" />
          </div>
        </div>
      </div>
    `;
  },
  
  filiacionPaciente() {
    return `
      <div id="filiacion-paciente" class="section-block page-break-avoid">
        <h3 class="text-xs font-bold text-slate-800 tracking-wider mb-3 mt-2 uppercase">
          Filiación del Paciente
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="sm:col-span-2">
            <label class="block text-[10px] font-bold text-slate-500 tracking-wide mb-1">Nombre y Apellidos</label>
            <input id="paciente-nombre" type="text" class="w-full border-b border-slate-300 bg-transparent py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600" placeholder="" />
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 tracking-wide mb-1">DNI / NIE / Pasaporte</label>
            <input id="paciente-dni" type="text" autocomplete="new-password" class="w-full border-b border-slate-300 bg-transparent py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600" placeholder="" />
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 tracking-wide mb-1">Fecha Nacimiento</label>
            <input id="paciente-nacimiento" type="date" class="w-full border-b border-slate-300 bg-transparent py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-600" />
          </div>
        </div>
        <div id="contenedor-dependencia" class="hidden mt-2 p-2 bg-slate-100 rounded border-l-4 border-slate-400">
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" id="check-dependencia" class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500">
            <span class="text-xs font-semibold text-slate-700">Paciente dependiente / Precisa representante legal</span>
          </label>
        </div>
        
        <div id="bloque-tutor" class="hidden bg-blue-50 p-3 rounded mt-2 border border-blue-100">
          <h4 class="text-[10px] font-bold text-blue-800 tracking-wide mb-2 uppercase">Datos del Tutor/Representante</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-bold text-blue-700 tracking-wide mb-1">Nombre Tutor</label>
              <input type="text" id="paciente-tutor-nombre" class="w-full border-b border-blue-300 bg-transparent py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600" />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-blue-700 tracking-wide mb-1">DNI Tutor</label>
              <input type="text" id="paciente-tutor-dni" class="w-full border-b border-blue-300 bg-transparent py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600" />
            </div>
          </div>
        </div>
      </div>
    `;
  },

  constantesVitales() {
    return `
      <div class="bg-slate-50 p-1 rounded print-border-none mb-3 page-break-avoid" id="constantes-container">
        <div class="flex items-center gap-2 mb-1 constantes-row">
          <div class="flex flex-wrap lg:flex-nowrap items-baseline gap-2 sm:gap-4 flex-1">
            <div class="flex items-baseline gap-1">
              <label class="text-[10px] font-bold text-slate-500 tracking-wide whitespace-nowrap">TA (mmHg)</label>
              <input id="ta-1" type="text" maxlength="7" oninput="this.value = this.value.replace(/[^0-9\\/]/g, '')" class="w-14 border-b border-slate-300 bg-transparent py-1 text-xs text-center font-mono focus:outline-none focus:border-blue-600 leading-tight" placeholder="" />
            </div>
            <div class="flex items-baseline gap-1">
              <label class="text-[10px] font-bold text-slate-500 tracking-wide whitespace-nowrap">FC (lpm)</label>
              <input id="fc-1" type="text" maxlength="3" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="w-12 border-b border-slate-300 bg-transparent py-1 text-xs text-center font-mono focus:outline-none focus:border-blue-600 leading-tight" placeholder="" />
            </div>
            <div class="flex items-baseline gap-1">
              <label class="text-[10px] font-bold text-slate-500 tracking-wide whitespace-nowrap">SpO2 (%)</label>
              <input id="spo2-1" type="text" maxlength="3" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="w-12 border-b border-slate-300 bg-transparent py-1 text-xs text-center font-mono focus:outline-none focus:border-blue-600 leading-tight" placeholder="" />
            </div>
            <div class="flex items-baseline gap-1">
              <label class="text-[10px] font-bold text-slate-500 tracking-wide whitespace-nowrap">Temp (ºC)</label>
              <input id="temp-1" type="text" maxlength="4" oninput="this.value = this.value.replace(/[^0-9.,]/g, '')" class="w-12 border-b border-slate-300 bg-transparent py-1 text-xs text-center font-mono focus:outline-none focus:border-blue-600 leading-tight" placeholder="" />
            </div>
            <div class="flex items-baseline gap-1">
              <label class="text-[10px] font-bold text-slate-500 tracking-wide whitespace-nowrap">Glucemia (mg/dl)</label>
              <input id="gluc-1" type="text" maxlength="3" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="w-12 border-b border-slate-300 bg-transparent py-1 text-xs text-center font-mono focus:outline-none focus:border-blue-600 leading-tight" placeholder="" />
            </div>
          </div>
          <button type="button" onclick="addConstantes()" class="text-blue-600 hover:text-blue-800 focus:outline-none no-print shrink-0 pb-0.5" title="Añadir nueva toma de constantes">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
      
      <template id="constantes-row-template">
        <div class="flex items-center gap-2 mb-1 constantes-row mt-2 pt-2 border-t border-slate-200 border-dashed">
          <div class="flex flex-wrap lg:flex-nowrap items-baseline gap-2 sm:gap-4 flex-1">
            <div class="flex items-baseline gap-1">
              <label class="text-[10px] font-bold text-slate-500 tracking-wide whitespace-nowrap">TA</label>
              <input type="text" maxlength="7" oninput="this.value = this.value.replace(/[^0-9\\/]/g, '')" class="input-ta w-14 border-b border-slate-300 bg-transparent py-1 text-xs text-center font-mono focus:outline-none focus:border-blue-600 leading-tight" placeholder="" />
            </div>
            <div class="flex items-baseline gap-1">
              <label class="text-[10px] font-bold text-slate-500 tracking-wide whitespace-nowrap">FC</label>
              <input type="text" maxlength="3" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="input-fc w-12 border-b border-slate-300 bg-transparent py-1 text-xs text-center font-mono focus:outline-none focus:border-blue-600 leading-tight" placeholder="" />
            </div>
            <div class="flex items-baseline gap-1">
              <label class="text-[10px] font-bold text-slate-500 tracking-wide whitespace-nowrap">SpO2</label>
              <input type="text" maxlength="3" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="input-spo2 w-12 border-b border-slate-300 bg-transparent py-1 text-xs text-center font-mono focus:outline-none focus:border-blue-600 leading-tight" placeholder="" />
            </div>
            <div class="flex items-baseline gap-1">
              <label class="text-[10px] font-bold text-slate-500 tracking-wide whitespace-nowrap">Temp</label>
              <input type="text" maxlength="4" oninput="this.value = this.value.replace(/[^0-9.,]/g, '')" class="input-temp w-12 border-b border-slate-300 bg-transparent py-1 text-xs text-center font-mono focus:outline-none focus:border-blue-600 leading-tight" placeholder="" />
            </div>
            <div class="flex items-baseline gap-1">
              <label class="text-[10px] font-bold text-slate-500 tracking-wide whitespace-nowrap">Gluc.</label>
              <input type="text" maxlength="3" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="input-gluc w-12 border-b border-slate-300 bg-transparent py-1 text-xs text-center font-mono focus:outline-none focus:border-blue-600 leading-tight" placeholder="" />
            </div>
          </div>
          <button type="button" onclick="this.closest('.constantes-row').remove()" class="text-red-500 hover:text-red-700 focus:outline-none no-print shrink-0 pb-0.5" title="Eliminar toma">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </template>
    `;
  },

  firmas(labelPaciente, labelFacultativo) {
    return `
      <div id="firmas" class="section-block mt-6 pt-4 border-t border-slate-200 page-break-avoid">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div class="flex flex-col">
            <div class="mb-2 h-4 flex items-end">
              <span id="label-firma-paciente" class="text-[10px] font-bold text-slate-800 tracking-wide">${labelPaciente}</span>
            </div>
            <div class="border border-slate-300 rounded bg-white h-20 relative flex items-center justify-center overflow-hidden">
              <span class="absolute text-[10px] text-slate-300 italic text-center px-4 pointer-events-none select-none z-0">Acepto la asistencia prestada.</span>
              <canvas id="canvas-paciente" class="w-full h-full rounded cursor-crosshair relative z-10 bg-transparent"></canvas>
              <button type="button" class="absolute top-1 right-1 text-[8px] bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shadow-sm z-20 no-print" onclick="clearSignature('paciente')">Borrar</button>
            </div>
          </div>

          <div class="flex flex-col">
            <div class="mb-2 h-4 flex items-baseline gap-1 whitespace-nowrap overflow-hidden">
              <span id="label-firma-facultativo" class="text-[10px] font-bold text-slate-800 tracking-wide">${labelFacultativo}</span>
              <span class="text-[9px] text-slate-600 font-semibold truncate" id="disp_medico"></span>
              <span class="text-[8px] text-slate-500 ml-0.5">(Nº Col: <span id="disp_colegiado"></span>)</span>
            </div>
            <div class="border border-slate-300 rounded bg-white h-20 relative flex items-center justify-center overflow-hidden">
              <span class="absolute text-[10px] text-slate-300 italic text-center px-4 pointer-events-none select-none z-0">El documento será firmado digitalmente.</span>
              <canvas id="canvas-medico" class="w-full h-full rounded cursor-crosshair relative z-10 bg-transparent"></canvas>
              <button type="button" class="absolute top-1 right-1 text-[8px] bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shadow-sm z-20 no-print" onclick="clearSignature('medico')">Borrar</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
