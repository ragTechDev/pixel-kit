#!/usr/bin/env node
// Zero-dependency release helper. Reads the conventional commits that touched one
// package since its last version tag and drafts the next CHANGELOG.md section and
// version bump. Run it from anywhere; the package is named on the command line.
//
//   node scripts/changelog.mjs <package>                  print the suggested bump and a draft section
//   node scripts/changelog.mjs <package> --write          insert the draft section into the package's CHANGELOG.md
//   node scripts/changelog.mjs <package> --notes <ref>    print one version's notes; <ref> is a version or a tag
//                                                         (used by the release workflow)
//
// <package> is a folder name under packages/, for example `pixel-sprites`. Its tags
// look like `pixel-sprites-v0.9.0`.
//
// Commit format: `type(scope): subject`. A breaking change is marked with `!`
// after the scope (`refactor(world)!: ...`) or a `BREAKING CHANGE:` footer.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Commit types that reach the changelog, and the section each belongs to. */
const SECTIONS = { feat: "Added", fix: "Fixed", perf: "Changed", refactor: "Changed", revert: "Changed" };
const ORDER = ["Breaking changes", "Added", "Changed", "Fixed"];
export const MARKER = "<!-- next-release -->";

/** Folder names under packages/ that a command line may name. */
export const PACKAGE_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function parseCommit(subject, body = "") {
    const match = /^(\w+)(?:\(([^)]+)\))?(!)?: (.+)$/.exec(subject);
    if (!match) return null;
    const [, type, scope, bang, text] = match;
    return { type, scope, text, breaking: Boolean(bang) || /^BREAKING[ -]CHANGE:/m.test(body) };
}

const releasable = (commit) => commit.breaking || commit.type in SECTIONS;

/** "major", "minor", "patch" or null. Before 1.0 a breaking change bumps the minor. */
export function suggestBump(commits, version) {
    const list = commits.filter(releasable);
    if (list.length === 0) return null;
    if (list.some((c) => c.breaking)) return Number(version.split(".")[0]) >= 1 ? "major" : "minor";
    return list.some((c) => c.type === "feat") ? "minor" : "patch";
}

export function nextVersion(version, bump) {
    const [major, minor, patch] = version.split(".").map(Number);
    if (bump === "major") return `${major + 1}.0.0`;
    if (bump === "minor") return `${major}.${minor + 1}.0`;
    return `${major}.${minor}.${patch + 1}`;
}

/** The tag a package's release carries: `pixel-sprites` and `0.9.0` give `pixel-sprites-v0.9.0`. */
export const tagFor = (name, version) => `${name}-v${version}`;

/** The version inside a tag (`pixel-sprites-v0.9.0`, or the plain `v0.8.0` of releases before the workspace), or the input when it has none. */
export function versionFromTag(tag) {
    const match = /^(?:.*-)?v?(\d+\.\d+\.\d+.*)$/.exec(tag);
    return match ? match[1] : tag;
}

export function renderSection(version, date, commits) {
    const groups = new Map(ORDER.map((name) => [name, []]));
    for (const commit of commits.filter(releasable)) {
        const group = commit.breaking ? "Breaking changes" : SECTIONS[commit.type];
        const line = `- ${commit.scope ? `**${commit.scope}:** ` : ""}${commit.text}${commit.sha ? ` (${commit.sha})` : ""}`;
        groups.get(group).push(line);
    }
    const parts = [`## [${version}] - ${date}`];
    for (const [name, lines] of groups) if (lines.length) parts.push(`### ${name}\n${lines.join("\n")}`);
    return parts.join("\n\n") + "\n";
}

/** The body of one version's section, or null when it is missing or empty. */
export function extractNotes(changelog, version) {
    const lines = changelog.split("\n");
    const start = lines.findIndex((line) => line.startsWith(`## [${version.replace(/^v/, "")}]`));
    if (start === -1) return null;
    let end = lines.findIndex((line, i) => i > start && line.startsWith("## ["));
    if (end === -1) end = lines.length;
    const body = lines.slice(start + 1, end).join("\n").trim();
    return body === "" ? null : body;
}

function git(...args) {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function lastTag(name) {
    try {
        return git("describe", "--tags", "--abbrev=0", "--match", `${name}-v[0-9]*`);
    } catch {
        return null;
    }
}

/** Conventional commits since `tag` that changed a file under `dir`. */
function readCommits(tag, dir) {
    const range = tag ? [`${tag}..HEAD`] : [];
    const raw = git("log", ...range, "--format=%h%x1f%s%x1f%b%x1e", "--", dir);
    return raw
        .split("\x1e")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
            const [sha, subject, body] = entry.split("\x1f");
            const commit = parseCommit(subject, body);
            return commit && { ...commit, sha };
        })
        .filter(Boolean);
}

function main(args) {
    const [name, flag, value] = args;
    if (!name || !PACKAGE_NAME.test(name)) {
        throw new Error("Usage: node scripts/changelog.mjs <package> [--write | --notes <version or tag>]");
    }
    const dir = `packages/${name}`;
    const changelogPath = join(root, dir, "CHANGELOG.md");
    if (!existsSync(changelogPath)) throw new Error(`${dir}/CHANGELOG.md does not exist.`);
    const changelog = readFileSync(changelogPath, "utf8");

    if (flag === "--notes") {
        const notes = value && extractNotes(changelog, versionFromTag(value));
        if (!notes) {
            console.error(`${dir}/CHANGELOG.md has no notes for version ${value ?? "(none given)"}.`);
            process.exit(1);
        }
        console.log(notes);
        return;
    }

    const { version } = JSON.parse(readFileSync(join(root, dir, "package.json"), "utf8"));
    const tag = lastTag(name);
    const commits = readCommits(tag, dir);
    const bump = suggestBump(commits, version);
    if (!bump) {
        console.error(`No releasable commits (feat, fix, perf, refactor, revert or breaking) in ${dir} since ${tag ?? "the start"}.`);
        process.exit(1);
    }
    const next = nextVersion(version, bump);
    const section = renderSection(next, new Date().toLocaleDateString("en-CA"), commits);

    if (flag === "--write") {
        if (!changelog.includes(MARKER)) throw new Error(`${dir}/CHANGELOG.md has no ${MARKER} marker.`);
        if (changelog.includes(`## [${next}]`)) throw new Error(`${dir}/CHANGELOG.md already has a ${next} section.`);
        writeFileSync(changelogPath, changelog.replace(MARKER, `${MARKER}\n\n${section}`));
        console.error(`Wrote the ${next} section to ${dir}/CHANGELOG.md. Edit it, commit it, then run: pnpm release ${name} ${bump}`);
        return;
    }

    console.log(`Last tag: ${tag ?? "(none)"}  |  ${commits.length} conventional commits in ${dir}`);
    console.log(`Suggested bump: ${bump} -> ${next}\n`);
    console.log(section);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        main(process.argv.slice(2));
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
    }
}
