// Keeps the documentation and the starter honest. Code in the docs, on the home page and in the generated starter imports names from the packages; if an export is
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

// The starter that `npm create @ragtechdev/pixel-game` writes is code a stranger will run, so it gets the same check as the docs.
const starter = ["main", "game", "maps"].map((name) => `packages/create-pixel-game/template/src/${name}.ts`);
const pages = ["studio/src/pages/Docs.tsx", "studio/src/pages/Home.tsx", "studio/src/pages/Play.tsx", ...starter];

test("every name the docs, the home page, the Play page and the generated starter import from our packages is a real export", async () => {
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

/** The grouped topics, from docTopics.ts (which holds no React, so it can be bundled and imported as it is). */
async function loadTopics() {
    const bundle = await build({ entryPoints: [join(root, "studio/src/pages/docTopics.ts")], bundle: true, write: false, format: "esm", logLevel: "silent" });
    return import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
}

test("the topics are grouped, in reading order, with the engine after the sprites and the rules last", async () => {
    const { docGroups, docSections } = await loadTopics();
    assert.deepEqual(docGroups.map((group) => group.title), ["Sprites", "Engine", "Reference"]);
    const ids = docSections.map(([id]) => id);
    assert.equal(new Set(ids).size, ids.length, "no topic appears twice");
    for (const group of docGroups) assert.ok(group.topics.length > 0, `${group.title} is not empty`);
    const at = (id) => ids.indexOf(id);
    assert.ok(at("outside-react") < at("engine"), "the sprites come before the engine");
    assert.ok(at("engine") < at("engine-loop") && at("engine-loop") < at("engine-world"), "the engine topics are in reading order");
    assert.equal(ids.at(-1), "rules", "the design rules end the docs");
    assert.equal(ids[0], "start", "and it starts with getting started");
});

test("every topic has a page, a menu label and a heading", async () => {
    const { docTopics, docTitle } = await loadTopics();
    const docs = read("studio/src/pages/Docs.tsx");
    for (const [id, label] of docTopics) {
        assert.ok(new RegExp(`^\\s+(?:"${id}"|${id}): \\(\\) =>`, "m").test(docs), `${id} has a page in Docs.tsx`);
        assert.ok(label.length > 0 && docTitle(id).length > 0, `${id} has a label and a title`);
    }
});

test("an engine topic's heading says it is about the engine even though its menu label sits under an Engine heading", async () => {
    const { docTitle, docSections } = await loadTopics();
    const label = (id) => docSections.find(([known]) => known === id)[1];
    for (const id of ["engine", "engine-loop", "engine-world"]) {
        assert.ok(docTitle(id).startsWith("Engine: "), `${id}: ${docTitle(id)}`);
        assert.ok(!label(id).startsWith("Engine"), `${id}'s menu label is short: ${label(id)}`);
    }
});

test("the Docs quick start is the README's quick start, which the engine's tests run", () => {
    const docs = /code=\{`(import \{ buildAvatar[\s\S]*?)`\} \/>/.exec(read("studio/src/pages/Docs.tsx"))?.[1];
    const readme = /```ts\n(import \{ buildAvatar[\s\S]*?)\n```/.exec(read("packages/pixel-engine/README.md"))?.[1];
    assert.ok(docs, "the quick start is in Docs.tsx");
    assert.ok(readme, "the quick start is in the engine README");
    assert.equal(docs, readme);
});

test("the command shown in the docs and READMEs is the one that runs the generator", () => {
    const name = JSON.parse(read("packages/create-pixel-game/package.json")).name;
    // npm and pnpm turn `create @scope/thing` into the package @scope/create-thing.
    const [scope, unscoped] = name.split("/");
    assert.ok(unscoped.startsWith("create-"), `${name} is named for npm create`);
    const command = `npm create ${scope}/${unscoped.replace(/^create-/, "")}`;
    const shownIn = [
        "README.md",
        "packages/pixel-engine/README.md",
        "packages/create-pixel-game/README.md",
        "studio/src/pages/Docs.tsx",
        "studio/src/pages/Home.tsx"
    ];
    for (const file of shownIn) {
        const text = read(file);
        assert.ok(text.includes(command), `${file} shows "${command}"`);
        for (const [spelling] of text.matchAll(/npm create @ragtechdev\/[a-z-]+/g)) {
            assert.equal(spelling, command, `${file} spells the command ${spelling}, not ${command}`);
        }
    }
});
