import { ScriptWorld, ToolMessage } from "../structs";

type MessagePayload<T> = Omit<T, "source" | "world" | "type">;

type ListenerCallback = (message: ToolMessage) => Promise<void>;

const send = <T extends ToolMessage>(world: ScriptWorld, type: string, options: MessagePayload<T>) => {
    const source = "wplace-template-tool";
    const message = { source, world, type, ...options };
    window.postMessage(message, "*");
};

const listen = (world: ScriptWorld, type: string, callback: ListenerCallback) => {
    window.addEventListener("message", async (event) => {
        const { source, world: eworld, type: etype } = event.data as ToolMessage;

        // Message didn't come from us.
        if (!source || source !== "wplace-template-tool")
            return;

        // Not the right world or type.
        if (world !== eworld || (type !== "*" && type !== etype))
            return;

        await callback(event.data);
    });
};

const sendToInline = <T extends ToolMessage>(type: string, payload: MessagePayload<T>) =>
    send<T>("inline", type, payload);

const sendToIsolated = <T extends ToolMessage>(type: T["type"], payload: MessagePayload<T>) =>
    send<T>("isolated", type, payload);

const listenToInline = (type: string, callback: ListenerCallback) =>
    listen("inline", type, callback);

const listenToIsolated = (type: string, callback: ListenerCallback) =>
    listen("isolated", type, callback);

export const messages = { sendToInline, sendToIsolated, listenInline: listenToInline, listenIsolated: listenToIsolated };
