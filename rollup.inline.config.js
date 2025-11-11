import alias from "@rollup/plugin-alias";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import scss from "rollup-plugin-scss";
import terser from "@rollup/plugin-terser";

export default {
    input: "scripts/inline.ts",
    output: {
        dir: "dist",
        format: "iife",
        inlineDynamicImports: true,
        assetFileNames: "[name][extname]"
    },
    plugins: [
        alias({
            entries: [
                { find: "@", replacement: "scripts" }
            ]
        }),
        resolve({
            extensions: [".js", ".ts"]
        }),
        typescript(),
        scss({
            output: "dist/styles/",
            fileName: "styles.css"
        }),
        terser()
    ],
};
