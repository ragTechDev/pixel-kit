# CLAUDE.md — pixel-kit

This repo will be **open source**. Write everything in it (code, comments, commit messages, docs, sample data) as if it is already public.

## What this is

A pnpm workspace of small, composable pieces for building pixel-art games and apps:

| Folder | Package | What it is |
|---|---|---|
| `packages/pixel-sprites` | `@ragtechdev/pixel-sprites` | Avatars, tiles, objects, icons and small worlds, composed from string masks and fixed palettes. Code MIT, art CC BY 4.0. |
| `packages/pixel-engine` | `@ragtechdev/pixel-engine` | A framework-agnostic game runtime: fixed-step loop, input, camera, tile movement and scenes. Depends on `pixel-sprites` as a peer. Code MIT. |
| `studio/` | `pixel-kit-studio` (private) | A Vite + React app: the site's front page (a live demo and ways to use the art), a playable world, and the library browser and docs. Not published. |

Package-specific guidance lives next to each package: `packages/pixel-sprites/CLAUDE.md` (masks, worlds, adding art) and `packages/pixel-engine/CLAUDE.md` (the runtime's rules). Read the one for the package you are changing. This file holds what applies everywhere.

The kit is built to be used by games that live in their own repositories. `docs/templates/game-repo/CLAUDE.md` is a starting point for such a repository.

## Where things go

- **Reusable art** (masks, palettes, objects, tiles, icons, avatar parts) goes in `packages/pixel-sprites`. It is public and CC BY 4.0.
- **Reusable runtime behaviour** (loop, input, camera, movement, scenes) goes in `packages/pixel-engine`. It is public and MIT.
- **Game-specific content** (levels and maps, story, dialogue, game rules, saves, art that only one game would use) goes in that game's own repository, never here.
- The test: would a different game want it? If yes, it belongs in the kit. If not, it stays in the game. When in doubt, ask.

## Hard rules

- **Constrained customization only.** Avatars and rooms are built from fixed masks and fixed palettes. Never add an API that accepts user-supplied art or arbitrary images, or that runs user-supplied code. Colours: avatars take only the fixed palette names. Icons, objects and tiles also accept a validated hex colour (`parseHex` in `packages/pixel-sprites/src/core/customColor.ts`: `#rgb` or `#rrggbb`, nothing else) and shade the other tones from it; never pass a user string into a colour without `parseHex`. Players act in the engine only through its fixed `Action` set.
- **Safe gestures only** if you add animation or gestures: non-contact (wave, sparkle, tip a hat). Nothing contact-based or sexualizable (no hugs, kisses, etc.).
- **No new dependency without checking its size and licence first.** Report the gzipped size delta. The core targets are zero runtime dependencies; the engine's only one is the `pixel-sprites` peer.
- **No secrets**, API keys, `.env` files or personal data anywhere in the repo or its history.
- **Do not break a published API silently.** If an export changes, say so, update the package's README and changelog, and for the engine update `test/api.test.mjs`.
- **Licences:** code is MIT (`LICENSE`, copied into each package). Art is CC BY 4.0 (`packages/pixel-sprites/LICENSE-ART.md`), which covers `src/avatar/masks/**`, `src/world/masks/**`, `src/world/tilesets/**` and the icons, with paths relative to `packages/pixel-sprites/`. When you add new art files (furniture, decor, pet masks), add their paths to that file. Do not change either licence without asking.

## The studio

`studio/` is a Vite + React app that imports both packages by name (`@ragtechdev/pixel-sprites`, `@ragtechdev/pixel-engine`), aliased to their `src/` in `studio/vite.config.ts` and `studio/tsconfig.json` (never to `dist`), so it always shows the current code. Keep the two alias lists in step, and keep every import of the sprites package on the alias: map collision data lives in a module-level `WeakMap`, so a second copy of the library would make a map built by one ignore a walker from the other. It is not published to npm. The header reads "ragTech Pixel Kit" and the menu has three top-level sections: **Library** (Icons, Tiles, Objects, Avatars, Worlds, with its own second-level menu), **Play** and **Docs** (one page per topic, listed in `docSections` in `studio/src/pages/Docs.tsx`, each ending with a link to the next). Library pages: Icons, Tiles, Objects (searchable grids; selecting an item opens a popover with copyable code, SVG/PNG download and every size and colour depth), Avatars (the customizer), Worlds and Docs. It uses hash routes and a relative Vite `base`, so the same build works on GitHub Pages, a custom domain or any folder. The size, bit depth, season and common-colour choices live in the address. `palette` (fixed `palettePresets`, in `packages/pixel-sprites/src/core/variant.ts`) is a variant option next to `size` and `bits`, kept in the address as `?palette=` with a Palette row in `VariantBar`. **Studio-only colours** (single-colour edits in `CustomColours.tsx`, per-part avatar colours in `Avatars.tsx`) live in `studio/src/recolor.ts` and only recolour what it shows and exports. Avatar custom colours must never become a library API; hex colours for icons, objects and tiles are one (see the hard rule), so the studio also has a hex field and picker beside the common colours (`ColorDots`, `?color=#rrggbb`) and per-group Tile colours on Tiles and Worlds (`TileColours`, `?tile-grass=#rrggbb`), and its snippets include them. When you add an icon, tile or object it appears automatically; when the API changes, update `studio/src/pages/Docs.tsx` along with the package README. **The front page and Play.** The home page leads with a live world and two paths: using the art as assets (each example renders with the exact code beside it) and making a lightweight game. `studio/src/play/` is that world with no React in it (`game.ts`, `maps.ts`, `sprites.ts`), shared by the home page and the Play page, and `studio/src/play/PlayCanvas.tsx` mounts it (it runs only while on screen, takes keys only with focus, and shows an on-screen pad on touch screens). The Play page shows `game.ts` itself through `?raw`, so the displayed code cannot drift. **On a phone Play is a handheld console.** `HANDHELD_QUERY` in `studio/src/hooks.ts` (a width of 720px or less, or a short window with a touch screen) switches it to `studio/src/play/Handheld.tsx`: a 160 by 144 screen (`HANDHELD_VIEW`, the resolution of a classic handheld) in a bezel, a cross pad a thumb can slide across, A, B and START buttons, and the site header and footer hidden. Held upright the screen is on top; on its side the pad and buttons move beside it. The zoom is a whole number worked out from the real widths, and the control sizes shrink below 380px and 340px so a 360px phone still gets a 2x screen. In the world, A makes the character in front turn to face you, holding B runs at double speed and START changes the season (keys: Z or Space, X, Enter). **On a phone the home page's demo spans the screen** (full-bleed, above the text, with a "Play full screen" button to the Play page): the world takes a view just wide enough to fill the demo's measured width at a whole-number zoom (2x up to 480px, 3x above), so `createPlay` accepts any view width, not only whole tiles, and the page makes a new world when the width changes. Size from the element's own width, not the window's, because a scrollbar changes one and not the other, and tie any full-bleed margin to `--page-pad`, not a number. Check layouts at exact widths with a borderless iframe; the browser tool cannot emulate a touch screen (`pointer: coarse`). `studio/test/play.test.mjs` plays the world headlessly (doors warp, and water, trees, walls, characters and the map edge stop the hero). It is also where the packages are tested together: if the demo needs something the engine lacks, add it to the engine. The engine's docs topics are not written yet.

## Commands

Run from the repository root.

```sh
pnpm install --frozen-lockfile
pnpm dev            # the studio (studio/): browse icons, tiles, objects, avatars, worlds and docs locally
pnpm build:studio   # static studio build into studio/dist (.github/workflows/studio.yml deploys it to GitHub Pages)
pnpm preview:studio # serve the built studio
pnpm build          # build every package (tsup)
pnpm typecheck      # tsc on every package and the studio, plus the no-DOM check of each core entry
pnpm test           # root script tests (test/*.test.mjs), then every package's tests (each builds first) and the studio's headless play test
pnpm size           # gzipped size per entry, for every package (the engine fails over its budgets)
pnpm changelog <package>      # suggested bump and a changelog draft from the commits that touched packages/<package> (scripts/changelog.mjs)
pnpm release <package> <bump> # bump, commit and tag <package>-v<version>; pushing the tag starts the release (scripts/release.mjs)
```

The library's own commands (`pnpm new`, `pnpm check:masks`, `pnpm stats`, `pnpm docs:images`) are also available from the root and are listed in `packages/pixel-sprites/CLAUDE.md`. To run one package's script directly, use `pnpm --filter ./packages/<package> <script>`.

Tests use the built-in `node:test` runner (no test dependency). Add tests for each module you add or refactor. `typecheck` and `test` work on a fresh checkout: the engine builds the library it depends on first.

## Supply chain

The package manager is pnpm (pinned in `packageManager`); do not use npm or commit `package-lock.json`. Hardening lives in `pnpm-workspace.yaml`:
- Dependency install scripts never run (`onlyBuiltDependencies: []`). esbuild is explicitly ignored. If pnpm warns that a new dependency wants a build script, review it; do not allow it by reflex.
- `minimumReleaseAge` delays brand-new versions by 3 days.
- `trustPolicy: no-downgrade` rejects versions that lost provenance. Exceptions go in `trustPolicyExclude`, exact version only, with a comment saying why. Never add one without reviewing the package (maintainer, repo, publish history).
- Always install with `--frozen-lockfile` in CI. Add a dependency only after checking its size and licence.
- Publishing happens only from `.github/workflows/release.yml` via npm trusted publishing (OIDC, with provenance). No npm token is stored anywhere. The npm trusted-publisher entry needs the **npm publish** permission, and its owner, repo, workflow and environment must match GitHub's spelling exactly (`ragTechDev`, `pixel-kit`, `release.yml`, `npm-publish`). npm offers a stronger stage-only mode, where a maintainer approves each version with 2FA on npm; moving to it means changing the workflow to the stage-publish command, so it is a deliberate change, not a setting to flip.
- A release needs a manual approval: the `npm-publish` GitHub environment has a required reviewer and only allows the tag patterns of the published packages (`pixel-sprites-v*`, and `pixel-engine-v*` once that package is published). Each published package needs its own trusted-publisher entry on npm.
- GitHub Actions are pinned to commit SHAs. Repo policy (Settings -> Actions) requires SHA pinning and allows only GitHub-owned actions plus `pnpm/action-setup`. To use a new action, review it first, then add it to that allow-list.
- Dependabot (`.github/dependabot.yml`) proposes weekly updates for Actions and dev dependencies, skipping versions younger than 3 days. Review each PR: check the changelog, and treat any new install-script warning or trust-policy failure as a stop sign, not something to exclude by reflex.

## Releases

Versions follow semver (before 1.0, a breaking change bumps the minor). Each package is versioned and released on its own, with its own `CHANGELOG.md` (Keep a Changelog format) and tags of the form `<package>-v<version>` (for example `pixel-sprites-v0.9.0`). Notes are drafted from the commits that touched that package's folder by `scripts/changelog.mjs`, and the version bump, commit and tag are made by `scripts/release.mjs`. Neither has dependencies. `pnpm version` is not used: it does not tag per package.

- Commit messages use `type(scope): subject`. Mark a breaking change with `!` after the scope (`refactor(world)!: ...`) or a `BREAKING CHANGE:` footer, or the suggested bump will miss it. `feat`, `fix`, `perf`, `refactor` and `revert` reach the changelog; `chore`, `docs`, `test`, `ci` and `build` do not.
- To release a package: run `pnpm changelog <package>` for the suggested bump and a draft, where `<package>` is its folder under `packages/`. Run `pnpm changelog <package> --write` to insert the draft into its `CHANGELOG.md`, then rewrite it for readers and add anything the script cannot see. Commit it, run `pnpm release <package> <patch|minor|major>` (it refuses without a changelog section, bumps `package.json`, and makes the commit and the `<package>-v<version>` tag; add `--dry-run` to preview), then push the commit and the tag as it prints.
- The tag starts `.github/workflows/release.yml`, which reads the package and version from the tag and runs from that package's folder. It refuses to publish when the tag does not match the package's name and version, or when the version has no `CHANGELOG.md` section. After the approval-gated publish, a separate job creates the GitHub release from that section. Nothing automatic bumps versions or pushes tags, so no write token exists beyond that release job.

## Adding a package

1. Create `packages/<name>` with its own `package.json`, `CHANGELOG.md` (with the `<!-- next-release -->` marker), `LICENSE`, `tsup.config.ts` and a `CLAUDE.md` for what is specific to it. Depend on a sibling with a real semver range under `peerDependencies` and `workspace:*` under `devDependencies`, never `workspace:` in a published field.
2. Make `typecheck`, `test` and `size` work on a fresh checkout (see `packages/pixel-engine/package.json` for how a package builds its workspace dependencies first).
3. To publish it: add its `<name>-v*` pattern to `.github/workflows/release.yml`, publish a placeholder to create the package on npm, add its trusted-publisher entry, and add the pattern to the `npm-publish` environment's tag rules.

## Working agreement

Start by proposing a short plan (steps, API sketch, what breaks) and wait for approval before refactoring. Keep one logical change per commit, with a message in the form `type(scope): subject` (see Releases for breaking changes). Keep answers concise and ask at most one question at a time.

## Definition of done

Typecheck passes, the studio builds and runs, the build succeeds, gzipped sizes are reported against the baseline (the README table for `pixel-sprites`, the budgets in `scripts/size.mjs` for `pixel-engine`), tests exist for changed modules, and the package README matches the real API.
