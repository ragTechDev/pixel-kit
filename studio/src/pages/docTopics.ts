/**
 * The Docs topics, in reading order, grouped for the menu. A topic is [id, menu label] or [id, menu label, page title]:
 * the label is short because it sits under its group's heading, and the page title spells out the context when the label
 * alone would be unclear on the page itself. This file holds no React so tests can read it.
 */
export const docGroups = [
    {
        title: "Sprites",
        topics: [
            ["start", "Getting started"],
            ["icons", "Icons"],
            ["avatars", "Avatars"],
            ["worlds", "Tiles, objects and worlds"],
            ["variants", "Sizes and colour depths"],
            ["together", "Using assets together"],
            ["colours", "Colours and palettes"],
            ["outside-react", "CSS, SVG and canvas"]
        ]
    },
    {
        title: "Engine",
        topics: [
            ["engine", "Quick start", "Engine: quick start"],
            ["engine-loop", "Loop, input, camera", "Engine: loop, input, camera"],
            ["engine-world", "Walking and doors", "Engine: walking and doors"]
        ]
    },
    {
        title: "Reference",
        topics: [["rules", "Design rules"]]
    }
] as const;

export type DocId = (typeof docGroups)[number]["topics"][number][0];
export type DocTopic = readonly [id: DocId, label: string, title?: string];

/** Every topic in reading order, which is also the order of the Previous and Next links. */
export const docTopics: readonly DocTopic[] = docGroups.flatMap((group) => group.topics as readonly DocTopic[]);

/** Kept for callers that only need the id and the menu label. */
export const docSections: readonly (readonly [DocId, string])[] = docTopics.map(([id, label]) => [id, label] as const);

/** The heading of a topic's page. */
export function docTitle(id: DocId): string {
    const topic = docTopics.find(([known]) => known === id);
    return topic?.[2] ?? topic?.[1] ?? "Docs";
}
