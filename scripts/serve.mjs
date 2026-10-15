import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

// Dependency-free static preview for the production export. Not an order server.
const root = resolve("out");
const port = Number(process.env.PORT || 3000);
const types = { ".html":"text/html; charset=utf-8", ".css":"text/css", ".js":"text/javascript", ".svg":"image/svg+xml", ".png":"image/png", ".xml":"application/xml", ".txt":"text/plain", ".json":"application/json" };
createServer(async (req, res) => {
  try {
    let file = resolve(root, "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname));
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    const data = await readFile(file);
    res.writeHead(200, { "content-type":types[extname(file)] || "application/octet-stream", "x-content-type-options":"nosniff" });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type":"text/html; charset=utf-8" });
    res.end(await readFile(resolve(root, "404.html")));
  }
}).listen(port, "0.0.0.0", () => console.log(`Demo static export: http://localhost:${port}`));
