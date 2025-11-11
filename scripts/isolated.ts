import { CommandMessage, InterceptedBlobMessage, InterceptedJsonMessage, Origin, Template, TemplateColor, TemplateTile } from "./structs";
import { attachIsolated, getValue, setValue } from "@/utils/storage";
import { image, messages } from "@/utils";

const TILE_SIZE = 1000;
const SIZE_MULT = 3; // Scales each pixel into a 3x3 pixel grid.

attachIsolated(window);

const inject = () => {
    // Spy
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("inline.js");
    document.documentElement.appendChild(script);
    script.remove();

    // Styles
    const style = document.createElement("link");
    style.href = chrome.runtime.getURL("styles.css");
    style.rel = "stylesheet";
    document.documentElement.appendChild(style);
};

inject();

let isHoming = false;
let isFocusing = false;
let templates: Template[];
let template: Template | undefined;
let colorStatuses = new Set<string>();
let indexedColors = new Map<string, TemplateColor>();
let tiles = new Map<string, TemplateTile>();

(async () => {
    const value = await getValue("focus-enabled");
    isFocusing = value === "true";
})();

// Fetch templates...
const updateTemplate = async () => {
    const active = await getValue("active-template");

    if (!active) return;

    const value = await getValue("templates");

    templates = value ? JSON.parse(value) as Template[] : [];
    template = templates.find(t => t.id === active);

    // Cache tiles...
    tiles = new Map(Object.entries(template.tiles));

    // Update color cache...
    colorStatuses.clear();
    indexedColors.clear();

    for (const color of template.colors) {
        // Indexing
        indexedColors.set(color.key, {
            ...color,
            painted: 0, // Reset stats...
            mistake: 0
        });

        // Status
        if (color.enabled)
            colorStatuses.add(color.key);
    }
}

updateTemplate();

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
            setValue("origin", JSON.stringify(origin));

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
    const origin = template.bounds;
    const tileKey = `${tileX}_${tileY}`;

    if (tiles.has(tileKey)) {
        const bitmap = await createImageBitmap(blob);
        const { width, height } = template.bounds;
        const drawSize = TILE_SIZE * SIZE_MULT;

        const canvas = new OffscreenCanvas(drawSize, drawSize);
        const context = canvas.getContext("2d");

        context.imageSmoothingEnabled = false; // Nearest neighbor

        context.beginPath();
        context.rect(0, 0, drawSize, drawSize);
        context.clip();

        // The real/original image.
        const realCanvas = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
        const realContext = realCanvas.getContext("2d", { willReadFrequently: true });

        if (!realContext) return;

        realContext.imageSmoothingEnabled = false; // Nearest neighbor

        context.drawImage(bitmap, 0, 0, drawSize, drawSize);
        realContext.drawImage(bitmap, 0, 0, TILE_SIZE, TILE_SIZE);
        bitmap.close();

        // TODO: Can be optimized!
        const imageData = realContext.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
        const realPixels = imageData!.data!;

        // The template image.
        const tempCanvas = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
        const tempContext = tempCanvas.getContext("2d", { willFrequentlyRead: true });

        if (!tempContext) return;

        tempContext.imageSmoothingEnabled = false; // Nearest neighbor

        const tile = tiles.get(tileKey);
        const img = await image.create(tile.data);

        tempContext.drawImage(img, 0, 0);

        const tempPixels = tempContext!.getImageData(0, 0, TILE_SIZE, TILE_SIZE).data;

        // Convert current tile's indices to global coords.
        const gctx = tileX * TILE_SIZE;
        const gcty = tileY * TILE_SIZE;

        // Convert origin's tile indices to global coords.
        const gotx = origin.tileX * TILE_SIZE;
        const goty = origin.tileY * TILE_SIZE;

        // Convert origin to global coordinates.
        const gox = origin.offsetX + gotx;
        const goy = origin.offsetY + goty;

        // Offset start relative to tile.
        const startX = Math.max(0, gox - gctx);
        const startY = Math.max(0, goy - gcty);

        // Offset end relative to tile.
        const endX = Math.min(TILE_SIZE, gox + width - gctx);
        const endY = Math.min(TILE_SIZE, goy + height - gcty);

        // Render template...
        for (var y = startY; y < endY; y++) {
            for (var x = startX; x < endX; x++) {
                const i = (y * TILE_SIZE + x) * 4;
                const tr = tempPixels[i];
                const tg = tempPixels[i + 1];
                const tb = tempPixels[i + 2];
                const tkey = `${tr}_${tg}_${tb}`;

                const rr = realPixels[i];
                const rg = realPixels[i + 1];
                const rb = realPixels[i + 2];
                const ra = realPixels[i + 3];
                const rkey = `${rr}_${rg}_${rb}`;

                const gx = x * SIZE_MULT;
                const gy = y * SIZE_MULT;

                const pixelsMatch = rkey === tkey;

                // Color is filtered off.
                if (colorStatuses.has(tkey)) {
                    if (isFocusing && pixelsMatch) {
                        context.clearRect(gx, gy, 3, 3);

                        context.fillStyle = `rgba(${rr},${rg},${rb},0.05)`;
                        context.fillRect(gx, gy, 3, 3);
                    } else {
                        context.fillStyle = `rgba(${tr},${tg},${tb},1)`;
                        context.fillRect(gx + 1, gy + 1, 1, 1);
                    }
                }

                // Stats...
                // const color = indexedColors.get(tkey);
                // const painted = ra !== 0;

                // if (painted && pixelsMatch)
                //     color.painted += 1;

                // if (painted && !pixelsMatch)
                //     color.mistake += 1;
            }
        }

        // Save stats...
        template.colors = [...indexedColors.values()];
        await setValue("templates", JSON.stringify(templates));

        const b = await canvas.convertToBlob({ type: "image/png" });

        return messages.sendToInline<InterceptedBlobMessage>("intercepted-blob", {
            endpoint,
            processed: true,
            blobId,
            blob: b,
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
