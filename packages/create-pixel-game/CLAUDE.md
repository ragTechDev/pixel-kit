# CLAUDE.md — @ragtechdev/create-pixel-game (packages/create-pixel-game)

The repo-wide rules in the root `CLAUDE.md` (hard rules, supply chain, releases, working agreement, definition of done) apply here too. This file holds what is specific to the generator. Paths are relative to `packages/create-pixel-game/` unless they start with `scripts/` or `.github/`.

## What this is

`npm create @ragtechdev/pixel-game my-game`: a zero-dependency Node script that copies `template/` into a new folder, filling in the game's name, and prints what to run next. It is how a new game starts, so the starter must always work with the released packages.

## Layout

| Path | What it is |
|---|---|
| `bin/create-pixel-game.mjs` | The command: arguments, the prompt, the messages, the exit codes. |
| `src/index.mjs` | The logic, importable for tests: `validateName`, `toTitle`, `render`, `templateFiles`, `destinationOf`, `scaffold`. |
| `template/` | The starter project, copied as it is with `{{name}}` and `{{title}}` filled in. |
| `scripts/verify.mjs` | Generates a project, then installs it from the registry, type-checks and builds it. Needs the network. |
| `test/` | Offline tests of the generator and the command. |

## Rules

- **It only writes files.** It must never run a package manager or any other command, never overwrite a file (`scaffold` writes with the `wx` flag and refuses a folder that is not empty), and never write outside the folder it was given. Keep the command's "never installs anything" promise true: it is in the help text and the README.
- **No dependencies, no build step.** It is plain ESM that Node runs as it is. A dependency here runs on a stranger's machine with their credentials in reach, so adding one is not something to do by reflex; check its size and licence first, as the root rules say.
- **`template/` is a real project, not text.** Two files are stored under other names because npm drops `.gitignore` and treats a nested `package.json` as a boundary: `_gitignore` and `_package.json`. The generator puts the real names back (`RENAMES` in `src/index.mjs`). Add any other file with that problem to the same list.
- **Tokens:** only `{{name}}` and `{{title}}`. A token with no value is an error at generation time, and a test checks that no token survives in any generated file.
- **Pin the kit by caret range.** `template/_package.json` pins `^0.12.0` for `pixel-sprites` and `^0.2.0` for `pixel-engine`. Before 1.0 a caret allows patches only, which is what we want. A test fails when a release moves past a range: update the template, then run `verify`.
- **Keep the starter's imports real.** `studio/test/docs.test.mjs` checks that every name the starter's `src/*.ts` imports from the kit is a real export.
- **The starter keeps the kit's hardening** in `template/pnpm-workspace.yaml` (no install scripts, the three-day release delay, the exception for `@ragtechdev/*`, the trust policy), and ships the local-link `overrides` block commented out so it cannot be committed live. A test checks all of that.

## Before a release

1. `pnpm typecheck && pnpm test` from the repository root.
2. `pnpm --filter ./packages/create-pixel-game verify`, which proves a new project installs from the registry under its own settings, type-checks and builds. Run the result too (`verify --keep` leaves it in place and prints where), and walk to the door.
3. Release as in the root `CLAUDE.md` with `create-pixel-game` as the package. The first release needs the usual placeholder on npm, a trusted-publisher entry, and a **tag** rule (not a branch rule) for `create-pixel-game-v*` on the `npm-publish` environment.
4. The command is shown in the root README, the engine README, the Docs engine quick start (and a pointer from "Getting started") and the home page. `studio/test/docs.test.mjs` checks that every one of them spells it as the package's name implies, so renaming the package means updating them together.
