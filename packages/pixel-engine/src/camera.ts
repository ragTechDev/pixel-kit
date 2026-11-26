export interface Size {
    readonly width: number;
    readonly height: number;
}

export interface Camera {
    /** Top-left corner of the view in world pixels. Always whole numbers, so pixels never smear. */
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    /** Centres the view on a world pixel, then keeps it inside the world. */
    follow(px: number, py: number): void;
    setBounds(bounds: Size): void;
}

function axis(view: number, bound: number, target: number): number {
    // A world smaller than the view is centred instead of pinned to a corner.
    if (bound <= view) return Math.floor((bound - view) / 2);
    return Math.min(Math.max(Math.floor(target - view / 2), 0), bound - view);
}

/** Where the view's top-left corner goes to show `target`, within `bounds`. Pure, for tests and custom cameras. */
export function cameraOrigin(view: Size, bounds: Size, px: number, py: number): { x: number; y: number } {
    return { x: axis(view.width, bounds.width, px), y: axis(view.height, bounds.height, py) };
}

export function createCamera(view: Size, bounds: Size): Camera {
    if (!(view.width > 0) || !(view.height > 0)) throw new Error("The view needs a positive width and height");
    let world = bounds;
    let origin = cameraOrigin(view, world, 0, 0);
    return {
        get x() {
            return origin.x;
        },
        get y() {
            return origin.y;
        },
        width: view.width,
        height: view.height,
        follow(px, py) {
            origin = cameraOrigin(view, world, px, py);
        },
        setBounds(next) {
            world = next;
            origin = cameraOrigin(view, world, origin.x + view.width / 2, origin.y + view.height / 2);
        }
    };
}
