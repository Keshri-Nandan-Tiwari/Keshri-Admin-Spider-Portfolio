const opentype = require("opentype.js");
const fs = require("fs");
const path = require("path");

const fontPath = path.join(
  __dirname,
  "..",
  "node_modules/@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff"
);

const text = "Developer Keshri Nandan";
const fontSize = 200;

const font = opentype.parse(fs.readFileSync(fontPath).buffer);
const scale = (1 / font.unitsPerEm) * fontSize;

// Take each unique glyph's outline ONCE at the origin, deep-copy it, and
// offset it manually (avoids a caching quirk when reusing a glyph object).
const baseCache = {};
function baseCommands(ch) {
  if (!baseCache[ch]) {
    const g = font.charToGlyph(ch);
    baseCache[ch] = JSON.parse(JSON.stringify(g.getPath(0, 0, fontSize).commands));
  }
  return JSON.parse(JSON.stringify(baseCache[ch]));
}

let x = 0;
let prev = null;
const cmds = [];
const glyphs = [];
for (const ch of text) {
  const g = font.charToGlyph(ch);
  if (prev) x += font.getKerningValue(prev, g) * scale;
  if (ch !== " ") {
    const gc = [];
    for (const c of baseCommands(ch)) {
      for (const k of ["x", "x1", "x2"]) if (typeof c[k] === "number") c[k] += x;
      cmds.push(c);
      gc.push(c);
    }
    glyphs.push(gc);
  }
  x += (g.advanceWidth || 0) * scale;
  prev = g;
}

const r = (n) => Math.round(n * 100) / 100;
const ser = (list) => { let o = ""; for (const c of list) {
  if (c.type === "M") o += `M${r(c.x)} ${r(c.y)}`;
  else if (c.type === "L") o += `L${r(c.x)} ${r(c.y)}`;
  else if (c.type === "Q") o += `Q${r(c.x1)} ${r(c.y1)} ${r(c.x)} ${r(c.y)}`;
  else if (c.type === "C") o += `C${r(c.x1)} ${r(c.y1)} ${r(c.x2)} ${r(c.y2)} ${r(c.x)} ${r(c.y)}`;
  else if (c.type === "Z") o += "Z"; } return o; };
const glyphD = glyphs.map(ser);
let d = "";
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
const track = (px, py) => { minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py); };
for (const c of cmds) {
  if (c.type === "M") { d += `M${r(c.x)} ${r(c.y)}`; track(c.x, c.y); }
  else if (c.type === "L") { d += `L${r(c.x)} ${r(c.y)}`; track(c.x, c.y); }
  else if (c.type === "Q") { d += `Q${r(c.x1)} ${r(c.y1)} ${r(c.x)} ${r(c.y)}`; track(c.x, c.y); }
  else if (c.type === "C") { d += `C${r(c.x1)} ${r(c.y1)} ${r(c.x2)} ${r(c.y2)} ${r(c.x)} ${r(c.y)}`; track(c.x, c.y); }
  else if (c.type === "Z") { d += "Z"; }
}
const bbox = { x1: minX, y1: minY, x2: maxX, y2: maxY };
if (d.includes("NaN")) throw new Error("NaN still present in path data");

fs.writeFileSync(
  path.join(__dirname, "..", "src/data/neonPath.js"),
  `// Auto-generated from the actual Great Vibes glyph outlines via opentype.js.
// Real cursive stroke path for "Developer Keshri Nandan".
export const NEON_PATH_D = ${JSON.stringify(d)};
export const NEON_GLYPHS = ${JSON.stringify(glyphD)};
export const NEON_VIEWBOX = ${JSON.stringify(`${(bbox.x1 - 20).toFixed(1)} ${(bbox.y1 - 20).toFixed(1)} ${(bbox.x2 - bbox.x1 + 40).toFixed(1)} ${(bbox.y2 - bbox.y1 + 40).toFixed(1)}`)};
`
);
console.log("OK, path chars:", d.length, "subpaths:", (d.match(/M/g) || []).length);
