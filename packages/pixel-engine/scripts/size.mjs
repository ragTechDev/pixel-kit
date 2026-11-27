// Reports the gzipped size of each entry including the shared chunks it imports, and
// fails when an entry goes over its budget. The peer dependencies (@ragtechdev/pixel-sprites
// and react) are not counted: they are external to this package.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

// Gzipped bytes. Raise a budget on purpose, in the same commit that explains why.
// Raised by about 600 B each for `createMover` (free pixel movement), which is 1562 -> 2159 B for the core entry.
// Raised by about 450 B each for `createCarry` (an avatar picking an object up and holding it): the core entry is 2159 -> 2600 B.
const BUDGETS = { "index.js": 2700, "dom.js": 3250, "react.js": 3550 };

function collect(file, seen = new Set()) {
  if (seen.has(file)) return seen;
  seen.add(file);
  const src = readFileSync(`dist/${file}`, "utf8");
  for (const m of src.matchAll(/(?:from|import)\s*["']\.\/([^"']+)["']/g)) collect(m[1], seen);
  return seen;
}
const measure = (files) => {
  const code = [...files].map((f) => readFileSync(`dist/${f}`, "utf8")).join("\n");
  return { min: Buffer.byteLength(code), gzip: gzipSync(code, { level: 9 }).length };
};

let over = false;
const all = new Set();
for (const [entry, budget] of Object.entries(BUDGETS)) {
  const files = collect(entry);
  files.forEach((f) => all.add(f));
  const { min, gzip } = measure(files);
  const flag = gzip > budget ? "  OVER BUDGET" : "";
  if (gzip > budget) over = true;
  console.log(`${entry.padEnd(10)} ${min} B min, ${gzip} B gzip (budget ${budget} B)${flag}`);
}
const total = measure(all);
console.log(`${"total".padEnd(10)} ${total.min} B min, ${total.gzip} B gzip`);
if (over) {
  console.error("An entry is over its size budget.");
  process.exit(1);
}
