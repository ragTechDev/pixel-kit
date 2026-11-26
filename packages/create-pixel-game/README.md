# @ragtechdev/create-pixel-game

Starts a pixel-art game on [ragTech Pixel Kit](https://github.com/ragTechDev/pixel-kit): a small town and a house you can walk into, ready to run and change.

```sh
npm create @ragtechdev/pixel-game my-game
# or: pnpm create @ragtechdev/pixel-game my-game

cd my-game
pnpm install
pnpm dev
```

Leave the name off and it asks. Use `.` to fill the current folder if it is empty.

## What you get

A [Vite](https://vite.dev) and TypeScript project on the released [`@ragtechdev/pixel-sprites`](https://www.npmjs.com/package/@ragtechdev/pixel-sprites) and [`@ragtechdev/pixel-engine`](https://www.npmjs.com/package/@ragtechdev/pixel-engine):

- `src/maps.ts`: the town and the house. Change a letter or add an object and the picture and what blocks the hero change together.
- `src/game.ts`: the places, the door between them, the hero and the camera.
- `src/main.ts`: puts the game on the canvas and connects the keyboard.
- `pnpm-workspace.yaml`: the kit's supply-chain settings (no install scripts, a three-day delay on brand-new versions with an exception for the `@ragtechdev` packages, and a trust check), and a commented-out block for pointing at a local checkout of the kit.
- `CLAUDE.md`: tells a coding agent how the project is set up, what belongs in the game and what belongs in the kit, and the rules to keep. Fill in its first section about your game.

The guides are at <https://ragtechdev.github.io/pixel-kit/#/docs/start>.

## What it does not do

It writes files and prints what to run next. It never installs anything or runs a command for you, it never overwrites a file, and it refuses a folder that already has something in it. It needs Node 20 or newer and has no dependencies.

## Licence

MIT. The art in the packages the starter uses is CC BY 4.0; the generated README tells you the credit line to keep.
