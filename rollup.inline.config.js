import alias from "@rollup/plugin-alias";
import replace from "@rollup/plugin-replace";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { litScss } from "rollup-plugin-scss-lit";
import terser from "@rollup/plugin-terser";

export default {
    input: "scripts/inline.ts",
    output: {
        dir: "dist",
        format: "iife",
        inlineDynamicImports: true,
    },
    plugins: [
        alias({
            entries: [
                { find: "@", replacement: "scripts" }
            ]
        }),
        replace({
            SCRIPT_WORLD: "\"INLINE\"",
            preventAssignment: true
        }),
        resolve({
            extensions: [".js", ".ts"]
        }),
        litScss({
            include: ["scripts/**/*.scss"]
        }),
        typescript(),
        terser()
    ],
};
