#!/usr/bin/env node
// Proves a freshly generated project works with the released packages: it scaffolds into a temporary folder, then
// installs from the npm registry, type-checks and builds. It needs the network and pnpm, so it is not part of
// `pnpm test`, which stays offline. Run it before releasing this package, and after a kit release moves a range:
//
//   pnpm --filter ./packages/create-pixel-game verify [--keep]
//
// --keep leaves the generated project in place and prints where it is, so you can run it.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scaffold } from "../src/index.mjs";

const keep = process.argv.includes("--keep");
const folder = mkdtempSync(join(tmpdir(), "create-pixel-game-verify-"));
const project = join(folder, "verify-game");
let failed = false;

try {
    const files = scaffold({ target: project, name: "verify-game" });
    console.log(`Scaffolded ${files.length} files into ${project}`);

    for (const [label, args] of [["install", ["install"]], ["typecheck", ["run", "typecheck"]], ["build", ["run", "build"]]]) {
        console.log(`\n> pnpm ${args.join(" ")}`);
        const result = spawnSync("pnpm", args, { cwd: project, stdio: "inherit" });
        if (result.status !== 0) {
            console.error(`\nFAILED at ${label} (exit ${result.status ?? result.signal}).`);
            failed = true;
            break;
        }
    }

    if (!failed) {
        const assets = join(project, "dist", "assets");
        if (!existsSync(join(project, "dist", "index.html")) || !existsSync(assets)) {
            console.error("\nFAILED: the build did not produce dist/index.html and dist/assets.");
            failed = true;
        } else {
            for (const file of readdirSync(assets)) console.log(`  dist/assets/${file}  ${(statSync(join(assets, file)).size / 1024).toFixed(1)} KB`);
            console.log("\nOK: a new project installs, type-checks and builds with the released packages.");
        }
    }
} finally {
    if (keep) console.log(`\nKept: ${project}`);
    else rmSync(folder, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
