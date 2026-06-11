import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules/firebase") || id.includes("node_modules/@firebase"))
            return "firebase";
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3"))
            return "charts";
          if (id.includes("node_modules/xlsx")) return "xlsx";
          return undefined;
        },
      },
    },
  },
});
