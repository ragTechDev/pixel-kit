import { useEffect, useState, type CSSProperties } from "react";
import { PixelImage } from "@ragtechdev/pixel-sprites/react";
import {
    buildMap,
    buildTent,
    defaultTentConfig,
    defineMap,
    resolveTentConfig,
    tentBox,
    tentDamage,
    tentSizes,
    tentStyles,
    toMapVariant,
    townTileset,
    type ResolvedTentConfig,
    type TentColor,
    type TentConfig
} from "@ragtechdev/pixel-sprites";
import { useWidth } from "../hooks";
import { CustomColours } from "../CustomColours";
import { recolor, type ColorMap } from "../recolor";
import { themeOf, variantOf, type Route } from "../router";
import { Chips, CodeBlock, SaveMenu, VariantBar, downloadPng, downloadSvg } from "../ui";
import { ColourPicker } from "./Buildings";

const STORAGE_KEY = "pixel-kit-studio:tent";

const HINTS = {
    style: "An A-frame with a ridge pole, a rounded dome, or a tarp on two poles that is open at the front.",
    size: "In tiles. A tent is one tile less tall than it is wide."
};

function loadLook(): TentConfig {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        // resolveTentConfig drops anything that is not in the fixed lists.
        if (saved) return resolveTentConfig(JSON.parse(saved));
    } catch {
        // No storage (private window, blocked): start from the default.
    }
    return {};
}

/** One tent on grass, with room round it, for showing it on its own. */
function tentMap(look: ResolvedTentConfig, margin = 1) {
    const { width, height } = tentBox(look);
    const wide = Math.ceil(width / 2) + margin * 2;
    const high = Math.ceil(height / 2) + margin * 2;
    const rows = Array.from({ length: high }, () => "g".repeat(wide));
    return defineMap(townTileset, rows, [], [], [{ config: look, x: Math.floor((wide * 2 - width) / 2), y: Math.floor((high * 2 - height) / 2) }]);
}

function Options<T extends string | number>({ title, hint, options, value, make, onPick }: { title: string; hint: string; options: readonly T[]; value: T; make: (option: T) => ReturnType<typeof buildTent>; onPick: (option: T) => void }) {
    const arts = options.map(make);
    // One scale for the whole row, so a small tent does not look bigger than a large one.
    const biggest = arts.reduce((m, a) => ({ w: Math.max(m.w, a.width), h: Math.max(m.h, a.height) }), { w: 1, h: 1 });
    const scale = Math.min(1, 120 / biggest.h, 136 / biggest.w);
    return (
        <div className="opt-section">
            <div className="h opt-title">{title}</div>
            <p className="muted opt-note">{hint}</p>
            <div className="opt-grid opt-grid-tall">
                {options.map((o, i) => (
                    <button key={o} className="opt" aria-pressed={value === o} onClick={() => onPick(o)}>
                        <span className="opt-art" aria-hidden><PixelImage raster={arts[i]} pixelSize={scale} /></span>
                        <span>{o}{typeof o === "number" ? " tiles" : ""}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export function TentBuilder({ route }: { route: Route }) {
    const [cfg, setCfg] = useState<TentConfig>(loadLook);
    const [stage, stageWidth] = useWidth<HTMLDivElement>();
    // Single-colour edits only change the preview and what you save, not the code.
    const [custom, setCustom] = useState<ColorMap>({});

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
        } catch {
            // Not remembered.
        }
    }, [cfg]);

    const look = resolveTentConfig(cfg);
    const variant = variantOf(route);
    const mapped = toMapVariant(buildMap(tentMap(look), themeOf(route)), variant);
    const shown = recolor(mapped, custom);
    const px = Math.max(1, Math.floor(Math.min(Math.max(stageWidth - 16, 1) / shown.width, 440 / shown.height)));

    const choose = <K extends keyof TentConfig>(field: K, value: TentConfig[K]) => setCfg((prev) => ({ ...prev, [field]: value }));
    const changed = (Object.keys(defaultTentConfig) as (keyof ResolvedTentConfig)[])
        .filter((k) => look[k] !== defaultTentConfig[k])
        .map((k) => `${k}: ${typeof look[k] === "number" ? look[k] : `"${look[k]}"`}`);
    const config = `{ ${changed.join(", ")} }`;
    const hasCustom = Object.keys(custom).length > 0;

    return (
        <div className="stack">
            <p className="muted" style={{ maxWidth: 720 }}>
                A tent for a camp or a shelter: pick a shape, a size and a colour. It is drawn from the front and above like the houses, and it can be shown collapsed. Your tent is saved in this browser.
            </p>
            <VariantBar route={route} themes native={{ width: 16, height: 16 }} sizeLabel="Pixels per tile" />

            <div className="creator">
                <div className="stage-col">
                    <div className="tools" style={{ marginBottom: 0 }}>
                        <Chips label="War damage" value={look.damage === "none" ? undefined : look.damage} options={tentDamage.filter((d) => d !== "none")} nativeLabel="None"
                            onPick={(d) => choose("damage", d ?? "none")} />
                    </div>
                    <section className="panel stage-card" aria-label="Your tent">
                        <div ref={stage} className="stage checker" style={{ minHeight: 320, padding: 8 } as CSSProperties}>
                            <PixelImage raster={shown} pixelSize={px} title="Your tent" />
                        </div>
                    </section>
                    <div className="stage-actions">
                        <button className="btn" onClick={() => { setCfg({}); setCustom({}); }}>Reset</button>
                        <SaveMenu onPng={() => downloadPng("tent", shown, 4)} onSvg={() => downloadSvg("tent", shown, 4)} />
                    </div>
                </div>

                <section className="panel dressing" aria-label="Customise">
                    <Options title="Shape" hint={HINTS.style} options={tentStyles} value={look.style} make={(style) => buildTent({ ...look, style })} onPick={(style) => choose("style", style)} />
                    <Options title="Size" hint={HINTS.size} options={tentSizes} value={look.size} make={(size) => buildTent({ ...look, size })} onPick={(size) => choose("size", size)} />
                    <ColourPicker title="Canvas colour" value={look.color} natural naturalId="canvas" onPick={(v) => choose("color", v as TentColor)} />
                </section>
            </div>

            <div className="panel">
                <CustomColours raster={mapped} map={custom} onChange={setCustom} />
            </div>
            <div className="panel stack">
                <span className="h">Code</span>
                <CodeBlock code={`import { Tent } from "@ragtechdev/pixel-sprites/react";\n\n<Tent${[look.style !== defaultTentConfig.style && `style="${look.style}"`, look.size !== defaultTentConfig.size && `tentSize={${look.size}}`, look.color !== defaultTentConfig.color && `color="${look.color}"`, look.damage !== "none" && `damage="${look.damage}"`, `pixelSize={4}`].filter(Boolean).map((p) => `\n  ${p}`).join("")}\n/>`} />
                <p className="muted">To put it in your own map, give <code>defineMap</code> the tent and its top-left tile as the fifth argument. Its canvas is solid, and the tile at the foot of the doorway is open and has <code>door</code> set:</p>
                <CodeBlock code={`import { defineMap, townTileset } from "@ragtechdev/pixel-sprites";\n\nconst map = defineMap(townTileset, Array(8).fill("gggggggg"), [], [], [\n  { config: ${config}, x: 2, y: 1 } // x and y are in tiles\n]);`} />
                {hasCustom && <p className="muted">You edited single colours. They are in the preview and in Save PNG, but not in this code: the library only uses its fixed colours.</p>}
            </div>
        </div>
    );
}
