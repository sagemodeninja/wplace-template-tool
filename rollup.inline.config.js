import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

export default {
    input: "scripts/inline.ts",
    output: {
        dir: "dist/scripts",
        format: "iife",
        inlineDynamicImports: true
    },
    plugins: [
        resolve(),
        typescript(),
        terser()
    ],
};
