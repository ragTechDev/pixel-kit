/** One screen of a game: a title, a map, a menu. `Ctx` is whatever it draws on, for example a canvas context. */
export interface Scene<Ctx = unknown> {
    /** Called when the scene becomes the current one. */
    enter?(): void;
    /** Called when the scene is removed. */
    exit?(): void;
    update(dt: number): void;
    /** `alpha` is how far the clock is into the next update, from 0 up to 1. */
    render(ctx: Ctx, alpha: number): void;
}

export interface SceneStack<Ctx = unknown> {
    /** The scene on top. Only it updates and renders. */
    readonly current: Scene<Ctx> | undefined;
    readonly size: number;
    push(scene: Scene<Ctx>): void;
    /** Removes the top scene and returns it. */
    pop(): Scene<Ctx> | undefined;
    /** Swaps the top scene for another. */
    replace(scene: Scene<Ctx>): void;
}

export function createScenes<Ctx = unknown>(): SceneStack<Ctx> {
    const stack: Scene<Ctx>[] = [];
    return {
        get current() {
            return stack[stack.length - 1];
        },
        get size() {
            return stack.length;
        },
        push(scene) {
            stack.push(scene);
            scene.enter?.();
        },
        pop() {
            const scene = stack.pop();
            scene?.exit?.();
            return scene;
        },
        replace(scene) {
            stack.pop()?.exit?.();
            stack.push(scene);
            scene.enter?.();
        }
    };
}
