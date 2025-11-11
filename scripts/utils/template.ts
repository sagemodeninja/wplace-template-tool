// Responsible for managing templates.

import { Origin, TemplateBounds, Template, TemplateColor } from "@/structs";
import { color } from "@/utils/colors";
import { image } from "@/utils/image";
import { file as files } from "@/utils/file";

// TODO: Each tile should track its own stats.
// NOTE: Every repaint should reset stats.

const TILE_SIZE = 1000;

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
        .map(([key, count]) => ({
            id: color.indexOf(key),
            key,
            count,
            painted: 0,
            mistake: 0,
            enabled: true,
        }) as TemplateColor);

    // Construct template...
    const template = {
        id,
        filename: file.name,
        bounds,
        colors,
        tiles,
    } as Template;

    return template;
}
