# @ragtechdev/pixel-engine

A small game runtime for pixel-art worlds built with [`@ragtechdev/pixel-sprites`](../pixel-sprites). It gives you the parts every tile-based game needs and nothing else: a fixed-step loop, input, a camera, tile-by-tile movement with collision, and scenes.

- **No framework needed.** The core entry is plain TypeScript with no DOM and no React, so it runs in a browser, in a test or on a server. A React component is a separate, optional entry.
- **About 2.5 KB gzipped** for everything (see [Size](#size)). The sprites library is a peer dependency, not bundled.
- **Pixel-perfect.** The canvas holds one pixel per game pixel and the browser scales it up without smoothing. Zoom is a whole number, and the camera only ever lands on whole pixels.
- **Constrained on purpose.** Players act through a fixed set of actions (`up`, `down`, `left`, `right`, `a`, `b`, `start`). Keys and buttons map onto them. There is no API for arbitrary art.

## Install

```sh
npm install @ragtechdev/pixel-engine @ragtechdev/pixel-sprites
```

`react` is an optional peer, needed only for the `/react` entry.

## Quick start

A hero walks around a small map. Water and tree trunks block the way, because collision reads the same tile and object data that drew the map.

```ts
import { buildAvatar, buildMap, defineMap, mapTileSize, townTileset, TILE_SIZE } from "@ragtechdev/pixel-sprites";
import { drawRaster } from "@ragtechdev/pixel-sprites/canvas";
import { createCamera, createGame, createWalker, isWalkable } from "@ragtechdev/pixel-engine";
import { attachKeyboard, start } from "@ragtechdev/pixel-engine/dom";

const map = defineMap(townTileset, ["gggg", "gwgg", "gggg"]);
const ground = buildMap(map);
const tiles = mapTileSize(map);
const camera = createCamera({ width: 128, height: 96 }, { width: tiles.width * TILE_SIZE, height: tiles.height * TILE_SIZE });

const sprites = {
    up: buildAvatar({ headOrientation: "back" }),
    down: buildAvatar({ headOrientation: "front" }),
    left: buildAvatar({ headOrientation: "left" }),
    right: buildAvatar({ headOrientation: "right" })
};

const game = createGame({
    scene: (game) => {
        const hero = createWalker({ x: 1, y: 0 });
        const canEnter = (x, y) => isWalkable(map, x, y);
        return {
            update(dt) {
                const direction = game.input.heldDirection();
                if (direction) hero.walk(direction, canEnter);
                hero.update(dt);
                camera.follow(hero.x + TILE_SIZE / 2, hero.y + TILE_SIZE / 2);
            },
            render(ctx) {
                drawRaster(ctx, ground, -camera.x, -camera.y);
                // The avatar is a tile and a half tall, so it stands 8 px above its tile.
                drawRaster(ctx, sprites[hero.facing], hero.x - camera.x, hero.y - camera.y - 8);
            }
        };
    }
});

const canvas = document.querySelector("canvas");
canvas.tabIndex = 0; // a canvas needs focus to receive keys
attachKeyboard(canvas, game.input);
const stop = start(game, canvas, { width: 128, height: 96, scale: 4 });
```

Arrow keys or WASD move, Space or Z is `a`, X or Escape is `b`, Enter is `start`. Pass your own map as the third argument of `attachKeyboard`.

## React

```tsx
import { GameView, useGame } from "@ragtechdev/pixel-engine/react";

function Town() {
    const game = useGame(createTownGame); // builds the game once; createGame as above
    return <GameView game={game} width={128} height={96} scale={4} title="A small town" autoFocus />;
}
```

`GameView` mounts the canvas, runs the game and stops it on unmount. By default it reads keys only while the canvas has focus, so a page with forms keeps its keys; pass `keyboard="window"` to listen everywhere.

## What is in the box

| Entry | Export | What it does |
|---|---|---|
| core | `createLoop` | A fixed-timestep accumulator. Feed it elapsed seconds, it runs whole steps and tells you how far into the next one you are. It owns no timer. |
| core | `createInput` | Held and just-pressed actions, and the direction held last. |
| core | `createCamera`, `cameraOrigin` | Follows a point, stays inside the world, and centres a world smaller than the view. Whole pixels only. |
| core | `createWalker`, `isWalkable`, `neighbor` | One tile step at a time, drawn smoothly between tiles. `update` returns true on arrival, the moment to check for a door with `queryCell`. |
| core | `createScenes` | A stack of scenes. Only the top one updates and renders. |
| core | `createGame` | The loop, the input and a scene stack together. |
| `/dom` | `attachKeyboard`, `defaultKeymap`, `start` | Keys to actions (by position, so any keyboard layout works), and a `requestAnimationFrame` runner. |
| `/react` | `GameView`, `useGame` | The component and a hook. |

A few details that are easy to miss:

- **Updates are fixed.** Game logic runs at 60 steps per second whatever the display's refresh rate. `render` receives `alpha`, how far the clock is into the next step, if you want to interpolate.
- **A tab that was hidden catches up on at most a quarter of a second** (`maxFrame`), not a burst of thousands of updates.
- **A fresh press is visible to exactly one update**, even when a frame runs two (`input.wasPressed`). A tap shorter than an update is not lost: it counts as held for that update, so a quick touch still takes a step.
- **Water counts as solid.** `isWalkable` is `false` off the map, on solid terrain, on water and on the blocking cells of an object. A tree's canopy is open and its trunk blocks.
- **Doors are solid unless you ask.** A door in a wall sits on a solid tile, so `isWalkable(map, x, y, { doors: true })` lets a walker step onto it. When `walker.update` reports the arrival, check `queryCell(map, walker.tx, walker.ty)?.door` and switch scenes.
- **Browser shortcuts keep working.** Keys pressed with Ctrl, Cmd or Alt are never taken, and everything is released when focus is lost.

## Size

Gzipped, each entry including the shared code it imports (`pnpm size` fails if one goes over its budget):

| Entry | Gzipped |
|---|---|
| core | about 1.5 KB |
| `/dom` | about 2.1 KB |
| `/react` | about 2.3 KB |
| all three | about 2.5 KB |

The `@ragtechdev/pixel-sprites` functions you import (`queryCell` and `TILE_SIZE` for the walker) are tree-shaken from that package and counted there.

## Licence

MIT. The art lives in `@ragtechdev/pixel-sprites` and is CC BY 4.0.
