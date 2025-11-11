import { TemplateBounds } from "@/structs/bounds";

export interface TemplateColor {
    id: number,
    key: string,
    count: number,
    painted: number,
    mistake: number,
    enabled: boolean,
}

export interface Template {
    id: string,
    filename: string,
    tiles: Record<string, string>, // <coord, data>
    colors: TemplateColor[],
    bounds: TemplateBounds,
}
