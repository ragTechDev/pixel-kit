# Changelog

All notable changes to this package are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows
[Semantic Versioning](https://semver.org/). Before 1.0, a breaking change bumps the
minor version.

To draft the next entry from the commit history, run `pnpm changelog pixel-engine`. See
"Releases" in CLAUDE.md for the full flow.

<!-- next-release -->

## [0.2.0] - 2026-11-27

### Changed
- **The `pixel-sprites` peer range is now `>=0.11.0 <1.0.0`.** `createMover` reads the pixel-accurate collision (`solidBoxes`) that arrived in `pixel-sprites` 0.11.0. Upgrade the sprites package before the engine.

### Added
- **`createMover`, `isOpen` and `overlaps`: movement that is not tied to tiles.** A mover stands at any pixel and moves a pixel at a time, with a small box at its feet that collides, so it stops flush against the drawn outline of a building instead of a tile away. The roof rows of a building are open, so it can walk up behind one (draw with the sprites package's `mapDrawables` and it is covered). `assist` optionally nudges it round a corner or into a doorway. `createWalker` is unchanged. Core grows from about 1.5 KB to 2.1 KB gzipped, and the budgets are raised to match.

## [0.1.0] - 2026-11-26

First release: a small game runtime for tile-based pixel-art worlds built with `@ragtechdev/pixel-sprites`, which is a peer dependency (`>=0.9.0 <1.0.0`). About 2.5 KB gzipped for all three entries. Guides are at <https://ragtechdev.github.io/pixel-kit/#/docs/engine>, and a playable world built with it is at <https://ragtechdev.github.io/pixel-kit/#/play>.

### Added
- **Core entry** (no DOM, no framework, so it runs in a browser, a test or on a server):
  - `createLoop`, a fixed-step loop that owns no timer. It runs whole steps from the time you feed it, and a hidden tab catches up on at most a quarter of a second.
  - `createInput` over a fixed set of actions (`up`, `down`, `left`, `right`, `a`, `b`, `start`). A press is seen for one update, a tap shorter than an update still counts, and the direction pressed last wins.
  - `createCamera` and `cameraOrigin`, a camera that follows a point on whole pixels, stays inside the world and centres a small one.
  - `createWalker`, `isWalkable` and `neighbor`, for movement a tile at a time with collision read from the sprites package's map data: solid terrain, water and blocking objects stop you, a tree's canopy does not, and `isWalkable(map, x, y, { doors: true })` lets a walker step onto a door so the game can warp.
  - `createScenes` and `createGame`, a scene stack and the loop, input and scenes tied together.
- **`/dom` entry:** `attachKeyboard` (keys matched by position, so any layout works; Ctrl, Cmd and Alt are left to the browser), `defaultKeymap`, and `start`, which runs a game on a canvas with one pixel per game pixel and a whole-number zoom.
- **`/react` entry:** `GameView` and `useGame`. React is an optional peer, needed only here.
