# DocuMed - Project Rules & Context

## Project Context
- **Name**: DocuMed PWA
- **Mission**: Generación de informes médicos extrahospitalarios e informes de negativa (Alta Voluntaria) con validez legal.
- **Stack**: Vanilla JavaScript (ES6+), HTML5, Tailwind CSS (via CDN), pdfMake (v0.2), SignaturePad (v4).
- **Environment**: PWA (Progressive Web App) con soporte Offline total.

## Architecture & Modularization
- **Strict Separation**: Se mantiene la división de responsabilidades en archivos independientes:
  - `data.js`: Repositorio único de constantes y bases de datos estáticas (CIE-10, Fármacos, Hospitales).
  - `templates.js`: Motor de renderizado dinámico y lógica legal de los documentos PDF.
  - `app.js`: Controlador central, gestión del DOM, persistencia y eventos.
  - `index.html`: Estructura de navegación y contenedores de formulario.
  - `sw.js`: Service Worker para gestión de caché (Estrategia: Cache-First para librerías, Network-First para assets locales).

## Coding Rules
- **No Build Tools**: PROHIBIDO el uso de compiladores, empaquetadores (NPM, Vite, Webpack) o frameworks (React/Vue). El código debe ser Vanilla JS ejecutable nativamente.
- **Styling**: Uso exclusivo de clases de utilidad de Tailwind CSS. Evitar CSS plano a menos que sea para `@media print`.
- **Naming Convention**: 
  - Funciones y variables: `camelCase` en español (ej. `generarPDF`, `switchTemplate`).
  - Constantes de datos: `SCREAMING_SNAKE_CASE` (ej. `HOSPITALES_DB`).
- **DOM Access**: Preferir `document.getElementById` y `querySelector`. Evitar la manipulación directa de estilos si se puede usar `classList`.
- **Signatures**: Las firmas deben gestionarse con SignaturePad, asegurando siempre el escalado de resolución para dispositivos móviles y pantallas Retina.

## Document Logic & Legal
- **PDF Generation**: Se utiliza pdfMake mediante objetos de definición dinámicos generados en `templates.js`.
- **Legal Compliance**: Cualquier documento de negativa debe fundamentarse en la Ley 41/2002 de autonomía del paciente.
- **Tutor Legal**: Si el paciente es menor de 18 años, es obligatorio capturar y mostrar los datos del tutor legal en la firma.

## PWA & Persistence
- **State**: Los datos clínicos no se guardan. La configuración de empresa y facultativo debe persistir únicamente en `localStorage`.
- **Versioning**: Cada modificación en la lógica de archivos `.js` requiere un incremento de versión en `CACHE_NAME` dentro de `sw.js`.

## Interaction Tone
- **Technical Content**: Riguroso, analítico y cínico con la ineficiencia.
- **General Tone**: Directo y audaz.