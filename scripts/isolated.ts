import { CommandMessage, InterceptedBlobMessage, InterceptedJsonMessage, Template, ToolMessage } from "./structs";
import { attachIsolated, getValue, setValue } from "./utils/storage";
import { messages } from "./utils/messages";

attachIsolated(window);

const inject = () => {
    // Spy
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("scripts/inline.js");
    document.documentElement.appendChild(script);
    script.remove();

    // Styles
    const style = document.createElement("link");
    style.href = chrome.runtime.getURL("static/styles/index.css");
    style.rel = "stylesheet";
    document.documentElement.appendChild(style);
};

inject();

let isHoming = false;
let template: Template | undefined;

// Fetch templates...
(async () => {
    const active = await getValue("active-template");

    if (!active) return;

    const templates = await getValue("templates");
    const tmp8 = templates ? JSON.parse(templates) as Template[] : [];

    template = tmp8.find(t => t.id === active);
})();

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
    const drawSize = width * 3;

    const canvas = new OffscreenCanvas(drawSize, drawSize);
    const context = canvas.getContext("2d");

    if (!context) return;

    context.imageSmoothingEnabled = false; // Nearest neighbor
    context.beginPath();
    context.rect(0, 0, drawSize, drawSize);
    context.clip();

    const tcanvas = new OffscreenCanvas(width, height);
    const tcontext = tcanvas.getContext("2d", { willReadFrequently: true });

    if (!tcontext) return;

    tcontext.drawImage(bitmap, 0, 0, width, height);

    bitmap.close();

    const imageData = tcontext.getImageData(0, 0, width, height);
    const pixels = imageData!.data!;

    context.drawImage(tcanvas, 0, 0, drawSize, drawSize);

    // for (var y = 1; y < height; y += 3) {
    //     for (var x = 1; x < width; x += 3) {
    //         (context!).fillStyle = `#000`;
    //         context?.fillRect(x, y, 1, 1);
    //     }
    // }

    // for (var y = 0; y < height; y++) {
    //     for (var x = 0; x < width; x++) {
    //         const i = (y * width + x) * 4;

    //         const r = pixels[i];
    //         const g = pixels[i + 1];
    //         const b = pixels[i + 2];
    //         const a = 0.2;

    //         const ox = x * 3;
    //         const oy = y * 3;

    //         context.clearRect(ox, oy, 3, 3);
    //         context.fillStyle = `rgba(${r},${g},${b},${a})`;
    //         context.fillRect(ox, oy, 3, 3);
    //     }
    // }

    const { width: bwidth, height: bheight } = template.bounds;
    const tempCanvas = new OffscreenCanvas(bwidth, bheight);
    const tempContext = tempCanvas.getContext("2d", { willFrequentlyRead: true });

    if (!tempContext) return;

    const img = await new Promise<HTMLImageElement>(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = template!.data;
    });

    tempContext.drawImage(img, 0, 0);

    const tempPixels = tempContext!.getImageData(0, 0, bwidth, bheight).data;

    const offsetX = gTempX >= gTileX ? origin.x : gTempX - gTileX;
    const offsetY = gTempY >= gTileY ? origin.y : gTempY - gTileY;

    for (var y = 0; y < bheight; y++) {
        for (var x = 0; x < bwidth; x++) {
            const i = (y * bwidth + x) * 4;
            const r = tempPixels[i];
            const g = tempPixels[i + 1];
            const b = tempPixels[i + 2];

            context.fillStyle = `rgba(${r},${g},${b},1)`;
            context.fillRect(((offsetX + x) * 3) + 1, ((offsetY + y) * 3) + 1, 1, 1);
        }
    }

    const b = await canvas.convertToBlob({ type: "image/png" });

    messages.sendToInline<InterceptedBlobMessage>("intercepted-blob", {
        endpoint,
        processed: true,
        blobId,
        blob: b,
    });
};

const handleCommands = (message: CommandMessage) => {
    switch (message.command) {
        case "toggle-homing":
            isHoming = message.data;
            break;
    }
};

// Processing...
messages.listenIsolated("*", async message => {
    switch (message.type) {
        case "intercepted-json":
            return handleInterceptedJson(message as InterceptedJsonMessage);
        case "intercepted-blob":
            return handleInterceptedBlob(message as InterceptedBlobMessage);
        case "command":
            return handleCommands(message as CommandMessage);
    }
});

(() => {
    const sidebar = document.querySelector("#map + .right-2 > div");

    if (!sidebar) return;

    sidebar.appendChild(document.createElement("tool-panel"));
})();
