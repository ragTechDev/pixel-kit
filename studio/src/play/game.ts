import { buildMap, queryCell, mapTileSize, TILE_SIZE } from "@ragtechdev/pixel-sprites";
import { drawRaster } from "@ragtechdev/pixel-sprites/canvas";
import { createCamera, createGame, createWalker, isWalkable, type Camera, type Game, type Scene, type Walker } from "@ragtechdev/pixel-engine";
import { heroLook, places, start, type Place, type PlaceId, type Spawn } from "./maps";
import { avatarFrame } from "./sprites";

/** The picture is 15 by 9 tiles. */
export const VIEW = { width: 240, height: 144 } as const;

/** Seconds a place takes to fade in. */
const FADE = 0.3;
/** An avatar is a tile and a half tall, so it stands this many pixels above its tile. */
const LIFT = 8;
const BACKDROP = "#1e1e2e";

export interface PlayOptions {
    /** A tile palette name (`tileThemes`). Read on every frame, so it can change while playing. */
    theme: string;
}

export interface Play {
    readonly game: Game<CanvasRenderingContext2D>;
    readonly hero: Walker;
    readonly camera: Camera;
    readonly options: PlayOptions;
    /** The place the hero is in. */
    place(): PlaceId;
}

/**
 * A small world to try the sprites and the engine together: a town and the inside of a house, joined by
 * doors. The hero walks a tile at a time, stops at water, trees, walls and other characters, and steps
 * through a door to warp. Nothing here knows about React or the page.
 */
export function createPlay(options: PlayOptions = { theme: "summer" }): Play {
    const hero = createWalker({ x: start.spawn.x, y: start.spawn.y, facing: start.spawn.facing });
    const camera = createCamera(VIEW, mapPixels(places[start.place]));
    let current: PlaceId = start.place;

    const placeScene = (game: Game<CanvasRenderingContext2D>, place: Place, spawn: Spawn): Scene<CanvasRenderingContext2D> => {
        let fade = FADE;
        const canEnter = (x: number, y: number) =>
            isWalkable(place.map, x, y, { doors: true }) && !place.npcs.some((npc) => npc.x === x && npc.y === y);
        return {
            enter() {
                current = place.id;
                hero.teleport(spawn.x, spawn.y, spawn.facing);
                camera.setBounds(mapPixels(place));
                camera.follow(hero.x + TILE_SIZE / 2, hero.y + TILE_SIZE / 2);
            },
            update(dt) {
                fade = Math.max(0, fade - dt);
                const direction = game.input.heldDirection();
                if (direction) hero.walk(direction, canEnter);
                if (hero.update(dt)) {
                    // Arriving on a door tile is the moment to warp.
                    const exit = place.exits.find((e) => e.x === hero.tx && e.y === hero.ty && queryCell(place.map, e.x, e.y)?.door);
                    if (exit) {
                        const next = places[exit.to];
                        game.scenes.replace(placeScene(game, next, next.arrive));
                        return;
                    }
                }
                camera.follow(hero.x + TILE_SIZE / 2, hero.y + TILE_SIZE / 2);
            },
            render(ctx) {
                ctx.fillStyle = BACKDROP;
                ctx.fillRect(0, 0, VIEW.width, VIEW.height);
                drawRaster(ctx, buildMap(place.map, options.theme), -camera.x, -camera.y);

                // Draw whoever is further down the screen last, so a character in front covers one behind.
                const stepping = hero.moving && (hero.x + hero.y) % TILE_SIZE < TILE_SIZE / 2;
                const actors = [
                    ...place.npcs.map((npc) => ({ y: npc.y * TILE_SIZE, x: npc.x * TILE_SIZE, raster: avatarFrame(npc.look, "down") })),
                    { y: hero.y, x: hero.x, raster: avatarFrame(heroLook, hero.facing, stepping) }
                ].sort((a, b) => a.y - b.y);
                // Rasters are cropped to their content (hair and a side view change the width), so centre each on its tile.
                for (const actor of actors) {
                    const centre = Math.floor((TILE_SIZE - actor.raster.width) / 2);
                    drawRaster(ctx, actor.raster, actor.x - camera.x + centre, actor.y - camera.y - LIFT);
                }

                if (fade > 0) {
                    ctx.fillStyle = `rgba(0, 0, 0, ${fade / FADE})`;
                    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
                }
            }
        };
    };

    const game = createGame<CanvasRenderingContext2D>({
        scene: (g) => placeScene(g, places[start.place], start.spawn)
    });
    return { game, hero, camera, options, place: () => current };
}

function mapPixels(place: Place) {
    const tiles = mapTileSize(place.map);
    return { width: tiles.width * TILE_SIZE, height: tiles.height * TILE_SIZE };
}
