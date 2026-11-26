// Keeps the documentation honest. Code in the docs and on the home page imports names from the packages; if an export is
// renamed or removed, a snippet would quietly stop working. This checks every imported name is a real export, and that the
// Docs quick start is exactly the README's, which the engine's own tests run.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../..", import.meta.url));
const read = (file) => readFileSync(join(root, file), "utf8");

const entries = {
    "@ragtechdev/pixel-sprites": "packages/pixel-sprites/src/index.ts",
    "@ragtechdev/pixel-sprites/canvas": "packages/pixel-sprites/src/canvas/index.ts",
    "@ragtechdev/pixel-sprites/react": "packages/pixel-sprites/src/react/index.tsx",
    "@ragtechdev/pixel-engine": "packages/pixel-engine/src/index.ts",
    "@ragtechdev/pixel-engine/dom": "packages/pixel-engine/src/dom/index.ts",
    "@ragtechdev/pixel-engine/react": "packages/pixel-engine/src/react/index.tsx"
};

/** The runtime names an entry exports, read from the bundle's metafile. */
async function exportsOf(file) {
    const result = await build({
        entryPoints: [join(root, file)],
        bundle: true,
        write: false,
        format: "esm",
        metafile: true,
        outdir: "out",
        external: ["react", "react-dom", "react/jsx-runtime", "@ragtechdev/*"],
        logLevel: "silent"
    });
    return new Set(Object.values(result.metafile.outputs)[0].exports);
}

/** Every `import { a, b } from "@ragtechdev/..."`, in real imports and in code shown in strings. Type-only names are skipped. */
function importsIn(source) {
    const found = [];
    for (const match of source.matchAll(/import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+"(@ragtechdev\/[^"]+)"/g)) {
        for (const part of match[1].split(",")) {
            const name = part.trim();
            if (!name || name.startsWith("type ")) continue;
            found.push({ name: name.split(/\s+as\s+/)[0].trim(), from: match[2] });
        }
    }
    return found;
}

const pages = ["studio/src/pages/Docs.tsx", "studio/src/pages/Home.tsx", "studio/src/pages/Play.tsx"];

test("every name the docs, the home page and the Play page import from our packages is a real export", async () => {
    const exported = {};
    for (const [specifier, file] of Object.entries(entries)) exported[specifier] = await exportsOf(file);
    let checked = 0;
    for (const page of pages) {
        for (const { name, from } of importsIn(read(page))) {
            assert.ok(exported[from], `${page} imports from ${from}, which is not an entry`);
            assert.ok(exported[from].has(name), `${page}: ${name} is not exported by ${from}`);
            checked += 1;
        }
    }
    assert.ok(checked >= 40, `only ${checked} imports were found, so the pattern may have stopped matching`);
});

test("the engine topics are in the Docs menu, in order, before the design rules", () => {
    const docs = read("studio/src/pages/Docs.tsx");
    const ids = [...docs.matchAll(/^\s+\["([a-z-]+)", "[^"]+"\],?$/gm)].map((m) => m[1]);
    const at = (id) => ids.indexOf(id);
    assert.ok(at("engine") > at("outside-react"), "after the sprites topics");
    assert.ok(at("engine") < at("engine-loop") && at("engine-loop") < at("engine-world"), "in reading order");
    assert.ok(at("engine-world") < at("rules"), "before the design rules, which end the docs");
    for (const id of ["engine", "engine-loop", "engine-world"]) {
        assert.ok(docs.includes(`${id.includes("-") ? `"${id}"` : id}: () =>`), `${id} has a page`);
    }
});

test("the Docs quick start is the README's quick start, which the engine's tests run", () => {
    const docs = /code=\{`(import \{ buildAvatar[\s\S]*?)`\} \/>/.exec(read("studio/src/pages/Docs.tsx"))?.[1];
    const readme = /```ts\n(import \{ buildAvatar[\s\S]*?)\n```/.exec(read("packages/pixel-engine/README.md"))?.[1];
    assert.ok(docs, "the quick start is in Docs.tsx");
    assert.ok(readme, "the quick start is in the engine README");
    assert.equal(docs, readme);
});
