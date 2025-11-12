// Responsible for intercepting fetch requests from client.

import "@/components";

import { InterceptedBlobMessage } from "@/structs";
import { store, messages } from "@/utils";

store.init(); // Allow storage API to work on both worlds (isolated/inline).

(() => {
    const ofetch = window.fetch;
    const queue = new Map();

    messages.listenToInline("intercepted-blob", async (message: InterceptedBlobMessage) => {
        const { processed, blobId, blob } = message;

        if (!processed || !blobId || !blob) return;

        const resolve = queue.get(blobId);
        resolve(blob);
        queue.delete(blobId);
    });

    window.fetch = async function(...args) {
        const response = await ofetch.apply(this, args);

        const cloned = response.clone();
        const endpoint = args[0] instanceof Request ? args[0].url : args[0] as string;
        const contentType = cloned.headers.get("content-type") ?? "";

        if (contentType.includes("application/json")) {
            const data = await cloned.json();
            messages.sendToIsolated("intercepted-json", { endpoint, data });
        }

        if (contentType.includes("image/") && !endpoint.includes("openfreemap") && !endpoint.includes("maps")) {
            const blob = await cloned.blob();

            return new Promise(resolve => {
                const blobId = crypto.randomUUID();

                queue.set(blobId, (processed: Blob) => {
                    resolve(new Response(processed, {
                        headers: cloned.headers,
                        status: cloned.status,
                        statusText: cloned.statusText
                    }));
                });

                messages.sendToIsolated("intercepted-blob", { endpoint, blobId, blob });
            });
        }

        return response;
    }
})();
