import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base: the studio uses hash routes, so the same build works on GitHub Pages
// under /pixel-mask-engine/, on a custom domain, or from any other folder.
export default defineConfig({
  base: "./",
  plugins: [react()],
  // The studio imports the library's source, which resolves React from its own
  // package. Dedupe so both sides share one copy.
  resolve: { dedupe: ["react", "react-dom"] },
  build: { outDir: "dist", emptyOutDir: true },
  server: { open: true }
});
