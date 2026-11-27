import { avatarKey, buildAvatar, buildIcon, buildObject, toVariant, type AvatarConfig, type IconColor, type IconId, type LegPose, type ObjectId, type Raster } from "@ragtechdev/pixel-sprites";
import type { Direction } from "@ragtechdev/pixel-engine";

const orientation = { up: "back", down: "front", left: "left", right: "right" } as const;

const cache = new Map<string, Raster>();

/** The avatar for a look, a facing and a leg pose. Built once, then reused. */
export function avatarFrame(look: AvatarConfig, facing: Direction, legPose: LegPose = "neutral"): Raster {
    const config: AvatarConfig = { ...look, headOrientation: orientation[facing], legPose };
    const key = avatarKey(config);
    let raster = cache.get(key);
    if (!raster) {
        raster = buildAvatar(config);
        cache.set(key, raster);
    }
    return raster;
}

/** A picture with the empty margin cut off, and where the cut left it, so it can be placed by what is visible. */
export interface Trimmed {
    readonly raster: Raster;
    /** The visible part's size, and how far it starts from the top-left of `raster`. */
    readonly width: number;
    readonly height: number;
    readonly left: number;
    readonly top: number;
}

function trim(raster: Raster): Trimmed {
    let left = raster.width;
    let top = raster.height;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < raster.height; y += 1) {
        for (let x = 0; x < raster.width; x += 1) {
            if (!raster.px[y * raster.width + x]) continue;
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
        }
    }
    return { raster, width: right - left + 1, height: bottom - top + 1, left, top };
}

const trimmed = new Map<string, Trimmed>();

const memo = (key: string, make: () => Raster) => {
    let found = trimmed.get(key);
    if (!found) {
        found = trim(make());
        trimmed.set(key, found);
    }
    return found;
};

export const trimmedObject = (id: ObjectId, theme?: string): Trimmed => memo(`object:${id}:${theme ?? ""}`, () => buildObject(id, theme));

/** An icon, trimmed, at a smaller size than it is made at, for popups over a character. */
export const trimmedIcon = (id: IconId, color?: IconColor): Trimmed => memo(`icon:${id}:${color ?? ""}`, () => toVariant(buildIcon(id, { color }), { size: 16 }));
