#!/usr/bin/env node
// Zero-dependency release step for one package: bumps its version, commits the
// change and tags it `<package>-v<version>`. It does not push; pushing the tag is what
// starts .github/workflows/release.yml.
//
//   node scripts/release.mjs <package> <patch|minor|major|x.y.z> [--dry-run]
//
// <package> is a folder name under packages/. Write the version's CHANGELOG.md section
// first (`pnpm changelog <package> --write`, then edit it): the release is refused
// without one, exactly as the workflow would refuse it later.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { extractNotes, nextVersion, PACKAGE_NAME, tagFor } from "./changelog.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEMVER = /^\d+\.\d+\.\d+$/;

const compare = (a, b) => {
    const [x, y] = [a, b].map((v) => v.split(".").map(Number));
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};

/** The version a release arrives at: a bump keyword applied to `current`, or an exact higher version. */
export function resolveVersion(current, request) {
    if (request === "patch" || request === "minor" || request === "major") return nextVersion(current, request);
    if (SEMVER.test(request ?? "") && compare(request, current) > 0) return request;
    throw new Error(`Give patch, minor, major or an exact version above ${current} (got ${request ?? "nothing"}).`);
}

/** `package.json` text with its top-level version replaced, leaving every other byte alone. */
export function setVersion(text, version) {
    const pattern = /^(\s*"version":\s*)"[^"]*"/m;
    if (!pattern.test(text)) throw new Error('package.json has no "version" field.');
    return text.replace(pattern, `$1"${version}"`);
}

const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function main(args) {
    const dryRun = args.includes("--dry-run");
    const [name, request] = args.filter((a) => a !== "--dry-run");
    if (!name || !PACKAGE_NAME.test(name)) {
        throw new Error("Usage: node scripts/release.mjs <package> <patch|minor|major|x.y.z> [--dry-run]");
    }
    const dir = `packages/${name}`;
    const manifestPath = join(root, dir, "package.json");
    const manifestText = readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(manifestText);
    if (manifest.private) throw new Error(`${dir} is private and is not published.`);

    const version = resolveVersion(manifest.version, request);
    const tag = tagFor(name, version);

    if (git("status", "--porcelain") !== "") throw new Error("The working tree has uncommitted changes. Commit or stash them first.");
    if (git("tag", "--list", tag) !== "") throw new Error(`The tag ${tag} already exists.`);
    if (!extractNotes(readFileSync(join(root, dir, "CHANGELOG.md"), "utf8"), version)) {
        throw new Error(`${dir}/CHANGELOG.md has no notes for ${version}. Run: pnpm changelog ${name} --write, then edit and commit it.`);
    }

    console.log(`${manifest.name}: ${manifest.version} -> ${version}  (tag ${tag})`);
    if (dryRun) return;

    writeFileSync(manifestPath, setVersion(manifestText, version));
    git("add", `${dir}/package.json`);
    git("commit", "-m", `chore(release): ${name} ${version}`);
    git("tag", "-a", tag, "-m", `${name} ${version}`);
    console.log(`Committed and tagged. To publish, push both (the release then waits for approval):\n  git push origin HEAD ${tag}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        main(process.argv.slice(2));
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
    }
}
