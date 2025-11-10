import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import copy from "rollup-plugin-copy-watch";

export default {
    input: "scripts/isolated.ts",
    output: {
        dir: "dist",
        format: "iife",
        inlineDynamicImports: true
    },
    plugins: [
        resolve(),
        typescript(),
        copy({
            watch: ["manifest.json", "static/styles"],
            targets: [
                { src: "static/*", dest: "dist/static" },
                { src: "manifest.json", dest: "dist" },
            ],
        }),
        terser()
    ],
};
