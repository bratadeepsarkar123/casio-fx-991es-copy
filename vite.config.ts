import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const base = process.env.VITE_BASE ?? "/casio-fx-991es-copy/";

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "assets/chassis-fx-991es-plus-2.png",
        "keymap.json",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/icon-maskable-512.png",
      ],
      manifest: {
        name: "Casio fx-991ES PLUS-2",
        short_name: "fx-991ES+",
        description:
          "Web clone of the Casio fx-991ES PLUS 2nd edition scientific calculator",
        theme_color: "#8a97a8",
        background_color: "#1a1d22",
        display: "standalone",
        orientation: "portrait",
        start_url: base,
        scope: base,
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,jpg,svg,json,woff2,ico}"],
        navigateFallback: `${base}index.html`,
        runtimeCaching: [],
      },
    }),
  ],
  build: {
    sourcemap: true,
    target: "es2022",
  },
});
