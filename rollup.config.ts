import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

export default {
  input: "src/index.ts", // Entry point for the bundle (main TypeScript file)
  output: {
    file: "app/index.js", // Output file location and name
    format: "es", // Output format: ES module
    sourcemap: false, // Generate sourcemaps for easier debugging
  },
  plugins: [
    terser(), // Use terser for minification to make the bundle smaller
    typescript({
      tsconfig: "./tsconfig.json", // Use this tsconfig file to configure TypeScript compilation
    }),
  ],
};
