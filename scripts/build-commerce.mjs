import { build } from "esbuild";
await build({ entryPoints: ["commerce/worker.ts"], outfile: "commerce/dist/worker.js", bundle: true, format: "esm", platform: "browser", target: "es2022", minify: false });
console.log("Sandbox Worker compiled. No credentials embedded; not deployed.");
