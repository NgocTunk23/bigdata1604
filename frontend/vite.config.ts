import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

function figmaAssetResolver() {
  return {
    name: "figma-asset-resolver",
    resolveId(id: string) {
      if (id.startsWith("figma:asset/")) {
        const filename = id.replace("figma:asset/", "");
        return path.resolve(__dirname, "src/assets", filename);
      }
    },
  };
}

// frontend/vite.config.ts
export default defineConfig({
  plugins: [figmaAssetResolver(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://streaming-server:8000", // Đổi từ bridge -> streaming-server
        changeOrigin: true,
      },
      "/ws/stream": {
        target: "ws://streaming-server:8000",   // Đổi từ bridge -> streaming-server
        ws: true,
      },
      "/ws/clusters": {
        target: "ws://streaming-server:8000",
        ws: true,
      },
    },
  },
  assetsInclude: ["**/*.svg", "**/*.csv"],
});
