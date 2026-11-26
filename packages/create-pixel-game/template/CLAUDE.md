# CLAUDE.md — {{title}}

## What this is

TODO: describe {{title}} in a sentence or two. (Everything else in this file is already filled in.)

It is a pixel-art game built on two packages from [ragTech Pixel Kit](https://github.com/ragTechDev/pixel-kit), which lives in a separate repository: `@ragtechdev/pixel-sprites` (the art: maps, tiles, objects, avatars) and `@ragtechdev/pixel-engine` (the runtime: loop, input, camera, walking, doors, scenes). Guides for both are at https://ragtechdev.github.io/pixel-kit/#/docs/start.

## Layout

- `src/maps.ts`: the maps. Terrain is one character per 2x2-tile block, and objects are placed in tile coordinates on top.
- `src/game.ts`: the world: places, doors, the hero, the camera, and what is drawn each frame.
- `src/main.ts`: puts the game on the canvas in `index.html` and connects the keyboard.

## Where things go

- **Game-specific content stays here:** levels and maps, story and dialogue, game rules, saves, and art that only this game would use.
- **Anything another game could reuse belongs in pixel-kit**, not here: a new tile, object, icon or avatar part (`pixel-sprites`), or a new loop, input, camera, movement or scene feature (`pixel-engine`). Add it there by that repo's `CLAUDE.md`, release it, then use it here. When in doubt, ask.

## Working on the kit and the game together

1. Clone pixel-kit next to this repo (`../pixel-kit`) and build it there with `pnpm install --frozen-lockfile && pnpm build`. The game imports the packages' built output, so rebuild after you change the kit.
2. Start the agent from this repo with `claude --add-dir ../pixel-kit`, so one session can edit both.
3. Point the game at the local kit while you work: uncomment the `overrides` block at the bottom of `pnpm-workspace.yaml`, then `pnpm install`. **Never commit it uncommented.** CI and other contributors have no sibling checkout. Add a CI step that fails when `pnpm-workspace.yaml` contains an uncommented `link:`.
4. Release in batches, not per asset: when a set of kit changes is stable, release the kit package (see its `CLAUDE.md`), then comment the overrides out again and depend on the released version here.

## Supply chain

`pnpm-workspace.yaml` holds the settings, copied from pixel-kit. Keep them:

- Use pnpm, pinned in `packageManager`, and install with `--frozen-lockfile` in CI. Do not use npm or commit `package-lock.json`.
- `onlyBuiltDependencies: []`: dependency install scripts never run. Review any new warning; do not allow one by reflex.
- `minimumReleaseAge: 4320` (3 days) and `trustPolicy: no-downgrade`. Exceptions go in `trustPolicyExclude`, exact version only, with a comment saying why, and never without reviewing the package.
- **One exception, for our own scope:** `minimumReleaseAgeExclude: ['@ragtechdev/*']`. Without it, a fresh kit release cannot be installed for three days, and pnpm refuses it with `ERR_PNPM_NO_MATCHING_VERSION`.
- Add a dependency only after checking its size and licence.

## Rules carried over from pixel-kit

- **Constrained customization only.** Players choose from fixed masks and fixed palettes. No user-supplied art, no arbitrary images, no running user-supplied code. Colours are fixed palette names; where a hex colour is accepted, it goes through `parseHex` first.
- **Safe gestures only:** non-contact (wave, sparkle, tip a hat). Nothing contact-based or sexualizable.
- **No secrets**, API keys, `.env` files or personal data in the repo or its history.
- **Credit the art.** The `pixel-sprites` art is CC BY 4.0. Keep this line in the game's credits: *Pixel art from pixel-sprites by RAGTECH PTE. LTD., licensed under CC BY 4.0.* Do not change a licence without asking.

## Commands

```sh
pnpm install --frozen-lockfile   # or `pnpm install` the first time, to create the lockfile
pnpm dev         # run the game with live reload
pnpm build       # type-check, then build into dist/ (a relative base, so it runs from any folder or address)
pnpm preview     # serve the built game
pnpm typecheck   # type-check only
```

## Working agreement

Start by proposing a short plan (steps and what changes) and wait for approval before a large change. Keep one logical change per commit, in the form `type(scope): subject`. Keep answers concise and ask at most one question at a time.

## Definition of done

Typecheck passes, the game builds and runs, and the README matches how the game actually works.
