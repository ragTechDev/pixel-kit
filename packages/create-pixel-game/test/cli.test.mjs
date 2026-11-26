import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

const bin = new URL("../bin/create-pixel-game.mjs", import.meta.url).pathname;
const scratch = mkdtempSync(join(tmpdir(), "create-pixel-game-cli-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

// stdin is not a terminal here, which is how it runs in a script or from an agent.
const run = (args, cwd = scratch) => spawnSync("node", [bin, ...args], { cwd, encoding: "utf8", input: "" });

test("--help and --version print and succeed", () => {
    const help = run(["--help"]);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /npm create @ragtechdev\/pixel-game \[name\]/);
    assert.match(help.stdout, /never installs anything/);
    assert.equal(run(["-h"]).status, 0);
    const version = run(["--version"]);
    assert.equal(version.status, 0);
    assert.equal(version.stdout.trim(), JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version);
});

test("it creates the project and says exactly what to run next", () => {
    const result = run(["cli-game"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Created cli-game in cli-game \(11 files\)/);
    assert.match(result.stdout, /cd cli-game\n  pnpm install\n  pnpm dev/);
    assert.match(result.stdout, /never|CLAUDE\.md/);
    assert.ok(existsSync(join(scratch, "cli-game", "src", "game.ts")));
    assert.ok(existsSync(join(scratch, "cli-game", ".gitignore")));
});

test("it never installs or runs anything: only files appear, and no node_modules", () => {
    run(["quiet-game"]);
    assert.ok(!existsSync(join(scratch, "quiet-game", "node_modules")));
    assert.ok(!existsSync(join(scratch, "quiet-game", "pnpm-lock.yaml")));
});

test("a path is accepted, and its last part is the name", () => {
    const result = run([join("games", "path-game")]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(existsSync(join(scratch, "games", "path-game", "package.json")));
    assert.equal(JSON.parse(readFileSync(join(scratch, "games", "path-game", "package.json"), "utf8")).name, "path-game");
});

test("'.' scaffolds into the current empty folder and names it after the folder", () => {
    const folder = join(scratch, "dot-game");
    mkdirSync(folder);
    const result = run(["."], folder);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(readFileSync(join(folder, "package.json"), "utf8")).name, "dot-game");
    assert.doesNotMatch(result.stdout, /cd \./, "no pointless cd");
});

test("it fails clearly, and writes nothing, when something is wrong", () => {
    const bad = run(["Not A Name"]);
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /not a usable name/);
    assert.ok(!existsSync(join(scratch, "Not A Name")));

    run(["taken-game"]);
    const again = run(["taken-game"]);
    assert.equal(again.status, 1);
    assert.match(again.stderr, /already exists and is not empty/);

    const unknown = run(["--install"]);
    assert.equal(unknown.status, 1);
    assert.match(unknown.stderr, /Unknown option --install/);

    const many = run(["a-game", "b-game"]);
    assert.equal(many.status, 1);
    assert.match(many.stderr, /one name/);
    assert.ok(!existsSync(join(scratch, "a-game")) && !existsSync(join(scratch, "b-game")));
});

test("without a name and without a terminal it asks for one instead of guessing", () => {
    const result = run([]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Give the game a name: npm create @ragtechdev\/pixel-game my-pixel-game/);
});
