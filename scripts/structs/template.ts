import { TemplateBounds } from "@/structs/bounds";

export interface TemplateColor {
    id: number,
    key: string,
    count: number,
    painted: number,
    mistake: number,
    enabled: boolean
}

export interface TemplateTile {
    data: string,
}

export interface Template {
    id: string,
    filename: string,
    bounds: TemplateBounds,
    tiles: Record<string, TemplateTile>,
    colors: TemplateColor[],
}
