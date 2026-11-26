#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { scaffold, validateName } from "../src/index.mjs";

const DEFAULT_NAME = "my-pixel-game";

const USAGE = `Scaffold a pixel-art game on ragTech Pixel Kit.

  npm create @ragtechdev/pixel-game [name]
  pnpm create @ragtechdev/pixel-game [name]

name   the folder to create, and the game's package name: lower-case letters, digits and hyphens.
       It may include a path (games/my-game); the last part is the name. Without it, you are asked.

  -h, --help      show this
  -v, --version   show the version

It writes files and prints what to run next. It never installs anything or runs a command for you.
`;

function fail(message) {
    console.error(`\n${message}\n`);
    process.exit(1);
}

const major = Number(process.versions.node.split(".")[0]);
if (major < 20) fail(`This needs Node 20 or newer. You have ${process.versions.node}.`);

const args = process.argv.slice(2);
if (args.includes("-h") || args.includes("--help")) {
    console.log(USAGE);
    process.exit(0);
}
if (args.includes("-v") || args.includes("--version")) {
    console.log(JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version);
    process.exit(0);
}
const unknown = args.find((arg) => arg.startsWith("-"));
if (unknown) fail(`Unknown option ${unknown}.\n\n${USAGE}`);
if (args.length > 1) fail(`Give one name, not ${args.length}.\n\n${USAGE}`);

let answer = args[0];
if (answer === undefined) {
    if (!process.stdin.isTTY) fail(`Give the game a name: npm create @ragtechdev/pixel-game ${DEFAULT_NAME}`);
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    answer = (await rl.question(`Name of your game (${DEFAULT_NAME}): `)).trim() || DEFAULT_NAME;
    rl.close();
}

const target = resolve(process.cwd(), answer);
const name = basename(target);
const valid = validateName(name);
if (!valid.ok) fail(valid.reason);

let files;
try {
    files = scaffold({ target, name });
} catch (error) {
    fail(error instanceof Error ? error.message : String(error));
}

const folder = relative(process.cwd(), target) || ".";
console.log(`
Created ${name} in ${folder} (${files.length} files).

Next:
${folder === "." ? "" : `  cd ${folder}\n`}  pnpm install
  pnpm dev

The project uses pnpm, which its package.json pins (run "corepack enable" if you do not have it).
CLAUDE.md in the project tells a coding agent how it is set up. Fill in the first section about your game.
`);
