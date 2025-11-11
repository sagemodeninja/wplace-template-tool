export type ScriptWorld = "isolated" | "inline";

export interface ToolMessage {
    source: "wplace-template-tool",
    world: ScriptWorld,
    type: "command" | "intercepted-json" | "intercepted-blob" | "utils/storage",
}

export interface CommandMessage extends ToolMessage {
    type: "command",
    command: string,
    data?: any,
}

export interface InterceptedJsonMessage extends ToolMessage {
    type: "intercepted-json",
    endpoint: string,
    data: any,
}

export interface InterceptedBlobMessage extends ToolMessage {
    type: "intercepted-blob",
    processed: boolean,
    endpoint: string,
    blobId: string,
    blob: Blob,
}
