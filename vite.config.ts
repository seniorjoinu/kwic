import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
// import devtools from 'solid-devtools/vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import path from 'path';

export default defineConfig({
  root: 'src/app_frontend_js',
  publicDir: 'src/app_frontend_js/assets',
  plugins: [
    /* 
    Uncomment the following line to enable solid-devtools.
    For more info see https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
    */
    // devtools(),
    solidPlugin(),
    wasm(),
    topLevelAwait(),
  ],
  resolve: {
    alias: {
      "declarations": path.resolve(__dirname, "src", "declarations", "app_backend")
    }
  },
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  }
});
