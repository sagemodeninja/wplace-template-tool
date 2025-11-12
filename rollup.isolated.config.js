import alias from "@rollup/plugin-alias";
import replace from "@rollup/plugin-replace";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import scss from "rollup-plugin-scss";
import copy from "rollup-plugin-copy-watch";
import terser from "@rollup/plugin-terser";

const isWatch = process.env.ROLLUP_WATCH === "true";

export default {
    input: "scripts/isolated.ts",
    output: {
        dir: "dist",
        format: "iife",
        inlineDynamicImports: true,
        assetFileNames: "[name][extname]",
        sourcemap: true
    },
    plugins: [
        alias({
            entries: [
                { find: "@", replacement: "scripts" }
            ]
        }),
        replace({
            SCRIPT_WORLD: "\"ISOLATED\"",
            preventAssignment: true
        }),
        resolve({
            extensions: [".js", ".ts"]
        }),
        typescript(),
        copy({
            watch: isWatch && ["manifest.json", "static/styles"],
            targets: [
                { src: "static/*", dest: "dist/static" },
                { src: "manifest.json", dest: "dist" },
            ],
        }),
        scss({
            fileName: "static/styles/index.css"
        }),
        terser()
    ],
};
