import { isAction, type Action, type Game, type Input } from "../index";

/** Maps `KeyboardEvent.code` values to actions. Arrows or WASD to move, Space or Z for A, X or Escape for B, Enter for start. */
export const defaultKeymap: Readonly<Record<string, Action>> = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    KeyW: "up",
    KeyS: "down",
    KeyA: "left",
    KeyD: "right",
    Space: "a",
    KeyZ: "a",
    KeyX: "b",
    Escape: "b",
    Enter: "start"
};

export type KeyTarget = Pick<EventTarget, "addEventListener" | "removeEventListener">;

interface KeyLike {
    readonly code: string;
    readonly ctrlKey?: boolean;
    readonly metaKey?: boolean;
    readonly altKey?: boolean;
    preventDefault(): void;
}

const own = Object.prototype.hasOwnProperty;

/**
 * Sends key presses on `target` to an input. Keys are matched by position (`event.code`), so
 * they work on any keyboard layout. Keys with Ctrl, Cmd or Alt held are left alone so browser
 * shortcuts keep working. Everything is released when the target loses focus. Returns a function that detaches it.
 */
export function attachKeyboard(target: KeyTarget, input: Input, keymap: Readonly<Record<string, Action>> = defaultKeymap): () => void {
    const actionFor = (event: KeyLike): Action | undefined => {
        if (event.ctrlKey || event.metaKey || event.altKey) return undefined;
        const action = own.call(keymap, event.code) ? keymap[event.code] : undefined;
        return isAction(action) ? action : undefined;
    };
    const down = (event: Event) => {
        const action = actionFor(event as unknown as KeyLike);
        if (!action) return;
        event.preventDefault();
        input.press(action);
    };
    const up = (event: Event) => {
        const action = actionFor(event as unknown as KeyLike);
        if (!action) return;
        event.preventDefault();
        input.release(action);
    };
    const blur = () => input.clear();
    target.addEventListener("keydown", down);
    target.addEventListener("keyup", up);
    target.addEventListener("blur", blur);
    return () => {
        target.removeEventListener("keydown", down);
        target.removeEventListener("keyup", up);
        target.removeEventListener("blur", blur);
    };
}

export interface StartOptions {
    /** Size of the picture in game pixels. The canvas is exactly this big; scenes draw at 1:1. */
    readonly width: number;
    readonly height: number;
    /** Whole-number zoom for the canvas on screen. Default 1. */
    readonly scale?: number;
    /** Replacements for `requestAnimationFrame` and `cancelAnimationFrame`, for tests. */
    readonly requestFrame?: (callback: (time: number) => void) => number;
    readonly cancelFrame?: (handle: number) => void;
}

/**
 * Runs a game on a canvas with requestAnimationFrame. The canvas holds one pixel per game
 * pixel and the browser scales it up without smoothing. Returns a function that stops it.
 */
export function start(game: Game<CanvasRenderingContext2D>, canvas: HTMLCanvasElement, options: StartOptions): () => void {
    const { width, height, scale = 1 } = options;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
        throw new Error("width and height must be whole numbers of game pixels");
    }
    if (!Number.isInteger(scale) || scale < 1) throw new Error("scale must be a whole number, so pixels stay square");
    const request = options.requestFrame ?? ((callback) => requestAnimationFrame(callback));
    const cancel = options.cancelFrame ?? ((handle) => cancelAnimationFrame(handle));

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width * scale}px`;
    canvas.style.height = `${height * scale}px`;
    canvas.style.imageRendering = "pixelated";
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("A 2D canvas is not available");
    ctx.imageSmoothingEnabled = false;

    let running = true;
    let handle = 0;
    let last: number | undefined;
    const frame = (time: number) => {
        if (!running) return;
        game.advance(last === undefined ? 0 : (time - last) / 1000);
        last = time;
        ctx.clearRect(0, 0, width, height);
        game.render(ctx);
        handle = request(frame);
    };
    handle = request(frame);
    return () => {
        running = false;
        cancel(handle);
    };
}
