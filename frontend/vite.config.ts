import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev proxy: /api and /uploads go to the FastAPI backend.
// In production (docker) nginx handles the same proxying.
export default defineConfig({
  base: "/recipes-staging/",
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

