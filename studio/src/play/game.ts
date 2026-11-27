import { defineMap, doorBoxes, mapDrawables, mapTileSize, objectInfo, produceLimits, randomAvatar, tileSeasons, walkCycle, TILE_SIZE, type AvatarConfig, type Box, type ObjectId, type PlacedObject, type Raster, type TileMap } from "@ragtechdev/pixel-sprites";
import { drawRaster } from "@ragtechdev/pixel-sprites/canvas";
import { createCamera, createCarry, createGame, createMover, isOpen, overlaps, type Camera, type Direction, type Game, type Mover, type Scene } from "@ragtechdev/pixel-engine";
import { heroLook, places, start, type Npc, type Place, type PlaceId, type Spawn } from "./maps";
import { avatarFrame, trimmedObject } from "./sprites";

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
    /** The map of the place the hero is in, as it is now: what has been picked is gone. */
    map(): TileMap;
    /** What the hero is holding (or picking up), if anything. */
    carrying(): ObjectId | undefined;
}

/**
 * What a crop or a tree gives when it is picked, and what is left in its place. A tree or a bush (tomato, corn) carries a count of fruit and gives
 * one at a time, and with none left it stays, bare. The other crops give their vegetable and are gone.
 */
function harvest(o: PlacedObject): { item: ObjectId; left: PlacedObject | null } | undefined {
    const limit = produceLimits[o.id];
    // A tree or a bush carries a count of fruit: picking takes one, and when none are left it bears nothing. A tomato or corn plant stays in the
    // field, bare; the other crops come up whole.
    if (limit !== undefined) {
        const bush = o.id.startsWith("crop_");
        const stock = Math.min(o.count ?? limit, limit);
        const ripe = bush ? o.bearing !== "none" : (o.stage ?? "mature") === "mature" && o.bearing === "fruit";
        if (!ripe || stock <= 0) return undefined;
        const item = (bush ? `veg_${o.id.slice(5)}` : `fruit_${o.crop ?? "apple"}`) as ObjectId;
        return { item, left: stock === 1 ? { ...o, count: 0, bearing: "none" } : { ...o, count: stock - 1 } };
    }
    if (o.id.startsWith("crop_")) return { item: `veg_${o.id.slice(5)}` as ObjectId, left: null };
    return undefined;
}

/**
 * A small world to try the sprites and the engine together: a town and the inside of a house, joined by
 * doors. The hero walks freely, a pixel at a time, right up to the outline of water, trees, walls and other
 * characters, behind a building (its roof covers them) and through a door to warp. A speaks to the character in front (they turn to face you) or, in front of a crop or a tree bearing fruit, picks it
 * and holds it (the engine's `createCarry`), holding B runs, and START changes the season. Nothing here knows about React or the page.
 */
export function createPlay(options: PlayOptions = { theme: "summer" }, view: View = DESKTOP_VIEW): Play {
    const hero = createMover({ x: start.spawn.x * TILE_SIZE, y: start.spawn.y * TILE_SIZE, facing: start.spawn.facing, assist: 3 });
    const camera = createCamera(view, mapPixels(places[start.place]));
    const turned = new Map<Npc, Direction>();
    // What has been picked is gone from the map, so each place keeps its own map as it is now.
    const maps = new Map<PlaceId, TileMap>();
    const carry = createCarry<ObjectId>();
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
        const next = tileSeasons[(tileSeasons.indexOf(options.theme as (typeof tileSeasons)[number]) + 1) % tileSeasons.length];
        options.theme = next;
        options.onTheme?.(next);
    };

    const placeScene = (game: Game<CanvasRenderingContext2D>, place: Place, spawn: Spawn): Scene<CanvasRenderingContext2D> => {
        let fade = FADE;
        // A character fills its tile.
        const mapNow = () => maps.get(place.id) ?? place.map;
        const npcBoxes: Box[] = place.npcs.map((npc) => ({ x: npc.x * TILE_SIZE, y: npc.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }));
        const open = (box: Box) => isOpen(mapNow(), box, npcBoxes);
        const speakToAhead = () => {
            const point = hero.ahead(12);
            const npc = place.npcs.find((n) => point.x >= n.x * TILE_SIZE && point.x < (n.x + 1) * TILE_SIZE && point.y >= n.y * TILE_SIZE && point.y < (n.y + 1) * TILE_SIZE);
            if (npc) turned.set(npc, OPPOSITE[hero.facing]);
            return npc !== undefined;
        };
        // The crop or tree in front of the hero that has something to pick, with the tile it covers.
        // Right up against a plant is a few pixels from its tile's edge, and from further back it is a stride away: look at both.
        const pickableAhead = () => {
            const points = [hero.ahead(4), hero.ahead(12)];
            return mapNow().objects.find((o) => {
                const { width, height } = objectInfo[o.id];
                return harvest(o) && points.some((p) => {
                    const tx = Math.floor(p.x / TILE_SIZE);
                    const ty = Math.floor(p.y / TILE_SIZE);
                    return tx >= o.x && tx < o.x + width && ty >= o.y && ty < o.y + height;
                });
            });
        };
        // The avatar's picture and where it is drawn, for the pose of whatever it carries (and where something is picked up from).
        const heroBox = () => {
            const raster = avatarFrame(heroLookNow, hero.facing);
            return { raster, x: hero.x + Math.floor((TILE_SIZE - raster.width) / 2), y: hero.y - LIFT };
        };
        const pickUp = (o: PlacedObject) => {
            const found = harvest(o)!;
            const { width, height } = trimmedObject(found.item);
            // A crop is picked from the middle of the plant; fruit comes off the crown of the tree.
            const info = objectInfo[o.id];
            const centreX = (o.x + info.width / 2) * TILE_SIZE;
            const centreY = o.id === "fruit_tree" ? (o.y + 1) * TILE_SIZE - 4 : (o.y + info.height / 2) * TILE_SIZE;
            const box = heroBox();
            if (!carry.pickUp(found.item, { x: Math.round(centreX - width / 2 - box.x), y: Math.round(centreY - height / 2 - box.y) })) return;
            const map = mapNow();
            maps.set(place.id, defineMap(map.tileset, map.rows, found.left ? map.objects.map((x) => (x === o ? found.left! : x)) : map.objects.filter((x) => x !== o), map.buildings));
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
                // A speaks to the character in front, else picks what is in front (a crop or a tree's fruit), else puts down what is held.
                if (input.wasPressed("a") && !carry.busy && !speakToAhead()) {
                    const target = pickableAhead();
                    if (target && !carry.item) pickUp(target);
                    else if (!target) carry.drop();
                }
                carry.update(dt);
                // The hero stands still while picking something up. Holding B runs: the same walk, faster.
                hero.step(dt, carry.busy ? null : input.heldDirection(), open, input.isDown("b") ? RUN : 1);
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
                const drawables = mapDrawables(mapNow(), options.theme);
                drawRaster(ctx, drawables.ground, -camera.x, -camera.y);

                // Everything that stands is drawn back to front by the line it stands on, so a building covers a character
                // behind it and a character in front covers the building. A frame every half tile, so two tiles are one
                // full stride. Walking left or up the position counts down, so the cycle runs backwards.
                const travelled = hero.facing === "left" || hero.facing === "up" ? -(hero.x + hero.y) : hero.x + hero.y;
                const legPose = hero.moving ? walkCycle[Math.floor((((travelled % (2 * TILE_SIZE)) + 2 * TILE_SIZE) % (2 * TILE_SIZE)) / ((2 * TILE_SIZE) / walkCycle.length))] : "neutral";
                // Rasters are cropped to their content (hair and a side view change the width), so centre each avatar on its tile.
                const centred = (raster: { width: number }) => Math.floor((TILE_SIZE - raster.width) / 2);
                const stand = (raster: Raster, x: number, y: number) => (ctx: CanvasRenderingContext2D) => drawRaster(ctx, raster, x - camera.x, y - camera.y);
                const things: { sortY: number; draw: (ctx: CanvasRenderingContext2D) => void }[] = [
                    ...drawables.standing.map((d) => ({ sortY: d.sortY, draw: stand(d.raster, d.x, d.y) })),
                    ...place.npcs.map((npc) => {
                        const raster = avatarFrame(lookOf(npc), facing(npc));
                        return { sortY: (npc.y + 1) * TILE_SIZE, draw: stand(raster, npc.x * TILE_SIZE + centred(raster), npc.y * TILE_SIZE - LIFT) };
                    }),
                    (() => {
                        const raster = avatarFrame(heroLookNow, hero.facing, legPose);
                        const x = hero.x + centred(raster);
                        const y = hero.y - LIFT;
                        // What the hero carries, in the avatar's own pixels: it is drawn behind the avatar when the avatar has its back turned.
                        const held = carry.item && trimmedObject(carry.item, options.theme);
                        const pose = held ? carry.pose(raster, held, hero.facing) : undefined;
                        const item = held && pose ? stand(held.raster, x + pose.x - held.left, y + pose.y - held.top) : undefined;
                        const avatar = stand(raster, x, y + (pose?.crouch ?? 0));
                        return {
                            sortY: hero.y + TILE_SIZE,
                            draw: (c: CanvasRenderingContext2D) => {
                                if (pose?.behind) item?.(c);
                                avatar(c);
                                if (!pose?.behind) item?.(c);
                            }
                        };
                    })()
                    // Stable: at the same line a character goes after what is built there, since the sort keeps the order above.
                ].sort((a, b) => a.sortY - b.sortY);
                for (const thing of things) thing.draw(ctx);

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
    return { game, hero, camera, options, view, place: () => current, facing, randomize, carrying: () => carry.item, map: () => maps.get(current) ?? places[current].map };
}

function mapPixels(place: Place) {
    const tiles = mapTileSize(place.map);
    return { width: tiles.width * TILE_SIZE, height: tiles.height * TILE_SIZE };
}
