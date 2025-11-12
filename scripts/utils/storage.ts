import { StorageMessage } from "@/structs/storage";
import { messages } from "@/utils/messages";

declare const SCRIPT_WORLD: "ISOLATED" | "INLINE"; // Populated by @rollup/plugin-replace.
const queue = new Map<string, Function>();

// Private/Internal
const initIsolated = () => {
	messages.listenToIsolated("utils/storage", async (message: StorageMessage) => {
		const { sender, method, key, value } = message;

		const result = method === "GET" ? await getValue(key) : await setValue(key, value);

		messages.sendToInline<StorageMessage>("utils/storage", {
			sender,
			method,
			key,
			value: result,
		});
	});
};

const initInline = () => {
	messages.listenToInline("utils/storage", async (message: StorageMessage) => {
		const { sender, value } = message;
		const callback = queue.get(sender);

		if (!callback) return;

		callback(value);
		queue.delete(sender);
	});
};

const getValueFromInline = (key: string) => {
	const sender = crypto.randomUUID();
	const task = new Promise<any>(resolve => queue.set(sender, resolve));

	messages.sendToIsolated("utils/storage", {
		sender,
		method: "GET",
		key,
	});

	return task;
};

const setValueFromInline = (key: string, value: any) => {
	const sender = crypto.randomUUID();
	const task = new Promise<void>(resolve => queue.set(sender, resolve));

	messages.sendToIsolated("utils/storage", {
		sender,
		method: "SET",
		key,
		value,
	});

	return task;
};

const getValue = async (key: string) => {
	const result = await chrome.storage.local.get(key);

	// Does not exists.
	if (!result || !result[key]) return undefined;

	const [type, value] = result[key].split(/:(.*)/, 2);

	if (type === "boolean") return value === "true";

	if (type === "number") return Number(value);

	if (type === "object") return JSON.parse(value);

	return value;
};

const setValue = async (key: string, value: any) => {
	const type = typeof value;

	if (type === "object") value = JSON.stringify(value);

	// We append the type so we could later "infer"
	// how to decode the value.
	await chrome.storage.local.set({ [key]: `${type}:${value}` });
};

// Public
const init = () => {
	return SCRIPT_WORLD === "ISOLATED" ? initIsolated() : initInline();
};

const get = async <T>(key: string): Promise<T> => {
	return SCRIPT_WORLD === "ISOLATED" ? await getValue(key) : await getValueFromInline(key);
};

const set = async (key: string, value: any) => {
	return SCRIPT_WORLD === "ISOLATED" ? await setValue(key, value) : await setValueFromInline(key, value);
};

export const store = { init, get, set };
