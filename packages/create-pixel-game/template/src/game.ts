import { buildAvatar, buildMap, mapTileSize, queryCell, TILE_SIZE, type Raster, type TileMap } from "@ragtechdev/pixel-sprites";
import { drawRaster } from "@ragtechdev/pixel-sprites/canvas";
import { createCamera, createGame, createWalker, isWalkable, type Direction, type Game, type Scene } from "@ragtechdev/pixel-engine";
import { house, town } from "./maps";

/** The picture is 10 by 9 tiles, the resolution of a classic handheld's screen. */
export const VIEW = { width: 160, height: 144 } as const;

type Ctx = CanvasRenderingContext2D;
type PlaceName = "town" | "house";

interface Place {
    map: TileMap;
    /** Where the hero appears when they come in through a door. */
    arrive: { x: number; y: number; facing: Direction };
    /** Stepping onto the tile "x,y" goes to another place. */
    doors: Readonly<Record<string, PlaceName>>;
}

const places: Record<PlaceName, Place> = {
    town: { map: town, arrive: { x: 7, y: 6, facing: "down" }, doors: { "7,5": "house" } },
    house: { map: house, arrive: { x: 7, y: 9, facing: "up" }, doors: { "7,10": "town" } }
};

// One avatar per way of facing. Change the options to change how the hero looks (see the Avatars page in the docs).
const orientation = { up: "back", down: "front", left: "left", right: "right" } as const;
const hero: Record<Direction, Raster> = {
    up: buildAvatar({ headOrientation: orientation.up }),
    down: buildAvatar({ headOrientation: orientation.down }),
    left: buildAvatar({ headOrientation: orientation.left }),
    right: buildAvatar({ headOrientation: orientation.right })
};

const pixels = (map: TileMap) => {
    const tiles = mapTileSize(map);
    return { width: tiles.width * TILE_SIZE, height: tiles.height * TILE_SIZE };
};

/**
 * A town and a house, joined by a door. The hero walks a tile at a time, and water, trees, walls and furniture stop
 * them, because collision reads the same map data that drew the world.
 */
export function createWorld(): Game<Ctx> {
    const walker = createWalker({ x: 7, y: 8, facing: "up" });
    const camera = createCamera(VIEW, pixels(town));

    const scene = (game: Game<Ctx>, name: PlaceName, spawn = places[name].arrive): Scene<Ctx> => {
        const place = places[name];
        const ground = buildMap(place.map);
        const canEnter = (x: number, y: number) => isWalkable(place.map, x, y, { doors: true });
        return {
            enter() {
                walker.teleport(spawn.x, spawn.y, spawn.facing);
                camera.setBounds(pixels(place.map));
                camera.follow(walker.x + TILE_SIZE / 2, walker.y + TILE_SIZE / 2);
            },
            update(dt) {
                const direction = game.input.heldDirection();
                if (direction) walker.walk(direction, canEnter);
                // Arriving on a door tile is the moment to go through it.
                if (walker.update(dt)) {
                    const to = place.doors[`${walker.tx},${walker.ty}`];
                    if (to && queryCell(place.map, walker.tx, walker.ty)?.door) {
                        game.scenes.replace(scene(game, to));
                        return;
                    }
                }
                camera.follow(walker.x + TILE_SIZE / 2, walker.y + TILE_SIZE / 2);
            },
            render(ctx) {
                ctx.fillStyle = "#1e1e2e";
                ctx.fillRect(0, 0, VIEW.width, VIEW.height);
                drawRaster(ctx, ground, -camera.x, -camera.y);
                // The avatar is a tile and a half tall, so it stands 8 px above its tile, and is centred on it.
                const sprite = hero[walker.facing];
                const centre = Math.floor((TILE_SIZE - sprite.width) / 2);
                drawRaster(ctx, sprite, walker.x - camera.x + centre, walker.y - camera.y - 8);
            }
        };
    };

    return createGame<Ctx>({ scene: (game) => scene(game, "town", { x: 7, y: 8, facing: "up" }) });
}
