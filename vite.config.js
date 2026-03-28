import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: ".", // Set the root to the project root
  server: {
    open: "/index.html", // Set the default page to open
  },
  build: {
    outDir: "dist", // Ensure build outputs to the correct directory
    rollupOptions: {
      input: {
        index: "/index.html",
        simulation: "/src/html/index_simulation.html",
        details: "/src/html/index_details.html",
        rockets: "/src/html/index_rockets.html",
        iss: "/src/html/index_iss.html",
        weather: "/src/html/index_weather.html",
        exoplanets: "/src/html/index_exoplanets.html",
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
});
