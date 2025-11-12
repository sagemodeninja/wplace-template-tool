import { html, LitElement, nothing } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { classMap } from "lit/directives/class-map.js";
import { computePosition, offset, flip, shift } from "@floating-ui/dom";
import { CommandMessage, Template, TemplateColor, Origin } from "@/structs";
import { store } from "@/utils/storage";
import { colors, numbers, messages, createTemplate } from "@/utils";
import { SwitchButton } from "./switch";

@customElement("tool-panel")
export class ToolPanel extends LitElement {
    private _origin: Origin;
    private _template: Template;

    private _allColorsEnabled: boolean;

    @state()
    private _homing = false;

    @state()
    private _visible = false;

    @query("#menu")
    private _panel?: HTMLDivElement;

    @query("#toggle")
    private _button?: HTMLButtonElement;

    public render() {
        return html`
            <button id="toggle" class="btn btn-square shadow-md relative" title="Toggle Tool" @click=${this.toggleMenu}>
                <svg class="size-5" viewBox="0 0 20.3223 20.8301">
                    <path d="M18.8574 13.2812C19.6484 13.75 19.9609 14.1016 19.9609 14.6387C19.9609 15.1758 19.6484 15.5273 18.8574 15.9863L11.2207 20.4297C10.752 20.7031 10.3711 20.8301 9.98047 20.8301C9.58008 20.8301 9.20898 20.7031 8.74023 20.4297L1.09375 15.9863C0.302734 15.5273 0 15.1758 0 14.6387C0 14.1016 0.302734 13.75 1.09375 13.2812L5.65806 10.6348L8.74023 12.4219C9.20898 12.6953 9.58008 12.8223 9.98047 12.8223C10.3711 12.8223 10.752 12.6953 11.2207 12.4219L14.2989 10.6348Z" fill="currentcolor"/>
                    <path d="M9.98047 12.8223C10.3711 12.8223 10.752 12.6953 11.2207 12.4219L18.8574 7.98828C19.6484 7.51953 19.9609 7.16797 19.9609 6.63086C19.9609 6.09375 19.6484 5.74219 18.8574 5.2832L11.2207 0.839844C10.752 0.566406 10.3711 0.439453 9.98047 0.439453C9.58008 0.439453 9.20898 0.566406 8.74023 0.839844L1.09375 5.2832C0.302734 5.74219 0 6.09375 0 6.63086C0 7.16797 0.302734 7.51953 1.09375 7.98828L8.74023 12.4219C9.20898 12.6953 9.58008 12.8223 9.98047 12.8223ZM9.98047 11.1133C9.84375 11.1133 9.70703 11.0742 9.54102 10.9766L2.10938 6.72852C2.07031 6.70898 2.04102 6.67969 2.04102 6.63086C2.04102 6.58203 2.07031 6.5625 2.10938 6.5332L9.54102 2.28516C9.70703 2.19727 9.84375 2.14844 9.98047 2.14844C10.1172 2.14844 10.2539 2.19727 10.4102 2.28516L17.8418 6.5332C17.8906 6.5625 17.9199 6.58203 17.9199 6.63086C17.9199 6.67969 17.8906 6.70898 17.8418 6.72852L10.4102 10.9766C10.2539 11.0742 10.1172 11.1133 9.98047 11.1133Z" fill="currentcolor"/>
                </svg>
            </button>
            <div
                id="menu"
                class="dropdown-content menu bg-base-100 border-base-300 z-1 relative w-[min(100vw-24px,400px)] border p-4 shadow-md flex flex-col gap-2"
                @toggle=${this.positionMenu}
                ?visible=${this._visible}
                popover="manual"
            >
                <div id="header">
                    <h3 class="text-lg font-semibold flex gap-2">
                        <svg class="size-6" viewBox="0 0 20.3223 20.8301">
                            <path d="M18.8574 13.2812C19.6484 13.75 19.9609 14.1016 19.9609 14.6387C19.9609 15.1758 19.6484 15.5273 18.8574 15.9863L11.2207 20.4297C10.752 20.7031 10.3711 20.8301 9.98047 20.8301C9.58008 20.8301 9.20898 20.7031 8.74023 20.4297L1.09375 15.9863C0.302734 15.5273 0 15.1758 0 14.6387C0 14.1016 0.302734 13.75 1.09375 13.2812L5.65806 10.6348L8.74023 12.4219C9.20898 12.6953 9.58008 12.8223 9.98047 12.8223C10.3711 12.8223 10.752 12.6953 11.2207 12.4219L14.2989 10.6348Z" fill="currentcolor"/>
                            <path d="M9.98047 12.8223C10.3711 12.8223 10.752 12.6953 11.2207 12.4219L18.8574 7.98828C19.6484 7.51953 19.9609 7.16797 19.9609 6.63086C19.9609 6.09375 19.6484 5.74219 18.8574 5.2832L11.2207 0.839844C10.752 0.566406 10.3711 0.439453 9.98047 0.439453C9.58008 0.439453 9.20898 0.566406 8.74023 0.839844L1.09375 5.2832C0.302734 5.74219 0 6.09375 0 6.63086C0 7.16797 0.302734 7.51953 1.09375 7.98828L8.74023 12.4219C9.20898 12.6953 9.58008 12.8223 9.98047 12.8223ZM9.98047 11.1133C9.84375 11.1133 9.70703 11.0742 9.54102 10.9766L2.10938 6.72852C2.07031 6.70898 2.04102 6.67969 2.04102 6.63086C2.04102 6.58203 2.07031 6.5625 2.10938 6.5332L9.54102 2.28516C9.70703 2.19727 9.84375 2.14844 9.98047 2.14844C10.1172 2.14844 10.2539 2.19727 10.4102 2.28516L17.8418 6.5332C17.8906 6.5625 17.9199 6.58203 17.9199 6.63086C17.9199 6.67969 17.8906 6.70898 17.8418 6.72852L10.4102 10.9766C10.2539 11.0742 10.1172 11.1133 9.98047 11.1133Z" fill="currentcolor"/>
                        </svg>
                        Wplace Template Tool
                    </h3>
                </div>
                <div class="flex gap-2 w-full">
                    <input id="upload-template" type="file" accept="image/*" @change=${this.uploadTemplate} />
                    <button class="btn btn-square ${classMap({ "btn-primary": this._homing })}" @click=${this.toggleHoming}>
                        <svg class="size-5" viewBox="0 0 24.1113 23.7598">
                          <path d="M11.1816 19.4766L11.1816 21.0586C6.65516 20.7287 3.03665 17.1111 2.69279 12.5879L4.27475 12.5879C4.61479 16.2404 7.52581 19.1504 11.1816 19.4766ZM12.5781 21.0581L12.5781 19.4762C16.2378 19.1461 19.1452 16.2377 19.485 12.5879L21.0669 12.5879C20.7225 17.1079 17.1008 20.7236 12.5781 21.0581ZM21.0694 11.1914L19.4875 11.1914C19.1708 7.51939 16.2539 4.59459 12.5781 4.26392L12.5781 2.68204C17.117 3.01702 20.7484 6.64928 21.0694 11.1914ZM11.1816 4.26351C7.50973 4.59027 4.5892 7.51667 4.27229 11.1914L2.69032 11.1914C3.01083 6.64607 6.63901 3.01189 11.1816 2.68155Z" fill="currentcolor"/>
                          <path d="M11.875 8.02734C12.2754 8.02734 12.5781 7.71484 12.5781 7.32422L12.5781 0.712891C12.5781 0.322266 12.2754 0.00976562 11.875 0.00976562C11.4844 0.00976562 11.1816 0.322266 11.1816 0.712891L11.1816 7.32422C11.1816 7.71484 11.4844 8.02734 11.875 8.02734ZM0.703125 12.5879L7.31445 12.5879C7.70508 12.5879 8.01758 12.2754 8.01758 11.8848C8.01758 11.4941 7.70508 11.1914 7.31445 11.1914L0.703125 11.1914C0.3125 11.1914 0 11.4941 0 11.8848C0 12.2754 0.3125 12.5879 0.703125 12.5879ZM11.875 23.7598C12.2754 23.7598 12.5781 23.4473 12.5781 23.0566L12.5781 16.4453C12.5781 16.0547 12.2754 15.752 11.875 15.752C11.4844 15.752 11.1816 16.0547 11.1816 16.4453L11.1816 23.0566C11.1816 23.4473 11.4844 23.7598 11.875 23.7598ZM16.4355 12.5879L23.0469 12.5879C23.4375 12.5879 23.75 12.2754 23.75 11.8848C23.75 11.4941 23.4375 11.1914 23.0469 11.1914L16.4355 11.1914C16.0449 11.1914 15.7324 11.4941 15.7324 11.8848C15.7324 12.2754 16.0449 12.5879 16.4355 12.5879Z" fill="currentcolor"/>
                          <path d="M11.875 13.5449C12.793 13.5449 13.5352 12.8027 13.5352 11.8848C13.5352 10.9668 12.793 10.2246 11.875 10.2246C10.957 10.2246 10.2148 10.9668 10.2148 11.8848C10.2148 12.8027 10.957 13.5449 11.875 13.5449Z" fill="currentcolor"/>
                        </svg>
                    </button>
                    <label for="upload-template" class="btn grow" ?disabled=${!this._origin}>
                        <svg class="size-7" viewBox="0 0 33.6914 24.3457">
                        <path d="M28.1738 6.21094L28.1738 11.8111C27.9219 11.7742 27.6638 11.7578 27.4023 11.7578C27.1306 11.7578 26.8628 11.7754 26.6016 11.8153L26.6016 6.29883C26.6016 5.2832 26.0547 4.75586 25.0879 4.75586L8.23242 4.75586C7.25586 4.75586 6.71875 5.2832 6.71875 6.29883L6.71875 17.0807L9.62891 14.4531C10.0293 14.082 10.4492 13.9062 10.8887 13.9062C11.3477 13.9062 11.7969 14.0918 12.207 14.4629L14.0137 16.0938L18.4277 12.1484C18.877 11.748 19.3555 11.5625 19.8926 11.5625C20.4199 11.5625 20.9375 11.7676 21.3672 12.168L22.9319 13.6379C21.8033 14.7772 21.1035 16.3412 21.1035 18.0566C21.1035 19.1849 21.4051 20.2465 21.9363 21.1621L8.21289 21.1621C6.17188 21.1621 5.14648 20.1562 5.14648 18.1445L5.14648 6.21094C5.14648 4.19922 6.17188 3.18359 8.21289 3.18359L25.1074 3.18359C27.1582 3.18359 28.1738 4.19922 28.1738 6.21094Z" fill="currentcolor"/>
                        <path d="M14.7168 9.96094C14.7168 11.2305 13.6816 12.2656 12.4219 12.2656C11.1523 12.2656 10.1172 11.2305 10.1172 9.96094C10.1172 8.70117 11.1523 7.65625 12.4219 7.65625C13.6816 7.65625 14.7168 8.70117 14.7168 9.96094Z" fill="currentcolor"/>
                        <path d="M32.3633 18.0566C32.3633 20.7617 30.0879 23.0176 27.4023 23.0176C24.6777 23.0176 22.4414 20.7812 22.4414 18.0566C22.4414 15.332 24.6777 13.0957 27.4023 13.0957C30.1172 13.0957 32.3633 15.332 32.3633 18.0566ZM26.7676 15.5273L26.7676 18.125L26.8164 19.3652L26.1719 18.7109L25.5957 18.1152C25.4785 17.998 25.3125 17.9102 25.1367 17.9199C24.8047 17.9199 24.5312 18.1641 24.5508 18.4961C24.5605 18.6816 24.6191 18.8184 24.7656 18.9551L26.9434 20.957C27.1094 21.123 27.2461 21.1816 27.4121 21.1816C27.5781 21.1816 27.7051 21.1035 27.8711 20.957L30.0586 18.9551C30.2051 18.8184 30.2637 18.6816 30.2637 18.4961C30.2637 18.1641 30.0098 17.9004 29.6777 17.9199C29.5117 17.9297 29.3457 17.998 29.2285 18.1152L28.6426 18.7109L28.0078 19.3652L28.0566 18.125L28.0566 15.5273C28.0566 15.1855 27.7637 14.9023 27.4121 14.9023C27.0605 14.9023 26.7676 15.1855 26.7676 15.5273Z" fill="currentcolor"/>
                        </svg>
                        Upload Template
                    </label>
                </div>
                <div id="temp-colors" class="flex flex-col gap-3">
                    <div class="tc-row tc-header text-base-content/80 ${classMap({ enabled: this._allColorsEnabled })}">
                        <div class="tc-col">
                            <button class="tc-toggle btn btn-circle btn-ghost text-base-content/80 size-6" @click=${this.toggleAllColor.bind(this)}>
                                ${this._allColorsEnabled ? html`
                                    <svg class="size-4" viewBox="0 0 24 24" fill="none">
                                        <path d="M3 14C3 9.02944 7.02944 5 12 5C16.9706 5 21 9.02944 21 14M17 14C17 16.7614 14.7614 19 12 19C9.23858 19 7 16.7614 7 14C7 11.2386 9.23858 9 12 9C14.7614 9 17 11.2386 17 14Z" stroke="currentcolor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                ` : html`
                                    <svg class="size-4" viewBox="0 0 24 24" fill="none">
                                        <path d="M9.60997 9.60714C8.05503 10.4549 7 12.1043 7 14C7 16.7614 9.23858 19 12 19C13.8966 19 15.5466 17.944 16.3941 16.3878M21 14C21 9.02944 16.9706 5 12 5C11.5582 5 11.1238 5.03184 10.699 5.09334M3 14C3 11.0069 4.46104 8.35513 6.70883 6.71886M3 3L21 21" stroke="currentcolor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>`}
                            </button>
                        </div>
                        <div class="tc-col">
                            <span>Colors</span>
                        </div>
                        <div class="tc-col px-cnt">
                            <span>Pixel Count</span>
                        </div>
                    </div>
                    ${repeat(this._template?.colors.filter(c => c.count !== c.painted) ?? [], c => c.id, this.renderTemplateColor.bind(this))}
                    <h3>Completed</h3>
                    ${repeat(this._template?.colors.filter(c => c.count === c.painted) ?? [], c => c.id, this.renderTemplateColor.bind(this))}
                </div>
                <div>
                    <switch-button id="toggle-background" @change=${this.toggleBackground}>
                        Enable background
                    </switch-button>
                </div>
            </div>
        `;
    }

    protected createRenderRoot() {
        return this; // Do not use shadowRoot.
    }

    protected firstUpdated() {
        this.init();
        this.addEventListeners();
    }

    private async init() {
        this._origin = await store.get("origin");
        this._template = await store.get("template");
        this._allColorsEnabled = this._template ? !this._template.colors.some(c => !c.enabled) : false;
    }

    private addEventListeners() {
        document.addEventListener("pointerdown", (e: Event) => {
            const target = e.target as Element;

            if (target.closest("tool-panel"))
                return e.stopPropagation();

            if (!this._homing)
                this._panel?.hidePopover();
        });

        // Listen for commands
        messages.listenToInline("command", async message => {
            const { command, data } = message as CommandMessage;

            switch (command) {
                case "set-origin":
                    this._origin = data;
                    this._homing = false;
                    break;
                case "update-stats":
                    // FIXME: Diff. name?
                    await this.init();
                    this.requestUpdate();
                    break;
            }
        });
    }

    private toggleMenu(e: Event) {
        e.stopPropagation();

        if (!this._visible)
            this._panel?.showPopover();
        else
            this._panel?.hidePopover();
    }

    private toggleHoming() {
        this._homing = !this._homing;

        // Let the isolated script know...
        messages.sendToIsolated<CommandMessage>("command", {
            command: "toggle-homing",
            data: this._homing
        });
    }

    private async toggleAllColor() {
        this._allColorsEnabled = !this._allColorsEnabled;
        for (const color of this._template.colors) {
            color.enabled = this._allColorsEnabled;
        }
        this.save();
    }

    private async toggleColor(color: TemplateColor, event: Event) {
        event.stopPropagation();
        color.enabled = !color.enabled;
        this.save();
    }

    private toggleBackground(event: Event) {
        const target = event.target as SwitchButton;
        console.log("Toggle background: ", target.checked);
    }

    private async positionMenu(e: ToggleEvent) {
        this._visible = e.newState === "open";

        if (!this._visible) return;

        const menu = e.target as HTMLDivElement;

        if (!this._button) return;

        const { x, y } = await computePosition(this._button, menu, {
            placement: "right",
            strategy: "fixed",
            middleware: [offset(6), flip(), shift()]
        });

        Object.assign(menu.style, {
            left: x + "px",
            top: y + "px"
        });
    }

    private async uploadTemplate(e: Event) {
        const { files } = e.target as HTMLInputElement;

        if (!files || files.length === 0) return;

        // Update active template.
        this._template = await createTemplate(files[0], this._origin);
        this.save();
    }

    private async save() {
        await store.set("template", this._template);
        messages.sendToIsolated("command", { command: "update-template" });
        this.requestUpdate("_template");
    }

    private renderTemplateColor(color: TemplateColor) {
        const swatch = colors[color.id];

        const classes = classMap({
            enabled: color.enabled
        });

        return html`
            <div class="tc-row ${classes} temp-color">
                <div class="tc-col">
                    <button class="tc-toggle btn btn-circle btn-ghost text-base-content/80 size-6" @click=${this.toggleColor.bind(this, color)}>
                        ${color.enabled ? html`
                            <svg class="size-4" viewBox="0 0 24 24" fill="none">
                                <path d="M3 14C3 9.02944 7.02944 5 12 5C16.9706 5 21 9.02944 21 14M17 14C17 16.7614 14.7614 19 12 19C9.23858 19 7 16.7614 7 14C7 11.2386 9.23858 9 12 9C14.7614 9 17 11.2386 17 14Z" stroke="currentcolor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        ` : html`
                            <svg class="size-4" viewBox="0 0 24 24" fill="none">
                                <path d="M9.60997 9.60714C8.05503 10.4549 7 12.1043 7 14C7 16.7614 9.23858 19 12 19C13.8966 19 15.5466 17.944 16.3941 16.3878M21 14C21 9.02944 16.9706 5 12 5C11.5582 5 11.1238 5.03184 10.699 5.09334M3 14C3 11.0069 4.46104 8.35513 6.70883 6.71886M3 3L21 21" stroke="currentcolor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>`}
                    </button>
                </div>
                <div class="tc-col">
                    <div class="color-sm rounded-lg p-0 border-base-content/20 aspect-square relative" style="background-color: rgb(${swatch.rgb.join()})">
                        ${swatch.premium ? html`
                            <span class="bg-base-100 translate-1/2 absolute bottom-0 right-0 flex size-4.5 items-center justify-center rounded-full max-sm:hidden">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" class="text-base-content/80 size-3">
                                    <path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80ZM240-160v-400 400Z">
                                    </path>
                                </svg>
                            </span>
                        ` : nothing}
                    </div>
                    <span class="grow">${swatch.name}</span>
                </div>
                <div class="tc-col px-cnt">
                    <span>
                        ${numbers.toDecimal(color.count - color.painted)}
                        ${color.mistake ? html`• <span style="color: red;">${numbers.toDecimal(color.mistake)}</span>` : nothing}
                    </span>
                </div>
            </div>
        `;
    }
}
