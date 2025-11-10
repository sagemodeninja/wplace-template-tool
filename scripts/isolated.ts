import { CommandMessage, InterceptedBlobMessage, InterceptedJsonMessage, Template, ToolMessage } from "./structs";
import { attachIsolated, getValue, setValue } from "./utils/storage";
import { messages } from "./utils/messages";

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
let template: Template | undefined;
let colors = new Set<string>();

(async () => {
    const value = await getValue("focus-enabled");
    isFocusing = value === "true";
})();

// Fetch templates...
const updateTemplate = async () => {
    const active = await getValue("active-template");

    if (!active) return;

    const templates = await getValue("templates");
    const tmp8 = templates ? JSON.parse(templates) as Template[] : [];

    template = tmp8.find(t => t.id === active);

    // Update color cache...
    colors.clear();
    for (const color of template.colors) {
        if (color.enabled) colors.add(color.key);
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
            const x = parseInt(coords.get("x")?.toString()!);
            const y = parseInt(coords.get("y")?.toString()!);

            const origin = { tileX, tileY, x, y };
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

    const tileSize = 1000;

    // Get tile coordinates...
    const [tileX, tileY] = paths.slice(-2).map(Number);
    const gTileX = tileX * tileSize;
    const gTileY = tileY * tileSize;
    const gTileRight = gTileX + tileSize;
    const gTileBottom = gTileY + tileSize;

    // Configure...
    const origin = template.origin;
    const gTempX = origin.x + (origin.tileX * tileSize);
    const gTempY = origin.y + (origin.tileY * tileSize);
    const gTempRight = gTempX + template.bounds.width;
    const gTempBottom = gTempY + template.bounds.height;

    const match =
        (gTempX >= gTileX && gTempX <= gTileRight && gTempY >= gTileY && gTempY <= gTileBottom) ||
        (gTempRight >= gTileX && gTempRight <= gTileRight && gTempY >= gTileY && gTempY <= gTileBottom) ||
        (gTempRight >= gTileX && gTempRight <= gTileRight && gTempBottom >= gTileY && gTempBottom <= gTileBottom) ||
        (gTempX >= gTileX && gTempX <= gTileRight && gTempBottom >= gTileY && gTempBottom <= gTileBottom);

    if (!match) {
        return messages.sendToInline<InterceptedBlobMessage>("intercepted-blob", {
            endpoint,
            processed: true,
            blobId,
            blob,
        });
    }

    const bitmap = await createImageBitmap(blob!);
    const { width, height } = bitmap;
    const { width: bwidth, height: bheight } = template.bounds;
    const drawSize = width * 3;

    const canvas = new OffscreenCanvas(drawSize, drawSize);
    const context = canvas.getContext("2d");

    if (!context) return;

    context.imageSmoothingEnabled = false; // Nearest neighbor
    context.beginPath();
    context.rect(0, 0, drawSize, drawSize);
    context.clip();


    const realCanvas = new OffscreenCanvas(tileSize, tileSize);
    const realContext = realCanvas.getContext("2d", { willReadFrequently: true });

    if (!realContext) return;

    realContext.imageSmoothingEnabled = false; // Nearest neighbor

    context.drawImage(bitmap, 0, 0, drawSize, drawSize);
    realContext.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const imageData = realContext.getImageData(0, 0, width, height);
    const realPixels = imageData!.data!;

    const tempCanvas = new OffscreenCanvas(bwidth, bheight);
    const tempContext = tempCanvas.getContext("2d", { willFrequentlyRead: true });

    if (!tempContext) return;

    tempContext.imageSmoothingEnabled = false; // Nearest neighbor

    const img = await new Promise<HTMLImageElement>(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = template!.data;
    });

    tempContext.drawImage(img, 0, 0);

    const tempPixels = tempContext!.getImageData(0, 0, bwidth, bheight).data;

    const offsetX = gTempX >= gTileX ? origin.x : gTempX - gTileX;
    const offsetY = gTempY >= gTileY ? origin.y : gTempY - gTileY;

    // Render centered guides...
    for (var y = 0; y < bheight; y++) {
        for (var x = 0; x < bwidth; x++) {
            const ti = (y * bwidth + x) * 4;
            const tr = tempPixels[ti];
            const tg = tempPixels[ti + 1];
            const tb = tempPixels[ti + 2];
            const tkey = `${tr}_${tg}_${tb}`;

            const ri = (((y + offsetY) * tileSize) + (x + offsetX)) * 4;
            const rr = realPixels[ri];
            const rg = realPixels[ri + 1];
            const rb = realPixels[ri + 2];
            const rkey = `${rr}_${rg}_${rb}`;

            const gx = (x + offsetX) * 3;
            const gy = (y + offsetY) * 3;

            // Color is filtered off.
            if (colors.has(tkey)) {
                if (isFocusing && rkey === tkey) {
                    context.clearRect(gx, gy, 3, 3);

                    context.fillStyle = `rgba(${rr},${rg},${rb},0.05)`;
                    context.fillRect(gx, gy, 3, 3);
                } else {
                    context.fillStyle = `rgba(${tr},${tg},${tb},1)`;
                    context.fillRect(gx + 1, gy + 1, 1, 1);
                }
            }
        }
    }

    // context.strokeStyle = "black";
    // context.strokeRect(offsetX * 3, offsetY * 3, bwidth * 3, bheight * 3);

    const b = await canvas.convertToBlob({ type: "image/png" });

    messages.sendToInline<InterceptedBlobMessage>("intercepted-blob", {
        endpoint,
        processed: true,
        blobId,
        blob: b,
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
