# DocuMed - Reglas de Arquitectura y Desarrollo (Enterprise Standard)

Este documento establece las directrices estrictas de desarrollo para mantener el grado de producción, la precisión legal y la estabilidad multiplataforma de la aplicación DocuMed. Cualquier modificación o refactorización futura debe adherirse incondicionalmente a estas reglas.

## 1. Gestión del Estado (Encapsulación)
- **PROHIBIDO** el uso de variables globales ancladas al objeto `window` (ej. `window.padPaciente`, `window.testigoCounter`).
- Todo el estado transitorio y las referencias a instancias de librerías de terceros deben estar estrictamente encapsulados en objetos inmutables a nivel de módulo (ej. `const SignatureState = { paciente: null, medico: null, testigos: [], resizeListenerAdded: false }`).

## 2. Precisión Legal y Manejo de Fechas
- **PROHIBIDO** instanciar fechas directamente desde valores de input (strings ISO) usando `new Date("YYYY-MM-DD")`. Esto provoca fallos críticos debido a los desfases de zonas horarias negativas (UTC) que retrasan el calendario un día.
- **REGLA:** Utilizar SIEMPRE el helper `parseLocalDate(str)` que extrae manualmente año, mes y día mediante `.split('-')` e invoca el constructor local `new Date(y, m - 1, d)`.
- Centralizar la lógica legal condicional (ej. comprobación de mayoría de edad) en funciones puras (`calcularEdadExacta`) para respetar rigurosamente el Principio DRY (Don't Repeat Yourself).

## 3. Accesibilidad Operativa (A11y)
- En entornos hospitalarios de alta presión, la dependencia del ratón debe minimizarse.
- Todos los componentes interactivos personalizados (como buscadores predictivos, autocompletados de CIE-10 o fármacos) **deben soportar navegación fluida por teclado**.
- Es obligatorio gestionar una variable de índice (`selectedIndex`) e interceptar los eventos `keydown` para las teclas `ArrowUp`, `ArrowDown`, `Enter` y `Escape`.

## 4. Gestión de Memoria y Rendimiento (DOM)
- **Prevención de Fugas de Memoria:** Antes de destruir nodos del DOM (por ejemplo, al ejecutar `innerHTML` para cambiar de plantilla), es obligatorio ejecutar métodos de recolección de basura manual. Por ejemplo, llamar explícitamente a `.off()` en todas las instancias activas de `SignaturePad`.
- **Limpieza de EventListeners:** Para listeners vinculados de forma dinámica a elementos, es obligatorio instanciar un `AbortController` y pasar su `{ signal }`. Al destruir o reiniciar el componente, se debe invocar `.abort()` para purgar la memoria.

## 5. Infraestructura PWA y Activos Estáticos
- La carpeta `/public` es la única fuente de verdad para los iconos, tipografías y el manifiesto.
- **Redundancia por Fallback:** El archivo `manifest.webmanifest` siempre debe incluir la redundancia estructural: declarar iconos tradicionales (`"purpose": "any"`) para compatibilidad con Windows/macOS, e iconos adaptativos (`"purpose": "maskable"`) para Android/ChromeOS.

## 6. Procedimiento DevOps y Resolución de Conflictos
- La resolución de conflictos de Git (Merge Conflicts) jamás debe ejecutarse a ciegas sobrescribiendo el archivo. 
- Se debe asegurar que las barreras defensivas (como `try/catch` envolviendo a `localStorage` o los `AbortController`) sobrevivan a la fusión de ramas.
