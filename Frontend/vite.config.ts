import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const devApiTarget = process.env.VITE_DEV_API_TARGET || "http://localhost:4002";
const appBasePath = process.env.VITE_APP_BASE_PATH || "/";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: appBasePath,
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: devApiTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "build",
    emptyOutDir: true,
  },
});
