import { Origin } from "./origin";
import { Rect } from "./rect";

export interface TemplateColor {
    id: number,
    count: number,
    enabled: boolean
}

export interface Template {
    id: string,
    filename: string,
    origin: Origin,
    bounds: Rect,
    data: string,
    colors: TemplateColor[]
}
