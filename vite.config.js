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
        login: "/src/html/index_login.html",
        rockets: "/src/html/index_rockets.html",
        signup: "./src/html/index_signup.html",
        // Add more entries for other HTML pages as needed
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
        // Don't change the HTML file paths; they'll go directly to dist
      },
    },
  },
});
