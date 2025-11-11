import { ToolMessage } from "@/structs/message";

export interface StorageMessage extends ToolMessage {
    type: "utils/storage",
    sender: string,
    method: "GET" | "SET",
    key: string,
    value?: any,
}
