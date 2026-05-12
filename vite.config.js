import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// vfs_fonts.js usa 'this.pdfMake = ...' (UMD global). En ESM strict, 'this' es undefined.
// Este plugin transforma el archivo en ambos modos (dev+build) para añadir export default.
// En dev: el esbuild plugin (optimizeDeps.esbuildOptions.plugins) transforma vfs_fonts.
// En build: Rollup no usa esbuild, por eso apply:'build' evita duplicar el export default.
const vfsFontsPlugin = {
  name: 'vfs-fonts-esm',
  apply: 'build',
  transform(code, id) {
    if (!id.includes('vfs_fonts')) return null;
    return {
      code: `var __vfs = {};\n${code.replace(/\bthis\b/g, '__vfs')}\nexport default __vfs;`,
      map: null,
    };
  },
};

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 5000,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        // Chunks de pdfMake con nombre estable y predecible.
        // Sin manualChunks, Rollup asigna hashes opacos; con ellos, el auditor
        // puede verificar directamente en el manifiesto de precache que
        // "vendor-pdfmake-fonts-[hash].js" está incluido y no fue excluido
        // por maximumFileSizeToCacheInBytes.
        manualChunks(id) {
          if (id.includes('/pdfmake/build/pdfmake'))   return 'vendor-pdfmake';
          if (id.includes('/pdfmake/build/vfs_fonts'))  return 'vendor-pdfmake-fonts';
        },
      },
    },
  },
  optimizeDeps: {
    include: ['pdfmake/build/pdfmake', 'pdfmake/build/vfs_fonts'],
    // Plugin esbuild para el pre-bundling de dev: misma transformación que vfsFontsPlugin para Rollup
    esbuildOptions: {
      plugins: [
        {
          name: 'vfs-fonts-esm-esbuild',
          setup(build) {
            build.onLoad({ filter: /vfs_fonts\.js$/ }, async (args) => {
              const { readFileSync } = await import('fs');
              const code = readFileSync(args.path, 'utf-8');
              return {
                contents: `var __vfs = {};\n${code.replace(/\bthis\b/g, '__vfs')}\nexport default __vfs;\n`,
                loader: 'js',
              };
            });
          },
        },
      ],
    },
  },
  plugins: [
    vfsFontsPlugin,
    VitePWA({
      // CRÍTICO — 'autoUpdate' activa el nuevo SW en segundo plano y recarga
      // la página sin confirmación del usuario, destruyendo el estado efímero
      // del informe en redacción. Con 'prompt', el SW instalado permanece en
      // estado 'waiting' hasta que main.js invoca updateSW(true) tras la
      // confirmación explícita del usuario.
      registerType: 'prompt',
      strategies: 'generateSW',
      injectRegister: null,      // main.js gestiona el registro vía virtual:pwa-register
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'DocuMed - Informe Clínico',
        short_name: 'DocuMed',
        start_url: '/',
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#0f172a',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // 10 MB — vfs_fonts.js contiene fuentes tipográficas embebidas como
        // dataURIs base64 y puede superar 2 MB minificado. El límite por defecto
        // de Workbox (2 MB) lo excluiría silenciosamente del precache, rompiendo
        // la generación de PDFs en modo offline.
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,

        // Captura todos los artefactos del build de Rollup: chunks JS con hash
        // de contenido (incluidos vendor-pdfmake.js y vendor-pdfmake-fonts.js),
        // hojas de estilo, HTML de entrada, iconos PNG y fuentes web.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}'],

        // skipWaiting: false (valor por defecto de Workbox, explicitado aquí
        // como documentación de intención). vite-plugin-pwa en modo 'prompt'
        // inyecta un listener de mensajes en el SW generado que llama
        // self.skipWaiting() ÚNICAMENTE cuando recibe { type: 'SKIP_WAITING' }.
        // main.js envía ese mensaje desde updateSW(true) tras la confirmación.
        skipWaiting: false,

        // clientsClaim: true — tras la activación del nuevo SW (post-skipWaiting),
        // claims todos los tabs abiertos. Esto dispara el evento 'controllerchange'
        // en navigator.serviceWorker, que updateSW(true) usa internamente para
        // invocar window.location.reload() en el tab activo del usuario.
        // Sin este flag, el reload programático de main.js no funciona.
        clientsClaim: true,

        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 31536000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 31536000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
