import { defaultValues, IToolSettings } from "@/structs";
import { store } from "@/utils/storage";

const cache = { value: undefined as IToolSettings };

export const load = async () => {
    cache.value ??= (await store.get<IToolSettings>("settings")) ?? defaultValues;
    return cache.value;
};

export const update = async (delta: Partial<IToolSettings>) => {
    cache.value = { ...cache.value, ...delta };
    await store.set("settings", cache.value);
    return cache.value;
};

export const settings = { load, update };
