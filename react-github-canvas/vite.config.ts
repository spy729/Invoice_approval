// @ts-nocheck
/// <reference lib="ESNext" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { fileURLToPath } from "url";

// __dirname shim for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
/** @param {{ mode?: string }} param0 */
export default defineConfig(({ mode }: { mode?: string }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Proxy API requests to backend during development
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Build output configured to be served by the backend's public directory when
  // this project is placed under Invoice_approval/frontend. The path here
  // points to ../../Invoice_approval/backend/public when this repo structure
  // is preserved; keep it relative to this package root so builds land in the
  // backend's public folder for easy static serving.
  build: {
  outDir: 'dist',
  emptyOutDir: true,
},
}));
