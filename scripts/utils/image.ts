export const getImageData = (img: HTMLImageElement) => {
    const canvas = new OffscreenCanvas(img.width, img.height);
    const context = canvas.getContext("2d", { willFrequentlyRead: true })!;

    context.drawImage(img, 0, 0);
    return context.getImageData(0, 0, img.width, img.height);
}

export const createImage = (src: string) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();

        img.onload = () => resolve(img);
        img.onerror = reject;

        img.src = src;
    });
}

export const image = {
    getData: getImageData,
    create: createImage
};
