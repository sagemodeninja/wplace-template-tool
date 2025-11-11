const getDataURL = (file: File | Blob) => {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;

        reader.readAsDataURL(file);
    });
}

export const file = { getDataURL };
