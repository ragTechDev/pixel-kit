export interface LoopOptions {
    /** Called once per fixed step with the step length in seconds. */
    readonly update: (dt: number) => void;
    /** Seconds per update. Default 1/60. */
    readonly step?: number;
    /**
     * The most real time, in seconds, one `advance` call may catch up on. A tab that was
     * hidden for a minute then resumes with a few updates instead of thousands. Default 0.25.
     */
    readonly maxFrame?: number;
}

export interface LoopResult {
    /** How many updates ran. */
    readonly steps: number;
    /** How far into the next step the clock is, from 0 up to 1. Use it to draw between two updates. */
    readonly alpha: number;
}

export interface Loop {
    /** Feeds real elapsed time in seconds and runs as many whole steps as it covers. */
    advance(elapsed: number): LoopResult;
    /** Forgets any time carried over to the next step. */
    reset(): void;
}

// Absorbs floating-point drift: sixty advances of 1/60 s are sixty steps, not fifty-nine.
const EPSILON = 1e-9;

/**
 * A fixed-timestep accumulator. It owns no timer, so it runs the same under
 * requestAnimationFrame, a test, or a server.
 */
export function createLoop({ update, step = 1 / 60, maxFrame = 0.25 }: LoopOptions): Loop {
    if (!(step > 0) || !Number.isFinite(step)) throw new Error("step must be a positive number of seconds");
    if (!(maxFrame >= step) || !Number.isFinite(maxFrame)) throw new Error("maxFrame must be at least one step");
    let carry = 0;
    return {
        advance(elapsed) {
            carry += Number.isFinite(elapsed) && elapsed > 0 ? Math.min(elapsed, maxFrame) : 0;
            let steps = 0;
            while (carry >= step - EPSILON) {
                update(step);
                carry = Math.max(0, carry - step);
                steps += 1;
            }
            return { steps, alpha: Math.min(1, carry / step) };
        },
        reset() {
            carry = 0;
        }
    };
}
