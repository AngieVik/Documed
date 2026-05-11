// store.js — Single Source of Truth para DocuMed PWA
// Estado plano mutable. Sin Proxy, sin observadores (Navaja de Ockham).

/**
 * Estado global de la aplicación. Única fuente de verdad para generarPDF()
 * y cualquier lógica de negocio. El DOM se usa exclusivamente para presentación.
 */
export const AppState = {
  /** Clave de la plantilla activa (key de DOC_TEMPLATES). */
  templateKey: null,

  /**
   * Espejo plano de todos los campos con ID dentro de #dynamic-content.
   * Los selects almacenan también [id + '__text'] con el texto de la opción seleccionada,
   * ya que algunos campos requieren el texto visible, no el value interno.
   * @type {{ [fieldId: string]: string | boolean }}
   */
  form: {},

  /**
   * Constantes vitales por toma, indexadas por data-const-idx del elemento DOM.
   * Se inicializa con una entrada vacía al renderizar la plantilla.
   * @type {Array<{ ta: string, fc: string, spo2: string, temp: string, gluc: string }>}
   */
  constantes: [],

  /**
   * Datos textuales de testigos sin referencias al DOM ni a instancias de SignaturePad.
   * La firma (dataURL) se obtiene de SignatureState en el momento de generar el PDF,
   * ya que es un objeto computado efímero que no debe persistir en estado serializable.
   * @type {Array<{ index: number, nombre: string, dni: string }>}
   */
  testigos: [],
};

/**
 * Resetea el estado de sesión al cambiar de plantilla o limpiar el formulario.
 * Preserva templateKey intencionalmente — el selector de plantilla no cambia.
 */
export function resetFormState() {
  AppState.form       = {};
  AppState.constantes = [];
  AppState.testigos   = [];
}
