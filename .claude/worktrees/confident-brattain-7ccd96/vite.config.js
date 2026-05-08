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
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      injectRegister: null,
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
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}'],
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
