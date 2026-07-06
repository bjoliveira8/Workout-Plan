// Builds the single-file dist/index.html: bundles src/entry.jsx (React included,
// minified IIFE) and inlines it into the HTML shell. Deploy = upload dist/index.html.
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

await build({
  entryPoints: ["src/entry.jsx"],
  bundle: true,
  minify: true,
  format: "iife",
  jsx: "automatic",
  loader: { ".jsx": "jsx" },
  outfile: ".tmp-bundle.js",
});

// </script> inside the JS would terminate the inline tag prematurely — escape it.
const bundle = readFileSync(".tmp-bundle.js", "utf8").replace(/<\/script>/g, "<\\/script>");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<title>Press / Priority — Workout Tracker</title>
<meta name="theme-color" content="#131518">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="mobile-web-app-capable" content="yes">
<style>html,body{margin:0;padding:0;background:#131518;-webkit-text-size-adjust:100%}</style>
</head>
<body>
<div id="root"></div>
<script>${bundle}</script>
</body>
</html>`;

mkdirSync("dist", { recursive: true });
writeFileSync("dist/index.html", html);
console.log(`dist/index.html built (${Math.round(html.length / 1024)} KB)`);
