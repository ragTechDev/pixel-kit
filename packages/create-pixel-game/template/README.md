# {{title}}

A pixel-art game built with [ragTech Pixel Kit](https://github.com/ragTechDev/pixel-kit). It starts as a small town and a house you can walk into: arrow keys or WASD to walk, and step onto the door.

```sh
pnpm install
pnpm dev
```

`pnpm build` type-checks and builds the game into `dist/`, which runs from any folder or address. The project uses [pnpm](https://pnpm.io), pinned in `package.json` (`corepack enable` if you do not have it).

## Where to start

- `src/maps.ts` is the world. Change a letter in a map, or add an object, and the picture and what blocks the hero change together.
- `src/game.ts` is what happens: the places, the door between them, the hero and the camera.
- `src/main.ts` connects it to the page.

The guides are at <https://ragtechdev.github.io/pixel-kit/#/docs/start>: the sprites (tiles, objects, avatars, colours) and the engine (the loop, input, camera, walking, doors and scenes).

## Working with a coding agent

`CLAUDE.md` tells an agent how this project is set up, what belongs here and what belongs in pixel-kit, and the rules to keep (fixed art and palettes, safe gestures, the supply-chain settings). Fill in its first section about your game.

## Credits

Pixel art from pixel-sprites by RAGTECH PTE. LTD., licensed under CC BY 4.0. Keep this line in your game's credits.
