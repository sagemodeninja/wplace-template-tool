// Responsible for managing templates.

import { Origin, TemplateBounds, Template, TemplateColor, IToolSettings } from "@/structs";
import { color } from "@/utils/colors";
import { image } from "@/utils/image";
import { file as files } from "@/utils/file";

const TILE_SIZE = 1000;
const SIZE_MULT = 3; // Scales each pixel into a 3x3 pixel grid.

interface PixelStats {
    painted: number;
    mistake: number;
}

interface StatefulTemplateTile {
    tileX: number;
    tileY: number;
    data: string;
    pixels: Map<string, PixelStats>; // <color, stats>
}

export const createTemplate = async (file: File, origin: Origin) => {
    const id = crypto.randomUUID();

    const data = await files.getDataURL(file);
    const img = await image.create(data);

    const tiles: Record<string, string> = {}; // <coord, dataURL>
    const { width, height } = img;

    // Determine right/bottom bounds.
    const right = origin.offsetX + width;
    const bottom = origin.offsetY + height;

    // Calculate number of tiles on x,y axis.
    const nx = Math.ceil(right / TILE_SIZE);
    const ny = Math.ceil(bottom / TILE_SIZE);

    // Prepare tiling canvas...
    const canvas = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
    const context = canvas.getContext("2d");

    context.imageSmoothingEnabled = false; // Preserve blockeness.

    // Create each tile...
    for (var y = 0; y < ny; y++) {
        for (var x = 0; x < nx; x++) {
            const tileX = x + origin.tileX;
            const tileY = y + origin.tileY;

            context.clearRect(0, 0, TILE_SIZE, TILE_SIZE);

            // Draw the portion of the image that belongs to the tile.
            const sx = x * TILE_SIZE - origin.offsetX;
            const sy = y * TILE_SIZE - origin.offsetY;
            context.drawImage(img, sx, sy, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);

            // Export and store as tile.
            const blob = await canvas.convertToBlob({ type: "image/png" });
            tiles[`${tileX}_${tileY}`] = await files.getDataURL(blob);
        }
    }

    const { data: pixels } = image.getData(img);
    const bounds = { ...origin, width, height } as TemplateBounds;

    const unsorted = new Map<string, number>();

    for (var i = 0; i < pixels.length; i += 4) {
        const key = `${pixels[i]}_${pixels[i + 1]}_${pixels[i + 2]}`;
        unsorted.set(key, (unsorted.get(key) ?? 0) + 1);
    }

    const colors = [...unsorted.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(
            ([key, count]) =>
                ({
                    id: color.indexOf(key),
                    key,
                    count,
                    painted: 0,
                    mistake: 0,
                    enabled: true,
                }) as TemplateColor
        );

    // Construct template...
    const template = {
        id,
        filename: file.name,
        bounds,
        colors,
        tiles,
    } as Template;

    return template;
};

/**
 * Overlay a template to a tile.
 */
export const overlay = async (
    settings: IToolSettings,
    template: Template,
    blob: Blob,
    tile: StatefulTemplateTile,
    colors: Set<string>,
    isFocusing: boolean
) => {
    const origin = template.bounds;

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

    // realContext.imageSmoothingEnabled = false; // Nearest neighbor

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

    const img = await image.create(tile.data);

    tempContext.drawImage(img, 0, 0);

    const tempPixels = tempContext!.getImageData(0, 0, TILE_SIZE, TILE_SIZE).data;

    // Convert current tile's indices to global coords.
    const gctx = tile.tileX * TILE_SIZE;
    const gcty = tile.tileY * TILE_SIZE;

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

    tile.pixels.clear(); // Clear pixel stats...

    context.clearRect(startX * SIZE_MULT, startY * SIZE_MULT, (endX - startX) * SIZE_MULT, (endY - startY) * SIZE_MULT);

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

            const painted = ra !== 0;
            const correct = painted && rkey === tkey;
            const active = colors.has(tkey);

            if (settings.enableBackground) {
                context.fillStyle = settings.backgroundMode === "light" ? "white" : "rgb(60, 60, 60)";
                context.fillRect(gx, gy, SIZE_MULT, SIZE_MULT);
            }

            if (painted && !isFocusing) {
                context.fillStyle = `rgb(${rr},${rg},${rb})`;
                context.fillRect(gx, gy, SIZE_MULT, SIZE_MULT);
            }

            // Fade color while focusing if active but already correctly painted.
            if (active && correct && isFocusing) {
                context.fillStyle = `rgba(${rr},${rg},${rb},0.5)`;
                context.fillRect(gx, gy, 3, 3);
            }

            if (active && painted && !correct && isFocusing) {
                context.fillStyle = `rgb(${rr},${rg},${rb})`;
                context.fillRect(gx, gy, SIZE_MULT, SIZE_MULT);
            }

            // Render centered guide pixels.
            if (active && !correct) {
                context.fillStyle = `rgba(${tr},${tg},${tb},1)`;
                context.fillRect(gx + 1, gy + 1, 1, 1);
            }

            // Stats...
            let stats = tile.pixels.get(tkey);

            if (!stats) {
                stats = { painted: 0, mistake: 0 };
                tile.pixels.set(tkey, stats);
            }

            if (correct) stats.painted += 1;

            if (painted && !correct) stats.mistake += 1;
        }
    }

    return await canvas.convertToBlob({ type: "image/png" });
};
