import { defineConfig } from "tsup";

export default defineConfig(options => ({
  entry: ["./src/index.ts"],
  format: ["cjs"],
  noExternal: [ /(.*)/ ],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  bundle: true,
}));
