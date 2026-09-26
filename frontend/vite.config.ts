import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Deployment base path. Local dev defaults to "/".
// For the staging sub-path deployment set VITE_BASE_PATH=/recipes-staging/
// at build time (docker compose passes it through automatically).
// The API client (src/api/client.ts) derives its request prefix from this.
const BASE_PATH = process.env.VITE_BASE_PATH || "/";

// Dev proxy: /api and /uploads go to the FastAPI backend.
// In production (docker) nginx handles the same proxying.
export default defineConfig({
  base: BASE_PATH,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});