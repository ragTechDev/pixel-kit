# CLAUDE.md — @ragtechdev/pixel-engine (packages/pixel-engine)

The repo-wide rules in the root `CLAUDE.md` (hard rules, supply chain, releases, working agreement, definition of done) apply here too. This file holds what is specific to the engine. Paths are relative to `packages/pixel-engine/` unless they start with `scripts/` or `.github/`.

## What this is

A small, framework-agnostic game runtime for tile-based pixel-art worlds built on `@ragtechdev/pixel-sprites`. It grows as a real game needs it: add a function when the game asks for it, not before.

## Layout

| File | Entry | What it is |
|---|---|---|
| `src/loop.ts` | core | Fixed-timestep accumulator. Owns no timer; the caller feeds elapsed seconds. |
| `src/input.ts` | core | The fixed `Action` set, held and just-pressed state, the direction held last. |
| `src/camera.ts` | core | Whole-pixel camera that follows a point, clamps to the world and centres a small world. |
| `src/walker.ts` | core | One tile step at a time, smooth in between. `isWalkable` reads the library's `queryCell`. |
| `src/mover.ts` | core | Free pixel movement: one pixel at a time, a small feet box, stops flush against `solidBoxes`. `isOpen` and `overlaps` read the library's boxes. |
| `src/scenes.ts` | core | A scene stack; only the top scene updates and renders. |
| `src/game.ts` | core | Loop, input and scene stack together. `createGame` knows nothing about the DOM. |
| `src/dom/index.ts` | `/dom` | `attachKeyboard` (matches `event.code`) and `start` (a `requestAnimationFrame` runner). |
| `src/react/index.tsx` | `/react` | `GameView` and `useGame`. |

## Rules

- **The core entry stays pure.** No DOM, no React, no timers, no `Date`, no randomness. `pnpm typecheck` runs `tsc -p tsconfig.core.json` with `lib: ES2022` and no ambient types, so a DOM type in the core fails the build. Anything that touches the browser goes in `src/dom/` or `src/react/`.
- **Fixed actions only.** Players act through `Action` (`up`, `down`, `left`, `right`, `a`, `b`, `start`). Keys, buttons and touches are mapped onto it in `/dom` or by the game. Do not add an API that runs user-supplied code or accepts user-supplied art, and keep non-contact gestures only (see the root hard rules).
- **Whole pixels.** The camera origin is always an integer, the walker's pixel position is rounded, and `start` refuses a zoom that is not a whole number. The canvas is one pixel per game pixel and the browser scales it up.
- **One runtime dependency, as a peer.** `@ragtechdev/pixel-sprites` is a peer dependency with a real range (`>=0.9.0 <1.0.0`) and a `workspace:*` dev dependency for local development. Never write `workspace:` in `peerDependencies` or `dependencies`: the release workflow publishes with `npm publish`, which does not rewrite it. When the sprites library ships a breaking minor, adjust the range in the same change and say so in the changelog. `react` is an optional peer, used only by `/react`.
- **Size budgets.** `scripts/size.mjs` holds a gzipped budget per entry and `pnpm size` fails over it. Raise a budget on purpose, in the commit that explains why, and report the numbers.
- **Build the library first.** The scripts call `build:deps` (`pnpm --filter "@ragtechdev/pixel-engine^..." build`) so `typecheck`, `test` and `build` work on a fresh checkout, where `packages/pixel-sprites/dist` does not exist.
- **Types come from the library's built `dist`.** `tsup` leaves the peer external. A `paths` mapping to the library's source was deliberately not used, because it risks inlining the library's types into this package's declarations. If you want one, build and read `dist/*.d.ts` first.

## Tests

`node:test` against `dist` (`pnpm test` builds first). Add a test with every function you add.

- `test/example.test.mjs` runs the README quick start for real, with the library's own `drawRaster` on a fake canvas. When you change the quick start in the README, change it there too.
- `test/api.test.mjs` pins the exact export list of each entry. Adding or removing an export is a published-API change: update that test, the README table and the changelog together.
- Feed `game.advance` time a frame at a time (`1 / 60`) in tests. One large call is clamped to `maxFrame`, on purpose.

## Adding a function

1. Say what the game needs it for. If a different game would not want it, it belongs in the game's repo, not here.
2. Put it in the right entry (pure goes in core), export it from that entry's `index.ts`, and update `test/api.test.mjs`.
3. Add tests, run `pnpm typecheck && pnpm test && pnpm size` from the repository root, and report the gzipped sizes against the budgets.
4. Update the README table and quick start if the way you use the engine changed, and the matching topic in `studio/src/pages/Docs.tsx`. The Docs quick start must stay identical to the README's; `studio/test/docs.test.mjs` checks it, along with every name the docs import.

## Publishing

Published to npm as `@ragtechdev/pixel-engine` (0.1.0 was the first release), by the same workflow as `pixel-sprites`: a `pixel-engine-v*` tag starts `.github/workflows/release.yml`, which publishes with provenance after the `npm-publish` approval. Follow "Releases" in the root `CLAUDE.md` with `pixel-engine` as the package.

- Releases use `npm publish`, which does not rewrite `workspace:`. That is why the peer dependency on `@ragtechdev/pixel-sprites` is a real range and only the dev dependency is `workspace:*`.
- When `pixel-sprites` ships a breaking minor, change the peer range in the same change as the engine code that needs it, and say so in the changelog.
- The README on npm is the one published with that version, while the site's Docs follow `main` at once, so they can differ until the next release.
