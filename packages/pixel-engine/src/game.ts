import { createInput, type Input } from "./input";
import { createLoop } from "./loop";
import { createScenes, type Scene, type SceneStack } from "./scenes";

export interface Game<Ctx = unknown> {
    readonly input: Input;
    readonly scenes: SceneStack<Ctx>;
    /** Feeds real elapsed time in seconds. Runs the current scene's updates and returns how many ran. */
    advance(elapsed: number): number;
    /** Draws the current scene. */
    render(ctx: Ctx): void;
}

export interface GameOptions<Ctx> {
    /** The first scene, or a function that builds it from the game, so the scene can use `game.input` and `game.scenes`. */
    readonly scene: Scene<Ctx> | ((game: Game<Ctx>) => Scene<Ctx>);
    readonly input?: Input;
    /** Seconds per update. Default 1/60. */
    readonly step?: number;
    readonly maxFrame?: number;
}

/** Ties the fixed-step loop, the input and a scene stack together. It knows nothing about the DOM. */
export function createGame<Ctx = unknown>({ scene, input = createInput(), step, maxFrame }: GameOptions<Ctx>): Game<Ctx> {
    const scenes = createScenes<Ctx>();
    let alpha = 0;
    const loop = createLoop({
        step,
        maxFrame,
        update(dt) {
            scenes.current?.update(dt);
            input.endFrame();
        }
    });
    const game: Game<Ctx> = {
        input,
        scenes,
        advance(elapsed) {
            const result = loop.advance(elapsed);
            alpha = result.alpha;
            return result.steps;
        },
        render(ctx) {
            scenes.current?.render(ctx, alpha);
        }
    };
    scenes.push(typeof scene === "function" ? scene(game) : scene);
    return game;
}
