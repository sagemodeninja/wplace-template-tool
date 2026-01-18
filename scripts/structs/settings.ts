import { Origin } from "@/structs/origin";

export interface IToolSettings {
    /**
     * The top-left origin of the artwork.
     */
    origin: Origin;
    /**
     * Hides pixels other than the current selected color.
     */
    enableFocus: boolean;

    /**
     * Add a background behind the artwork for better visibility.
     */
    enableBackground: boolean;

    /**
     * Either the background is light or dark.
     */
    backgroundMode: "light" | "dark";
}

export const defaultValues: IToolSettings = {
    origin: null,
    enableFocus: false,
    enableBackground: false,
    backgroundMode: "light",
};
