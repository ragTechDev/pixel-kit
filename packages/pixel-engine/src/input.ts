export const directions = ["up", "down", "left", "right"] as const;
export type Direction = (typeof directions)[number];

/** The fixed set of things a player can do. Keys, buttons and touches are mapped onto these. */
export const actions = [...directions, "a", "b", "start"] as const;
export type Action = (typeof actions)[number];

export const isAction = (value: unknown): value is Action =>
    typeof value === "string" && (actions as readonly string[]).includes(value);

export interface Input {
    /** Marks an action as held. Anything that is not an `Action` is ignored. */
    press(action: Action): void;
    release(action: Action): void;
    isDown(action: Action): boolean;
    /** True for one update after the action went down, however long it stays held. */
    wasPressed(action: Action): boolean;
    /** The direction held right now. When several are held, the one pressed last wins. */
    heldDirection(): Direction | undefined;
    /** Ends the update: clears `wasPressed`. The game calls this after every update. */
    endFrame(): void;
    /** Releases everything, for example when the window loses focus. */
    clear(): void;
}

export function createInput(): Input {
    const down = new Set<Action>();
    const pressed = new Set<Action>();
    let order: Direction[] = [];
    const isDirection = (action: Action): action is Direction => (directions as readonly string[]).includes(action);
    return {
        press(action) {
            if (!isAction(action) || down.has(action)) return;
            down.add(action);
            pressed.add(action);
            if (isDirection(action)) order.push(action);
        },
        release(action) {
            if (!isAction(action)) return;
            down.delete(action);
            if (isDirection(action)) order = order.filter((held) => held !== action);
        },
        isDown: (action) => down.has(action),
        wasPressed: (action) => pressed.has(action),
        heldDirection: () => order[order.length - 1],
        endFrame() {
            pressed.clear();
        },
        clear() {
            down.clear();
            pressed.clear();
            order = [];
        }
    };
}
