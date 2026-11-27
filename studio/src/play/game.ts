import { doorBoxes, mapDrawables, mapTileSize, randomAvatar, tileThemes, walkCycle, TILE_SIZE, type AvatarConfig, type Box } from "@ragtechdev/pixel-sprites";
import { drawRaster } from "@ragtechdev/pixel-sprites/canvas";
import { createCamera, createGame, createMover, isOpen, overlaps, type Camera, type Direction, type Game, type Mover, type Scene } from "@ragtechdev/pixel-engine";
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
    readonly hero: Mover;
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
 * doors. The hero walks freely, a pixel at a time, right up to the outline of water, trees, walls and other
 * characters, behind a building (its roof covers them) and through a door to warp. A speaks to the character in front (they turn to face you), holding B runs, and
 * START changes the season. Nothing here knows about React or the page.
 */
export function createPlay(options: PlayOptions = { theme: "summer" }, view: View = DESKTOP_VIEW): Play {
    const hero = createMover({ x: start.spawn.x * TILE_SIZE, y: start.spawn.y * TILE_SIZE, facing: start.spawn.facing, assist: 3 });
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
        // A character fills its tile.
        const npcBoxes: Box[] = place.npcs.map((npc) => ({ x: npc.x * TILE_SIZE, y: npc.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }));
        const open = (box: Box) => isOpen(place.map, box, npcBoxes);
        const speakToAhead = () => {
            const point = hero.ahead(12);
            const npc = place.npcs.find((n) => point.x >= n.x * TILE_SIZE && point.x < (n.x + 1) * TILE_SIZE && point.y >= n.y * TILE_SIZE && point.y < (n.y + 1) * TILE_SIZE);
            if (npc) turned.set(npc, OPPOSITE[hero.facing]);
        };
        const doors = doorBoxes(place.map);
        // The door the hero's feet are on, by its tile.
        const doorUnderfoot = () => {
            const door = doors.find((d) => overlaps(hero.feet, d));
            return door && place.exits.find((e) => e.x === door.x / TILE_SIZE && e.y === door.y / TILE_SIZE);
        };
        return {
            enter() {
                current = place.id;
                hero.teleport(spawn.x * TILE_SIZE, spawn.y * TILE_SIZE, spawn.facing);
                camera.setBounds(mapPixels(place));
                camera.follow(hero.x + TILE_SIZE / 2, hero.y + TILE_SIZE / 2);
            },
            update(dt) {
                const input = game.input;
                fade = Math.max(0, fade - dt);
                if (input.wasPressed("start")) nextSeason();
                if (input.wasPressed("a")) speakToAhead();
                // Holding B runs: the same walk, faster.
                hero.step(dt, input.heldDirection(), open, input.isDown("b") ? RUN : 1);
                // Reaching a door is the moment to warp.
                const exit = doorUnderfoot();
                if (exit) {
                    const next = places[exit.to];
                    game.scenes.replace(placeScene(game, next, next.arrive));
                    return;
                }
                camera.follow(hero.x + TILE_SIZE / 2, hero.y + TILE_SIZE / 2);
            },
            render(ctx) {
                ctx.fillStyle = BACKDROP;
                ctx.fillRect(0, 0, view.width, view.height);
                const drawables = mapDrawables(place.map, options.theme);
                drawRaster(ctx, drawables.ground, -camera.x, -camera.y);

                // Everything that stands is drawn back to front by the line it stands on, so a building covers a character
                // behind it and a character in front covers the building. A frame every half tile, so two tiles are one
                // full stride. Walking left or up the position counts down, so the cycle runs backwards.
                const travelled = hero.facing === "left" || hero.facing === "up" ? -(hero.x + hero.y) : hero.x + hero.y;
                const legPose = hero.moving ? walkCycle[Math.floor((((travelled % (2 * TILE_SIZE)) + 2 * TILE_SIZE) % (2 * TILE_SIZE)) / ((2 * TILE_SIZE) / walkCycle.length))] : "neutral";
                // Rasters are cropped to their content (hair and a side view change the width), so centre each avatar on its tile.
                const centred = (raster: { width: number }) => Math.floor((TILE_SIZE - raster.width) / 2);
                const things = [
                    ...drawables.standing.map((d) => ({ sortY: d.sortY, x: d.x, y: d.y, raster: d.raster })),
                    ...place.npcs.map((npc) => {
                        const raster = avatarFrame(lookOf(npc), facing(npc));
                        return { sortY: (npc.y + 1) * TILE_SIZE, x: npc.x * TILE_SIZE + centred(raster), y: npc.y * TILE_SIZE - LIFT, raster };
                    }),
                    (() => {
                        const raster = avatarFrame(heroLookNow, hero.facing, legPose);
                        return { sortY: hero.y + TILE_SIZE, x: hero.x + centred(raster), y: hero.y - LIFT, raster };
                    })()
                    // Stable: at the same line a character goes after what is built there, since the sort keeps the order above.
                ].sort((a, b) => a.sortY - b.sortY);
                for (const thing of things) drawRaster(ctx, thing.raster, thing.x - camera.x, thing.y - camera.y);

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
