import { useEffect, type CSSProperties } from "react";
import { useHandheld, useHeight } from "./hooks";
import { href, useRoute } from "./router";
import { AvatarsPage } from "./pages/Avatars";
import { BrowsePage } from "./pages/Browse";
import { DocsPage } from "./pages/Docs";
import { docSections, docTitle } from "./pages/docTopics";
import { HomePage } from "./pages/Home";
import { PlayPage } from "./pages/Play";
import { WorldsPage } from "./pages/Worlds";

/** The library: browsable art. Docs is its own top-level section with its own subtopics. */
const library = [
    ["icons", "Icons"],
    ["tiles", "Tiles"],
    ["objects", "Objects"],
    ["avatars", "Avatars"],
    ["worlds", "Worlds"]
] as const;

const GITHUB = "https://github.com/ragTechDev/pixel-kit";

export default function App() {
    const route = useRoute();
    const [header, headerHeight] = useHeight<HTMLElement>();
    const section = route.path[0] ?? "";

    const inLibrary = library.some(([id]) => id === section);
    const inDocs = section === "docs";
    const inPlay = section === "play";
    // On a phone, Play is a handheld console that fills the screen, so the site header and footer step aside.
    const handheld = useHandheld();
    const handheldPlay = inPlay && handheld;
    // Each Docs topic is its own page; /docs on its own is the first one.
    const docId = route.path[1] ?? docSections[0][0];
    const title = inDocs
        ? docTitle(docSections.find(([id]) => id === docId)?.[0] ?? docSections[0][0])
        : inPlay
            ? "Play"
            : library.find(([id]) => id === section)?.[1];

    useEffect(() => {
        document.title = title ? `${title} · ragTech Pixel Kit` : "ragTech Pixel Kit";
    }, [title]);

    // Moving to another Docs page starts it at the top.
    useEffect(() => {
        if (inDocs) window.scrollTo(0, 0);
    }, [inDocs, docId]);

    const page = (() => {
        switch (section) {
            case "icons": return <BrowsePage route={route} kind="icons" />;
            case "tiles": return <BrowsePage route={route} kind="tiles" />;
            case "objects": return <BrowsePage route={route} kind="objects" />;
            case "avatars": return <AvatarsPage route={route} />;
            case "worlds": return <WorldsPage route={route} />;
            case "play": return <PlayPage route={route} />;
            case "docs": return <DocsPage topic={route.path[1]} />;
            default: return <HomePage route={route} />;
        }
    })();

    return (
        <div className={`app${inDocs ? " in-docs" : ""}${handheldPlay ? " play-handheld" : ""}`} style={{ "--main-h": `${headerHeight}px` } as CSSProperties}>
            <header ref={header} className={`top${inLibrary ? "" : " top-solo"}`}>
                <div className="top-main">
                    <a className="brand" href={href([], route)}>
                        <img className="brand-mark" src="./favicon.svg" width="24" height="24" alt="" style={{ imageRendering: "pixelated" }} />
                        ragTech Pixel Kit
                    </a>
                    <nav className="nav" aria-label="Sections">
                        <a href={href(["icons"], route)} aria-current={inLibrary ? "page" : undefined}>Library</a>
                        <a href={href(["play"], route)} aria-current={inPlay ? "page" : undefined}>Play</a>
                        <a href={href(["docs"], route)} aria-current={inDocs ? "page" : undefined}>Docs</a>
                    </nav>
                    <a className="top-note" href={GITHUB} aria-label="pixel-kit on GitHub">GitHub ↗</a>
                </div>
            </header>
            {inLibrary && (
                <nav className="subnav" aria-label="Library">
                    <span className="subnav-label">Library</span>
                    {library.map(([id, label]) => (
                        <a key={id} href={href([id], route)} aria-current={section === id ? "page" : undefined}>{label}</a>
                    ))}
                </nav>
            )}
            <main className="page">{page}</main>
            <footer className="foot">
                <span>ragTech Pixel Kit. Code MIT, art CC BY 4.0.</span>
                <a href={GITHUB}>GitHub</a>
            </footer>
        </div>
    );
}
