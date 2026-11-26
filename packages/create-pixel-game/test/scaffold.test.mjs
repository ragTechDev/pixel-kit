import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { destinationOf, render, scaffold, templateFiles, toTitle, validateName } from "../src/index.mjs";

const scratch = mkdtempSync(join(tmpdir(), "create-pixel-game-test-"));
after(() => rmSync(scratch, { recursive: true, force: true }));
let counter = 0;
const fresh = () => join(scratch, `case-${counter++}`);
const read = (...parts) => readFileSync(join(...parts), "utf8");

test("names are lower-case letters, digits and hyphens, and anything else is refused with a reason", () => {
    for (const ok of ["my-pixel-game", "a", "game2", "0-day", "a".repeat(100)]) assert.ok(validateName(ok).ok, ok);
    for (const bad of ["", "Bad", "has space", "-lead", "under_score", "../escape", "a/b", ".hidden", "dot.name", "ünï", "a".repeat(101)]) {
        const result = validateName(bad);
        assert.ok(!result.ok, `${JSON.stringify(bad)} should be refused`);
        assert.ok(result.reason.length > 10, "and say why");
    }
    for (const notAString of [undefined, null, 42, {}]) assert.ok(!validateName(notAString).ok);
});

test("a name becomes a title", () => {
    assert.equal(toTitle("my-pixel-game"), "My Pixel Game");
    assert.equal(toTitle("game"), "Game");
    assert.equal(toTitle("0-day-run"), "0 Day Run");
});

test("render fills tokens, leaves other braces alone, and refuses a token it has no value for", () => {
    assert.equal(render("# {{title}} ({{name}})", { title: "My Game", name: "my-game" }), "# My Game (my-game)");
    assert.equal(render("const a = { b: 1 }; // {not a token}", {}), "const a = { b: 1 }; // {not a token}");
    assert.throws(() => render("{{missing}}", { name: "x" }), /\{\{missing\}\}/);
});

test("npm-hostile files are stored under other names and given their real ones", () => {
    assert.equal(destinationOf("_gitignore"), ".gitignore");
    assert.equal(destinationOf("_package.json"), "package.json");
    assert.equal(destinationOf("src/game.ts"), "src/game.ts");
    assert.equal(destinationOf("src/_gitignore"), "src/.gitignore", "wherever they are");
    const files = templateFiles();
    assert.ok(files.includes("_gitignore") && files.includes("_package.json"));
    assert.ok(!files.includes("package.json") && !files.includes(".gitignore"), "the template holds neither real name");
});

test("scaffold writes a complete project with the name filled in and nothing left over", () => {
    const target = fresh();
    const written = scaffold({ target, name: "tiny-quest" });
    for (const expected of [
        "package.json", ".gitignore", "pnpm-workspace.yaml", "tsconfig.json", "vite.config.ts", "index.html",
        "README.md", "CLAUDE.md", "src/main.ts", "src/game.ts", "src/maps.ts"
    ]) assert.ok(written.includes(expected), `${expected} was written`);
    assert.equal(written.length, templateFiles().length, "one file for every template file");
    assert.ok(!written.some((f) => f.startsWith("_")), "no stand-in name survived");

    for (const file of written) {
        const text = read(target, file);
        assert.ok(!/\{\{\w+\}\}/.test(text), `${file} has an unfilled token`);
    }
    assert.match(read(target, "index.html"), /<title>Tiny Quest<\/title>/);
    assert.match(read(target, "CLAUDE.md"), /^# CLAUDE\.md — Tiny Quest$/m);
    assert.match(read(target, "README.md"), /^# Tiny Quest$/m);

    const pkg = JSON.parse(read(target, "package.json"));
    assert.equal(pkg.name, "tiny-quest");
    assert.equal(pkg.private, true, "a game is not published by accident");
    assert.match(pkg.packageManager, /^pnpm@\d+\.\d+\.\d+$/);
    assert.deepEqual(Object.keys(pkg.dependencies).sort(), ["@ragtechdev/pixel-engine", "@ragtechdev/pixel-sprites"]);
    assert.ok(pkg.scripts.dev && pkg.scripts.build && pkg.scripts.typecheck);
});

test("the starter keeps the supply-chain settings from the kit", () => {
    const target = fresh();
    scaffold({ target, name: "safe-game" });
    const settings = read(target, "pnpm-workspace.yaml");
    assert.match(settings, /^onlyBuiltDependencies: \[\]$/m, "install scripts never run");
    assert.match(settings, /^minimumReleaseAge: 4320$/m);
    assert.match(settings, /^trustPolicy: no-downgrade$/m);
    assert.match(settings, /minimumReleaseAgeExclude:\n  - '@ragtechdev\/\*'/, "and the exception that lets a fresh kit release install");
    assert.ok(!/^overrides:/m.test(settings), "the local-link block ships commented out, so it cannot be committed live");
    assert.match(settings, /^# overrides:$/m);
    assert.match(read(target, ".gitignore"), /^node_modules$/m);
});

test("it creates missing folders, and an empty existing folder is fine", () => {
    const nested = join(fresh(), "games", "deep", "nested-game");
    scaffold({ target: nested, name: "nested-game" });
    assert.ok(existsSync(join(nested, "src", "game.ts")));

    const empty = fresh();
    mkdirSync(empty);
    scaffold({ target: empty, name: "empty-game" });
    assert.ok(existsSync(join(empty, "package.json")));
});

test("it never touches a folder that already has something in it", () => {
    const target = fresh();
    mkdirSync(target);
    writeFileSync(join(target, "precious.txt"), "do not lose me");
    assert.throws(() => scaffold({ target, name: "x-game" }), /already exists and is not empty/);
    assert.deepEqual(readdirSync(target), ["precious.txt"], "nothing was added");
    assert.equal(read(target, "precious.txt"), "do not lose me", "and nothing was changed");

    const file = fresh();
    writeFileSync(file, "a file where the folder should go");
    assert.throws(() => scaffold({ target: file, name: "y-game" }), /already exists/);
    assert.equal(read(file), "a file where the folder should go");
});

test("a bad name is refused before anything is written", () => {
    const target = fresh();
    assert.throws(() => scaffold({ target, name: "Not Valid" }), /not a usable name/);
    assert.ok(!existsSync(target), "no folder was made");
});

test("a template token with no value is an error, not a silent leftover", () => {
    const templateDir = fresh();
    mkdirSync(templateDir);
    writeFileSync(join(templateDir, "a.txt"), "{{name}} {{oops}}");
    const target = fresh();
    assert.throws(() => scaffold({ target, name: "z-game", templateDir }), /\{\{oops\}\}/);
});

// The starter pins ranges of the kit's own packages. If a release moves past a range, a new project would quietly get an
// old kit, or a kit its code was not written for, so this fails and says to update the template.
const root = new URL("../../..", import.meta.url).pathname;
const workspaceVersion = (pkg) => JSON.parse(readFileSync(join(root, "packages", pkg, "package.json"), "utf8")).version;
function satisfiesCaret(version, range) {
    const [rM, rm, rp] = range.replace(/^\^/, "").split(".").map(Number);
    const [vM, vm, vp] = version.split(".").map(Number);
    if (vM !== rM) return false;
    if (rM === 0) return vm === rm && vp >= rp; // before 1.0 a caret allows patches only
    return vm > rm || (vm === rm && vp >= rp);
}

test("the starter's kit ranges include the current release of each package", () => {
    const pkg = JSON.parse(read(join(root, "packages/create-pixel-game/template/_package.json")).replace(/\{\{\w+\}\}/g, "x"));
    for (const name of ["pixel-sprites", "pixel-engine"]) {
        const range = pkg.dependencies[`@ragtechdev/${name}`];
        assert.ok(range, `${name} is a dependency of the starter`);
        assert.ok(satisfiesCaret(workspaceVersion(name), range), `${name} ${workspaceVersion(name)} is outside the starter's ${range}: update the template`);
    }
});

test("satisfiesCaret behaves like a caret range", () => {
    assert.ok(satisfiesCaret("0.9.0", "^0.9.0") && satisfiesCaret("0.9.4", "^0.9.0"));
    assert.ok(!satisfiesCaret("0.10.0", "^0.9.0"), "a new 0.x minor may break");
    assert.ok(!satisfiesCaret("0.8.9", "^0.9.0"));
    assert.ok(satisfiesCaret("1.4.2", "^1.2.0") && !satisfiesCaret("2.0.0", "^1.2.0") && !satisfiesCaret("1.1.9", "^1.2.0"));
});
