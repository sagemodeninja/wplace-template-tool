import "../styles/index.scss";

import { CommandMessage, InterceptedBlobMessage, InterceptedJsonMessage, Origin, Template, TemplateColor } from "./structs";
import { messages, store } from "@/utils";
import { overlay } from "@/utils/template";

store.init(); // Allow storage API to work on both worlds (isolated/inline).

const inject = () => {
    // Spy
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("inline.js");
    document.documentElement.appendChild(script);
    script.remove();

    // Styles
    const style = document.createElement("link");
    style.href = chrome.runtime.getURL("static/styles/index.css");
    style.rel = "stylesheet";
    document.documentElement.appendChild(style);
};

inject();

interface PixelStats {
    painted: number;
    mistake: number;
}

interface StatefulTemplateTile {
    tileX: number,
    tileY: number,
    data: string,
    pixels: Map<string, PixelStats>, // <color, stats>
}

let isHoming = false;
let isFocusing = false;
let template: Template;
let colors = new Set<string>();
let indexedColors = new Map<string, TemplateColor>();
let tiles = new Map<string, StatefulTemplateTile>();

(async () => {
    isFocusing = await store.get("focus-enabled");
})();

// Fetch templates...
const updateTemplate = async () => {
    template = await store.get("template");

    if (!template) return;

    // Cache tiles...
    // FIXME: Complicated and perhaps inefficient!
    tiles = new Map(Object.entries(template.tiles).map(([k, t]) => {
        const [tileX, tileY] = k.split("_").map(Number);
        return [k, { tileX, tileY, data: t, pixels: new Map() }];
    }));

    // Update color cache...
    colors.clear();
    indexedColors.clear();

    for (const color of template.colors) {
        // Indexing for stats
        color.painted = 0; // Reset...
        color.mistake = 0;
        indexedColors.set(color.key, color);

        // Status
        if (color.enabled)
            colors.add(color.key);
    }
}

updateTemplate();

let statsDebounce: number;
const updateColorStats = async () => {
    window.clearTimeout(statsDebounce);
    statsDebounce = window.setTimeout(async () => {
        statsDebounce = undefined;

        // This is not efficient!
        const colors = new Map<string, TemplateColor>();
        for (const color of template.colors) {
            // Reset all stats...
            color.painted = 0;
            color.mistake = 0;

            colors.set(color.key, color);
        }

        tiles.forEach(tile => {
            for (const [key, stats] of tile.pixels) {
                const color = colors.get(key);
                color.painted += stats.painted;
                color.mistake += stats.mistake;
            }
        });

        // Save stats...
        await store.set("template", template);

        // Notify panel...
        messages.sendToInline<CommandMessage>("command", {
            command: "update-stats"
        });
    }, 200);
}

const handleCommands = (message: CommandMessage) => {
    switch (message.command) {
        case "toggle-homing":
            isHoming = message.data;
            break;
        case "toggle-focus":
            isFocusing = message.data;
            break;
        case "update-template":
            updateTemplate();
            break;
    }
};

const handleInterceptedJson = async (message: InterceptedJsonMessage) => {
    const { endpoint } = message;

    const [path, queries] = endpoint.split("?");
    const paths = path.split("/");

    const resouce = paths
        .filter(s => s && isNaN(Number(s))) // Ignore coordinates.
        .filter(s => s && !s.includes("."))  // ?
        .pop();

    switch (resouce) {
        case "pixel":
            // Do not process when not homing!
            if (!isHoming) return;

            const [tileX, tileY] = paths.slice(-2).map(Number);
            const coords = new URLSearchParams(queries);
            const offsetX = parseInt(coords.get("x")?.toString()!);
            const offsetY = parseInt(coords.get("y")?.toString()!);

            const origin = { tileX, tileY, offsetX, offsetY } as Origin;
            store.set("origin", origin);

            return messages.sendToInline<CommandMessage>("command", {
                command: "set-origin",
                data: origin
            });
    }
};

const handleInterceptedBlob = async (message: InterceptedBlobMessage) => {
    const { endpoint, blobId, blob, processed } = message;

    if (processed)
        return;

    // Remove ".png" from tail and split by paths...
    const paths = endpoint.replace(".png", "").split("/");

    const resource = paths
        .filter(s => s && isNaN(Number(s))) // Ignore coordinates.
        .pop();

    if (!template || !endpoint || resource !== "tiles") {
        return messages.sendToInline<InterceptedBlobMessage>("intercepted-blob", {
            endpoint,
            processed: true,
            blobId,
            blob,
        });
    }

    // Get tile coordinates...
    const [tileX, tileY] = paths.slice(-2).map(Number);

    // Configure...
    const tileKey = `${tileX}_${tileY}`;
    const tile = tiles.get(tileKey);

    if (tile) {
        const overlayed = await overlay(template, blob, tile, colors, isFocusing);

        updateColorStats();

        console.log("Processed tile ", tileKey);

        return messages.sendToInline<InterceptedBlobMessage>("intercepted-blob", {
            endpoint,
            processed: true,
            blobId,
            blob: overlayed,
        });
    }

    return messages.sendToInline<InterceptedBlobMessage>("intercepted-blob", {
        endpoint,
        processed: true,
        blobId,
        blob,
    });
};

// Processing...
messages.listenToIsolated("*", async message => {
    switch (message.type) {
        case "intercepted-json":
            return handleInterceptedJson(message as InterceptedJsonMessage);
        case "intercepted-blob":
            handleInterceptedBlob(message as InterceptedBlobMessage);
            break;
        case "command":
            return handleCommands(message as CommandMessage);
    }
});

(() => {
    const sidebar = document.querySelector("#map + .right-2 > div");

    if (!sidebar) return;

    sidebar.appendChild(document.createElement("tool-panel"));
})();

document.addEventListener("click", (e) => {
    const toolbar = document.querySelector("#map ~ .bottom-0 > div > div > .flex > .flex");

    if (toolbar && !toolbar.querySelector("focus-toggle"))
        toolbar.appendChild(document.createElement("focus-toggle"));

    const swatches = document.querySelectorAll("#map ~ .bottom-0 > div > div > .mb-4 > div > div > button");

    for (const swatch of swatches) {
        if (swatch.innerHTML !== "<!---->") {
            const id = swatch.id.replace("color-", "");
            console.log(id);
        }
    }
});
