<p align="center">
  <img src="packages/pixel-sprites/docs/images/banner.png" alt="Pixel avatars walking through a small village: cottages, a pond, trees and a path" width="100%">
</p>

# pixel-kit

Small, composable pieces for pixel-art games and apps, from [ragTech](https://ragtechdev.com). Everything is built from fixed masks and fixed palettes, so it stays small, consistent and safe to hand to players.

| Package | What it is | Docs |
|---|---|---|
| [`@ragtechdev/pixel-sprites`](packages/pixel-sprites) | Avatars, tiles, objects, icons and small worlds, composed from string masks and fixed palettes. Renders to SVG, canvas or React. | [README](packages/pixel-sprites/README.md) |
| [`@ragtechdev/pixel-engine`](packages/pixel-engine) | A framework-agnostic game runtime for tile-based worlds: a fixed-step loop, input, a camera, tile movement with collision, and scenes. Uses `pixel-sprites`. | [README](packages/pixel-engine/README.md) |
| [`@ragtechdev/create-pixel-game`](packages/create-pixel-game) | `npm create @ragtechdev/pixel-game`: starts a new game on the two packages above, ready to run. | [README](packages/create-pixel-game/README.md) |

The **site** is live at <https://ragtechdev.github.io/pixel-kit/>, or run it locally with `pnpm dev`. Its front page shows what the packages do: a world you can walk around, and ways to use the art as plain assets on your own pages. **Play** is a bigger version of that world (and a handheld console on a phone), and the library pages browse every icon, tile, object, avatar and world, with copyable code and downloads.

## Start a game

```sh
npm create @ragtechdev/pixel-game my-game
cd my-game
pnpm install
pnpm dev
```

That writes a small Vite and TypeScript project with a playable town and a house, on the released packages, with the kit's supply-chain settings and a `CLAUDE.md` for a coding agent. It only writes files: it never installs anything or runs a command for you. See its [README](packages/create-pixel-game/README.md).

## Using the packages

Each package's README has its install steps and examples. They are separate npm packages with their own versions and changelogs, so you install only what you need.

## Working on the kit

You need Node 20 or newer and [pnpm](https://pnpm.io) (the version is pinned in `package.json`).

```sh
pnpm install --frozen-lockfile
pnpm dev         # the studio
pnpm typecheck   # every package and the studio
pnpm test        # every package
pnpm size        # gzipped size per entry
pnpm build       # build every package
```

Adding art (an icon, a garment, a hair style, an object or a tile) has a scaffolding wizard, `pnpm new`. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute and the rules that keep the kit small.

## Licences

- **Code** is MIT, see [LICENSE](LICENSE).
- **Art** in `pixel-sprites` is CC BY 4.0, see [packages/pixel-sprites/LICENSE-ART.md](packages/pixel-sprites/LICENSE-ART.md) for what it covers and how to credit it.
