const MANAGED_KEY_PREFIX = "wplace-template-tool-";

const queue = new Map<string, Function>();

export const attachIsolated = (window: Window) => {
    window.addEventListener("message", async event => {
        const { source, world, type, data } = event.data;

        if (source !== "wplace-template-tool" || world !== "isolated" || type !== "utils/storage")
            return;

        const { key, value } = data;
        const result = data.op === "set"
            ? await setValue(key, value)
            : await getValue(key);

        window.postMessage({
            source: "wplace-template-tool",
            world: "main",
            type: "utils/storage",
            data: { id: data.id, result }
        }, "*");
    });
};

export const attachInline = (window: Window) => {
    window.addEventListener("message", event => {
        const { source, world, type, data } = event.data;

        if (source !== "wplace-template-tool" || world !== "main" || type !== "utils/storage")
            return;

        const callback = queue.get(data.id);

        if (!callback) return;

        callback(data.result);
        queue.delete(data.id);
    });
}

export const setValue = async (key: string, value: string) => {
    key = MANAGED_KEY_PREFIX + key;
    await chrome.storage.local.set({ [key]: value });
};

export const getValue = async (key: string) => {
    key = MANAGED_KEY_PREFIX + key;
    const result = await chrome.storage.local.get(key);
    return result[key] as string;
};

export const setValueFromInline = (key: string, value: string) => {
    const id = crypto.randomUUID();
    const task = new Promise(resolve => queue.set(id, resolve));

    window.postMessage({
        source: "wplace-template-tool",
        world: "isolated",
        type: "utils/storage",
        data: { id, op: "set", key, value }
    }, "*");

    return task;
};

export const getValueFromInline = (key: string) => {
    const id = crypto.randomUUID();
    const task = new Promise<string>(resolve => queue.set(id, resolve));

    window.postMessage({
        source: "wplace-template-tool",
        world: "isolated",
        type: "utils/storage",
        data: { id, op: "get", key }
    }, "*");

    return task;
};
