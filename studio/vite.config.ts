import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const src = (pkg: string, file: string) => fileURLToPath(new URL(`../packages/${pkg}/src/${file}`, import.meta.url));

// Relative base: the studio uses hash routes, so the same build works on GitHub Pages
// under /pixel-kit/, on a custom domain, or from any other folder.
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    // The studio shows the current source of both packages, never a build. The engine imports the
    // sprites package by name, and map collision data lives in a module-level WeakMap there, so
    // every import of it has to land on the same file or a map built by one copy would not block a
    // walker from the other. Keep these in step with `paths` in tsconfig.json.
    alias: [
      { find: /^@ragtechdev\/pixel-sprites$/, replacement: src("pixel-sprites", "index.ts") },
      { find: /^@ragtechdev\/pixel-sprites\/canvas$/, replacement: src("pixel-sprites", "canvas/index.ts") },
      { find: /^@ragtechdev\/pixel-sprites\/react$/, replacement: src("pixel-sprites", "react/index.tsx") },
      { find: /^@ragtechdev\/pixel-engine$/, replacement: src("pixel-engine", "index.ts") },
      { find: /^@ragtechdev\/pixel-engine\/dom$/, replacement: src("pixel-engine", "dom/index.ts") },
      { find: /^@ragtechdev\/pixel-engine\/react$/, replacement: src("pixel-engine", "react/index.tsx") }
    ],
    // Both packages resolve React from their own folders. Dedupe so they share one copy.
    dedupe: ["react", "react-dom"]
  },
  build: { outDir: "dist", emptyOutDir: true },
  server: { open: true }
});
