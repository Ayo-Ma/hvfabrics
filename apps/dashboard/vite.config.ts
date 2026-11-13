import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Fonts, logo and illustrations live in the repo-level assets/ folder.
  server: { port: 5180, fs: { allow: ["../.."] } },
  worker: { format: "es" },
  // The AVIF/WebP encoders ship as WebAssembly; keep them out of dependency pre-bundling.
  optimizeDeps: { exclude: ["@jsquash/avif", "@jsquash/webp"] },
  build: { target: "es2022" },
});
