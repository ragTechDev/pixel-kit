import { buildMap, queryCell, mapTileSize, randomAvatar, tileThemes, walkCycle, TILE_SIZE, type AvatarConfig } from "@ragtechdev/pixel-sprites";
import { drawRaster } from "@ragtechdev/pixel-sprites/canvas";
import { createCamera, createGame, createWalker, isWalkable, neighbor, type Camera, type Direction, type Game, type Scene, type Walker } from "@ragtechdev/pixel-engine";
import { heroLook, places, start, type Npc, type Place, type PlaceId, type Spawn } from "./maps";
import { avatarFrame } from "./sprites";

export interface View {
    readonly width: number;
    readonly height: number;
}

/** The picture on a page: 15 by 9 tiles. */
export const DESKTOP_VIEW: View = { width: 240, height: 144 };
/** The picture on a handheld: 10 by 9 tiles, the resolution of a classic handheld's screen. */
export const HANDHELD_VIEW: View = { width: 160, height: 144 };

/** Seconds a place takes to fade in. */
const FADE = 0.3;
/** Holding B walks this much faster. */
const RUN = 2;
/** An avatar is a tile and a half tall, so it stands this many pixels above its tile. */
const LIFT = 8;
const BACKDROP = "#1e1e2e";

const OPPOSITE: Record<Direction, Direction> = { up: "down", down: "up", left: "right", right: "left" };

export interface PlayOptions {
    /** A tile palette name (`tileThemes`). Read on every frame, so it can change while playing. */
    theme: string;
    /** Called when the player changes the season from inside the world (START), so a page can keep its own copy in step. */
    onTheme?: (theme: string) => void;
}

export interface Play {
    readonly game: Game<CanvasRenderingContext2D>;
    readonly hero: Walker;
    readonly camera: Camera;
    readonly options: PlayOptions;
    /** Size of the picture in game pixels. */
    readonly view: View;
    /** The place the hero is in. */
    place(): PlaceId;
    /** Which way a character is facing. Characters start facing down and turn when the hero speaks to them. */
    facing(npc: Npc): Direction;
    /** Gives the hero and every character a new random look. */
    randomize(): void;
}

/**
 * A small world to try the sprites and the engine together: a town and the inside of a house, joined by
 * doors. The hero walks a tile at a time, stops at water, trees, walls and other characters, and steps
 * through a door to warp. A speaks to the character in front (they turn to face you), holding B runs, and
 * START changes the season. Nothing here knows about React or the page.
 */
export function createPlay(options: PlayOptions = { theme: "summer" }, view: View = DESKTOP_VIEW): Play {
    const hero = createWalker({ x: start.spawn.x, y: start.spawn.y, facing: start.spawn.facing });
    const camera = createCamera(view, mapPixels(places[start.place]));
    const turned = new Map<Npc, Direction>();
    const facing = (npc: Npc): Direction => turned.get(npc) ?? "down";
    let current: PlaceId = start.place;
    // The looks are this world's own, so a new random one changes nothing for another world made from the same maps.
    let heroLookNow: AvatarConfig = heroLook;
    const npcLooks = new Map<Npc, AvatarConfig>();
    const lookOf = (npc: Npc) => npcLooks.get(npc) ?? npc.look;
    const randomize = () => {
        heroLookNow = randomAvatar();
        for (const place of Object.values(places)) for (const npc of place.npcs) npcLooks.set(npc, randomAvatar());
    };

    const nextSeason = () => {
        const next = tileThemes[(tileThemes.indexOf(options.theme as (typeof tileThemes)[number]) + 1) % tileThemes.length];
        options.theme = next;
        options.onTheme?.(next);
    };

    const placeScene = (game: Game<CanvasRenderingContext2D>, place: Place, spawn: Spawn): Scene<CanvasRenderingContext2D> => {
        let fade = FADE;
        const canEnter = (x: number, y: number) =>
            isWalkable(place.map, x, y, { doors: true }) && !place.npcs.some((npc) => npc.x === x && npc.y === y);
        const speakToAhead = () => {
            const ahead = neighbor(hero.tx, hero.ty, hero.facing);
            const npc = place.npcs.find((n) => n.x === ahead.x && n.y === ahead.y);
            if (npc) turned.set(npc, OPPOSITE[hero.facing]);
        };
        return {
            enter() {
                current = place.id;
                hero.teleport(spawn.x, spawn.y, spawn.facing);
                camera.setBounds(mapPixels(place));
                camera.follow(hero.x + TILE_SIZE / 2, hero.y + TILE_SIZE / 2);
            },
            update(dt) {
                const input = game.input;
                fade = Math.max(0, fade - dt);
                if (input.wasPressed("start")) nextSeason();
                if (input.wasPressed("a") && !hero.moving) speakToAhead();
                const direction = input.heldDirection();
                if (direction) hero.walk(direction, canEnter);
                // Holding B runs: the same step, taken faster.
                if (hero.update(input.isDown("b") ? dt * RUN : dt)) {
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
                ctx.fillRect(0, 0, view.width, view.height);
                drawRaster(ctx, buildMap(place.map, options.theme), -camera.x, -camera.y);

                // Draw whoever is further down the screen last, so a character in front covers one behind.
                // A frame every half tile, so two tiles are one full stride. Walking left or up the position counts down, so the cycle runs backwards.
                const travelled = hero.facing === "left" || hero.facing === "up" ? -(hero.x + hero.y) : hero.x + hero.y;
                const legPose = hero.moving ? walkCycle[Math.floor((((travelled % (2 * TILE_SIZE)) + 2 * TILE_SIZE) % (2 * TILE_SIZE)) / ((2 * TILE_SIZE) / walkCycle.length))] : "neutral";
                const actors = [
                    ...place.npcs.map((npc) => ({ y: npc.y * TILE_SIZE, x: npc.x * TILE_SIZE, raster: avatarFrame(lookOf(npc), facing(npc)) })),
                    { y: hero.y, x: hero.x, raster: avatarFrame(heroLookNow, hero.facing, legPose) }
                ].sort((a, b) => a.y - b.y);
                // Rasters are cropped to their content (hair and a side view change the width), so centre each on its tile.
                for (const actor of actors) {
                    const centre = Math.floor((TILE_SIZE - actor.raster.width) / 2);
                    drawRaster(ctx, actor.raster, actor.x - camera.x + centre, actor.y - camera.y - LIFT);
                }

                if (fade > 0) {
                    ctx.fillStyle = `rgba(0, 0, 0, ${fade / FADE})`;
                    ctx.fillRect(0, 0, view.width, view.height);
                }
            }
        };
    };

    const game = createGame<CanvasRenderingContext2D>({
        scene: (g) => placeScene(g, places[start.place], start.spawn)
    });
    return { game, hero, camera, options, view, place: () => current, facing, randomize };
}

function mapPixels(place: Place) {
    const tiles = mapTileSize(place.map);
    return { width: tiles.width * TILE_SIZE, height: tiles.height * TILE_SIZE };
}
