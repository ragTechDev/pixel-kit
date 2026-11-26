import { avatarKey, buildAvatar, type AvatarConfig, type LegPose, type Raster } from "@ragtechdev/pixel-sprites";
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
