// =========================================================================
// templates.js — DocuMed · Configuración de Plantillas de Documentos
// =========================================================================
import { DOC_INFORME_MEDICO } from './doc_informe_medico.js';
import { DOC_INFORME_ENFERMERIA } from './doc_informe_enfermeria.js';
import { DOC_ALTA_VOLUNTARIA } from './doc_alta_voluntaria.js';

const DOC_TEMPLATES = {
  informe_medico: DOC_INFORME_MEDICO,
  informe_enfermeria: DOC_INFORME_ENFERMERIA,
  alta_voluntaria: DOC_ALTA_VOLUNTARIA,
};

export { DOC_TEMPLATES };
