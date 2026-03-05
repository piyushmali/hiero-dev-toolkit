import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    outDir: "dist/esm",
    dts: {
      entry: "src/index.ts",
      outDir: "dist/types"
    },
    sourcemap: true,
    clean: true,
    target: "es2022"
  },
  {
    entry: ["src/index.ts"],
    format: ["cjs"],
    outDir: "dist/cjs",
    sourcemap: true,
    clean: false,
    target: "es2022",
    outExtension() {
      return {
        js: ".cjs"
      };
    }
  }
]);
