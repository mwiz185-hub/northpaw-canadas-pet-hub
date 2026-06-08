import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { renameSync, existsSync } from "fs";
import { resolve } from "path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

// Standalone SPA build for Capacitor (iOS / Android).
// Does NOT use TanStack Start / SSR — pure client-side React + TanStack Router.

function renameHtmlOutput(outDir: string): Plugin {
  return {
    name: "rename-html-output",
    closeBundle() {
      const src = resolve(outDir, "index.mobile.html");
      const dest = resolve(outDir, "index.html");
      if (existsSync(src)) {
        renameSync(src, dest);
      }
    },
  };
}

const outDir = resolve(__dirname, "dist/mobile");

export default defineConfig({
  plugins: [react(), tailwindcss(), renameHtmlOutput(outDir)],
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index.mobile.html"),
    },
  },
});
