// The generator behind `npm create @ragtechdev/pixel-game`. It copies the files in ../template into a new folder,
// filling in the project's name. It reads and writes files and nothing else: it never runs a package manager
// or any other command, and it never overwrites a file.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const TEMPLATE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "template");

/**
 * npm drops `.gitignore` when it packs a package and treats a nested package.json as a boundary, so the template
 * stores these two under other names and the generator puts the real names back.
 */
const RENAMES = { _gitignore: ".gitignore", "_package.json": "package.json" };

/** Lower-case letters, digits and hyphens, starting with a letter or digit: safe as an npm name and as a folder name. */
const NAME = /^[a-z0-9][a-z0-9-]{0,99}$/;

/** `{ ok: true }`, or `{ ok: false, reason }` in words a person can act on. */
export function validateName(name) {
    if (typeof name !== "string" || name === "") return { ok: false, reason: "Give the game a name." };
    if (name.length > 100) return { ok: false, reason: "That name is too long (100 characters at most)." };
    if (!NAME.test(name)) {
        return { ok: false, reason: `"${name}" is not a usable name. Use lower-case letters, digits and hyphens, and start with a letter or digit, like my-pixel-game.` };
    }
    return { ok: true };
}

/** `my-pixel-game` becomes `My Pixel Game`. */
export function toTitle(name) {
    return name
        .split("-")
        .filter(Boolean)
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" ");
}

/** Replaces every `{{key}}` with its value. A token with no value is a bug in the template, so it throws instead of leaving it in. */
export function render(text, vars) {
    return text.replace(/\{\{(\w+)\}\}/g, (token, key) => {
        if (!Object.prototype.hasOwnProperty.call(vars, key)) throw new Error(`The template uses ${token}, which has no value.`);
        return vars[key];
    });
}

/** Every file in the template, as paths relative to it, in a stable order. */
export function templateFiles(dir = TEMPLATE_DIR) {
    const found = [];
    const walk = (folder) => {
        for (const entry of readdirSync(join(dir, folder), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            const path = folder ? `${folder}/${entry.name}` : entry.name;
            if (entry.isDirectory()) walk(path);
            else found.push(path);
        }
    };
    walk("");
    return found;
}

/** Where a template file goes in the new project. */
export function destinationOf(file) {
    const parts = file.split("/");
    const last = parts.pop();
    return [...parts, RENAMES[last] ?? last].join("/");
}

/** True for a folder that does not exist yet or exists and is empty. */
function isAvailable(target) {
    if (!existsSync(target)) return true;
    return statSync(target).isDirectory() && readdirSync(target).length === 0;
}

/**
 * Writes the starter into `target`. The folder must not exist or must be empty, and no file is ever overwritten.
 * Returns the paths it wrote, relative to `target`.
 */
export function scaffold({ target, name, templateDir = TEMPLATE_DIR }) {
    const valid = validateName(name);
    if (!valid.ok) throw new Error(valid.reason);
    if (!isAvailable(target)) throw new Error(`${target} already exists and is not empty. Pick another name, or empty it first.`);

    const vars = { name, title: toTitle(name) };
    const written = [];
    for (const file of templateFiles(templateDir)) {
        const destination = destinationOf(file);
        const path = join(target, destination);
        mkdirSync(dirname(path), { recursive: true });
        // "wx" fails if the file exists, so nothing can be overwritten even by a race.
        writeFileSync(path, render(readFileSync(join(templateDir, file), "utf8"), vars), { flag: "wx" });
        written.push(destination);
    }
    return written;
}
