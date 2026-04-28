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
        target: "http://bridge:8000",
        changeOrigin: true,
      },
      // Luồng cho Dashboard và các tab khác
      "/ws/stream": {
        target: "ws://bridge:8000",
        ws: true,
      },
      // Luồng độc lập dành riêng cho Clustering
      "/ws/clusters": {
        target: "ws://streaming-server:8000",
        ws: true,
      },
    },
  },
  assetsInclude: ["**/*.svg", "**/*.csv"],
});
