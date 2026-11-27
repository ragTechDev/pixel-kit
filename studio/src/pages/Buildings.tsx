import { useEffect, useState, type CSSProperties } from "react";
import { PixelImage } from "@ragtechdev/pixel-sprites/react";
import {
    buildBuilding,
    buildMap,
    buildingColors,
    buildingDepths,
    buildingMap,
    buildingProps,
    buildingRooftops,
    buildingStoreys,
    buildingWings,
    buildingWalls,
    buildingWidths,
    chimneys,
    colorRamps,
    defaultBuildingConfig,
    defaultTileTheme,
    doorPositions,
    doorStyles,
    parseHex,
    porches,
    randomBuilding,
    resolveBuildingConfig,
    roofPitches,
    roofShapes,
    toMapVariant,
    maxWindows,
    windowStyles,
    type MaterialColor,
    roofMaterials,
    type BuildingConfig,
    type ColorName,
    type Raster,
    type ResolvedBuildingConfig
} from "@ragtechdev/pixel-sprites";
import { useWidth } from "../hooks";
import { CustomColours } from "../CustomColours";
import { recolor, type ColorMap } from "../recolor";
import { themeOf, variantOf, type Route } from "../router";
import { TentBuilder } from "./Tents";
import { Chips, CodeBlock, SaveMenu, VariantBar, downloadPng, downloadSvg } from "../ui";

type ColourField = "roofColor" | "wallColor" | "trimColor" | "doorColor";
type Field = Exclude<keyof BuildingConfig, ColourField>;

interface Section {
    field: Field;
    title: string;
    hint?: string;
    options: readonly (string | number)[];
    /** A number to type instead of a choice of pictures, up to the most that fit. */
    count?: (look: ResolvedBuildingConfig) => number;
    /** Only shown for some buildings, such as the choices for a wing when there is one. */
    when?: (look: ResolvedBuildingConfig) => boolean;
}

interface Colour {
    field: ColourField;
    title: string;
    /** The colour can be left as the material's own. */
    natural?: boolean;
}

interface Tab {
    id: string;
    label: string;
    sections: Section[];
    colours?: Colour[];
}

const TABS: Tab[] = [
    { id: "roof", label: "Roof", sections: [
        { field: "roof", title: "Shape", hint: "How the roof looks from above and in front. A gable and a hip roof have a ridge running front to back; a hip roof has a sloping face at the front instead of a gable on the wall. A saltbox has its ridge off to one side.", options: roofShapes },
        { field: "roofMaterial", title: "Covering", hint: "Slate shingles, terracotta tiles, thatch or wood shakes. A flat roof is a floor inside a parapet, so it has none.", options: roofMaterials, when: (look) => look.roof !== "flat" },
        { field: "wing", title: "Wing", hint: "A second section. A front wing sticks out in the middle with the same kind of roof (a gable roof gets a cross gable, a flat one a notch) and has the door. A left or right wing is a second section beside the main part, which has the door.", options: buildingWings },
        { field: "rooftop", title: "On the roof", hint: "Air conditioners and vents, a big air-handling unit, cardboard boxes, skylights, solar panels or a roof garden, on the flat part of a roof: the flat, hip flat and mansard roofs. The other roofs have no flat part.", options: buildingRooftops },
        { field: "pitch", title: "Pitch", hint: "A steep roof is one tile taller, with more of the slopes showing, and a narrower flat top on the roofs that have one.", options: roofPitches },
        { field: "depth", title: "Length", hint: "How long the building is from front to back. You look down on it, so a longer building is a roof that goes further up.", options: buildingDepths }
    ], colours: [{ field: "roofColor", title: "Roof colour", natural: true }] },
    { id: "walls", label: "Walls", sections: [
        { field: "wall", title: "Material", hint: "Timber is plaster between wooden beams.", options: buildingWalls },
        { field: "storeys", title: "Storeys", hint: "Of the building, or of its main part when it has a wing: the part with the door.", options: buildingStoreys },
        { field: "wingStoreys", title: "Wing storeys", hint: "How many storeys the wing has. A wing lower than the main part makes a step in the roofline; a taller one rises above it.", options: buildingStoreys, when: (look) => look.wing !== "none" },
        { field: "width", title: "Width", hint: "In tiles.", options: buildingWidths }
    ], colours: [{ field: "wallColor", title: "Wall colour", natural: true }] },
    { id: "door", label: "Door", sections: [
        { field: "door", title: "Position", options: doorPositions },
        { field: "doorStyle", title: "Style", options: doorStyles },
        { field: "porch", title: "Doorstep", hint: "Steps or a wooden deck across the front.", options: porches }
    ], colours: [{ field: "doorColor", title: "Door colour" }] },
    { id: "windows", label: "Windows", sections: [
        { field: "windows", title: "How many", hint: "On each storey, spaced evenly along the wall. The most that fit depends on the width and the style; asking for more gives the most. The ground floor has the same number, spaced either side of the door.", options: [], count: (look) => maxWindows(look.width, look.windowStyle, look.door) },
        { field: "windowStyle", title: "Style", hint: "Shutters are painted the door colour.", options: windowStyles }
    ], colours: [{ field: "trimColor", title: "Trim colour" }] },
    { id: "extras", label: "Extras", sections: [
        { field: "chimney", title: "Chimney", options: chimneys },
        { field: "props", title: "Front", hint: "Barrels beside the door, or flower boxes under the ground floor windows.", options: buildingProps }
    ] }
];

const STORAGE_KEY = "pixel-kit-studio:building";

const words = (id: string | number) => String(id).replace(/([A-Z])/g, " $1").replace(/_/g, " ").toLowerCase();

function loadLook(): BuildingConfig {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        // resolveBuildingConfig drops anything that is not in the fixed lists.
        if (saved) return resolveBuildingConfig(JSON.parse(saved));
    } catch {
        // No storage (private window, blocked): start from the default.
    }
    return {};
}

function OptionGrid({ section, look, choose }: { section: Section; look: ResolvedBuildingConfig; choose: (field: Field, value: string | number) => void }) {
    const arts: Raster[] = section.options.map((id) => buildBuilding({ ...look, [section.field]: id }));
    // One scale for the whole row, so a short building does not look bigger than a tall one, and small enough that the tallest fits its card.
    const biggest = arts.reduce((m, a) => ({ w: Math.max(m.w, a.width), h: Math.max(m.h, a.height) }), { w: 1, h: 1 });
    const scale = Math.min(1, 120 / biggest.h, 136 / biggest.w);
    return (
        <div className="opt-grid opt-grid-tall">
            {section.options.map((id, i) => (
                <button key={id} className="opt" aria-pressed={look[section.field] === id} onClick={() => choose(section.field, id)}>
                    <span className="opt-art" aria-hidden><PixelImage raster={arts[i]} pixelSize={scale} /></span>
                    <span>{words(id)}</span>
                </button>
            ))}
        </div>
    );
}

function CountInput({ section, look, choose }: { section: Section; look: ResolvedBuildingConfig; choose: (field: Field, value: string | number) => void }) {
    const most = section.count!(look);
    const value = look[section.field] as number;
    const set = (n: number) => choose(section.field, Number.isFinite(n) ? Math.max(0, Math.min(most, Math.round(n))) : 0);
    return (
        <div className="count-input">
            <button className="btn" aria-label={`Fewer ${section.title.toLowerCase()}`} disabled={value <= 0} onClick={() => set(value - 1)}>−</button>
            <input type="number" min={0} max={most} value={Math.min(value, most)} aria-label={section.title} onChange={(e) => set(e.target.valueAsNumber)} />
            <button className="btn" aria-label={`More ${section.title.toLowerCase()}`} disabled={value >= most} onClick={() => set(value + 1)}>+</button>
            <span className="muted">of up to {most}</span>
        </div>
    );
}

export function ColourPicker({ title, value, natural, naturalId = "natural", onPick }: { title: string; value: MaterialColor | "canvas"; natural?: boolean; naturalId?: "natural" | "canvas"; onPick: (value: MaterialColor | "canvas") => void }) {
    const custom = value === naturalId || (buildingColors as readonly string[]).includes(value) ? undefined : value;
    return (
        <div className="opt-section">
            <div className="h opt-title">{title}</div>
            <div className="swatches">
                {natural && (
                    <div className="swatch-item">
                        <button className="swatch" aria-pressed={value === naturalId} aria-label={naturalId} title="The colour of the material"
                            style={{ background: "repeating-linear-gradient(45deg, #c9b99a 0 4px, #8f8269 4px 8px)" }} onClick={() => onPick(naturalId)} />
                        <span className="swatch-name">{naturalId}</span>
                    </div>
                )}
                {buildingColors.map((name: ColorName) => (
                    <div key={name} className="swatch-item">
                        <button className="swatch" aria-pressed={value === name} aria-label={name} title={name} style={{ background: colorRamps[name].base }} onClick={() => onPick(name)} />
                        <span className="swatch-name">{name}</span>
                    </div>
                ))}
                <div className="swatch-item">
                    <label className="swatch swatch-custom" aria-pressed={!!custom} title="Pick any colour"
                        style={{ background: custom ?? "conic-gradient(#e24d4d, #e8c557, #5e9a55, #3e9c9a, #4a6fa5, #8a63b0, #e24d4d)" }}>
                        <input type="color" aria-label={`Custom ${title.toLowerCase()}`} value={custom ?? "#a8794e"}
                            onChange={(e) => { const hex = parseHex(e.target.value); if (hex) onPick(hex); }} />
                    </label>
                    <span className="swatch-name">custom</span>
                </div>
            </div>
        </div>
    );
}

function HouseBuilder({ route }: { route: Route }) {
    const [cfg, setCfg] = useState<BuildingConfig>(loadLook);
    const [tabId, setTabId] = useState(TABS[0].id);
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

    const tab = TABS.find((t) => t.id === tabId) ?? TABS[0];
    const look = resolveBuildingConfig(cfg);
    const theme = themeOf(route);
    const variant = variantOf(route);
    const full = buildMap(buildingMap(look, 1), theme);
    const mapped = toMapVariant(full, variant);
    const shown = recolor(mapped, custom);
    // Whole screen pixels per art pixel, as big as fits the stage and a sensible height.
    const px = Math.max(1, Math.floor(Math.min(Math.max(stageWidth - 16, 1) / shown.width, 440 / shown.height)));

    const choose = (field: Field, value: string | number) => setCfg((prev) => ({ ...prev, [field]: value }));
    const setColour = (field: ColourField, value: MaterialColor | "canvas") => setCfg((prev) => ({ ...prev, [field]: value as MaterialColor }));

    const changed = (Object.keys(defaultBuildingConfig) as (keyof BuildingConfig)[])
        .filter((k) => look[k] !== defaultBuildingConfig[k])
        .map((k) => `${k}${typeof look[k] === "number" ? `={${look[k]}}` : `="${look[k]}"`}`);
    const view = [variant.size && `size={${variant.size}}`, variant.bits && `bits={${variant.bits}}`, variant.palette && `palette="${variant.palette}"`, `pixelSize={${Math.max(1, Math.floor(px / Math.max(1, 16 / (variant.size ?? 16))))}}`].filter(Boolean) as string[];
    const props = [...changed, ...view];
    const config = `{ ${changed.map((c) => c.replace("={", ": ").replace("=\"", ": \"").replace(/}$/, "")).join(", ")} }`;
    const hasCustom = Object.keys(custom).length > 0;

    return (
        <div className="stack">
            <p className="muted" style={{ maxWidth: 720 }}>
                Build a house: pick a tab, tap what you like. It is drawn from the front and well above, the way houses look in most pixel-art games, so you see the slopes of the roof. Your building is saved in this browser.
            </p>
            <VariantBar route={route} themes native={{ width: 16, height: 16 }} sizeLabel="Pixels per tile" />

            <div className="creator">
                <div className="stage-col">
                    <div className="tools" style={{ marginBottom: 0 }}>
                        <Chips label="War damage" value={look.damage === "none" ? undefined : look.damage} options={["half", "ruin"] as const} nativeLabel="None"
                            onPick={(d) => choose("damage", d ?? "none")} />
                    </div>
                    <section className="panel stage-card" aria-label="Your building">
                        <div ref={stage} className="stage checker" style={{ minHeight: 320, padding: 8 } as CSSProperties}>
                            <PixelImage raster={shown} pixelSize={px} title="Your building" />
                        </div>
                    </section>
                    <div className="stage-actions">
                        <button className="btn primary" onClick={() => { setCfg(randomBuilding()); setCustom({}); }}>Random</button>
                        <button className="btn" onClick={() => { setCfg({}); setCustom({}); }}>Reset</button>
                        <SaveMenu onPng={() => downloadPng("building", shown, 4)} onSvg={() => downloadSvg("building", shown, 4)} />
                    </div>
                </div>

                <section className="panel dressing" aria-label="Customise">
                    <div className="ctabs" role="tablist" aria-label="What to change" style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}>
                        {TABS.map((t) => (
                            <button key={t.id} role="tab" className="ctab" aria-selected={t.id === tab.id} onClick={() => setTabId(t.id)}>
                                <span>{t.label}</span>
                            </button>
                        ))}
                    </div>
                    {tab.sections.filter((section) => !section.when || section.when(look)).map((section) => (
                        <div key={section.field} className="opt-section">
                            <div className="h opt-title">{section.title}</div>
                            {section.hint && <p className="muted opt-note">{section.hint}</p>}
                            {section.count ? <CountInput section={section} look={look} choose={choose} /> : <OptionGrid section={section} look={look} choose={choose} />}
                        </div>
                    ))}
                    {tab.colours?.map((colour) => (
                        <ColourPicker key={colour.field} title={colour.title} value={look[colour.field]} natural={colour.natural} onPick={(v) => setColour(colour.field, v)} />
                    ))}
                </section>
            </div>

            <div className="panel">
                <CustomColours raster={mapped} map={custom} onChange={setCustom} />
            </div>
            <div className="panel stack">
                <span className="h">Code</span>
                <CodeBlock code={`import { Building } from "@ragtechdev/pixel-sprites/react";\n\n<Building${props.map((p) => `\n  ${p}`).join("")}\n/>`} />
                <p className="muted">To put it in your own map, give <code>defineMap</code> the building and its top-left tile. Its walls and roof are solid, and the tile at the foot of the door is open and has <code>door</code> set:</p>
                <CodeBlock code={`import { defineMap, townTileset } from "@ragtechdev/pixel-sprites";\n\nconst map = defineMap(townTileset, Array(8).fill("gggggggg"), [], [\n  { config: ${config}, x: 2, y: 1 } // x and y are in tiles\n]);`} />
                {hasCustom && <p className="muted">You edited single colours. They are in the preview and in Save PNG, but not in this code: the library only uses its fixed colours.</p>}
            </div>
        </div>
    );
}

const KINDS = ["house", "tent"] as const;

/** The Buildings page: a house (the customizer above) or a tent (`Tents.tsx`), for a camp or a shelter. */
export function BuildingsPage({ route }: { route: Route }) {
    const [kind, setKind] = useState<(typeof KINDS)[number]>(() => {
        try { return localStorage.getItem("pixel-kit-studio:building-kind") === "tent" ? "tent" : "house"; } catch { return "house"; }
    });
    const pick = (k: (typeof KINDS)[number]) => {
        setKind(k);
        try { localStorage.setItem("pixel-kit-studio:building-kind", k); } catch { /* Not remembered. */ }
    };
    return (
        <div className="stack">
            <div>
                <h1 className="h" style={{ fontSize: 18 }}>Buildings</h1>
                <div className="row" role="group" aria-label="What to build" style={{ marginTop: 8 }}>
                    {KINDS.map((k) => <button key={k} className="chip" aria-pressed={kind === k} onClick={() => pick(k)}>{k}</button>)}
                </div>
            </div>
            {kind === "house" ? <HouseBuilder route={route} /> : <TentBuilder route={route} />}
        </div>
    );
}
