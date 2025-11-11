import { html, LitElement, PropertyValues } from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { getValueFromInline, setValueFromInline } from "../utils/storage";
import { messages } from "../utils/messages";
import { CommandMessage } from "../structs";

@customElement("focus-toggle")
export class FocusToggle extends LitElement {
    private _shortcutListener: any;

    @state()
    private _focusEnabled: boolean;

    public render() {
        return html`
            <div class="tooltip ml-1">
                <div class="tooltip-content">Toggle Focus
                    <kbd class="kbd kbd-xs text-base-content touchscreen:hidden ml-0.5 rounded-md">F</kbd>
                </div>
                <button class="btn btn-circle btn-sm btn-ghost ${classMap({ enabled: this._focusEnabled })}" @click=${this.toggleFocus}>
                    <svg viewBox="0 0 19.9414 19.7349" fill="currentColor" class="size-3.5">
                        <path d="M10.2344 19.7161C14.4922 19.7161 17.9395 17.1477 19.4727 13.8762C19.8047 13.1926 19.3652 12.7336 18.7109 12.9387C17.9883 13.1829 16.7969 13.4172 15.6934 13.4172C9.83398 13.4172 6.47461 10.0579 6.47461 4.18873C6.47461 3.08521 6.71875 1.84498 7.07031 0.956304C7.35352 0.233648 6.85547-0.205805 6.16211 0.0969294C2.65625 1.62037 0 5.20435 0 9.48169C0 15.136 4.58984 19.7161 10.2344 19.7161Z"/>
                    </svg>
                </button>
            </div>
        `;
    }

    public connectedCallback() {
        super.connectedCallback();

        this.init(); // Set value for _focusEnabled.

        this._shortcutListener = this.handleShortcut.bind(this);
        document.addEventListener("keypress", this._shortcutListener);
    }

    public disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener("keypress", this._shortcutListener);
        this._shortcutListener = undefined;
    }

    protected createRenderRoot() {
        return this; // Do not use shadowRoot.
    }

    private async init() {
        const enabled = await getValueFromInline("focus-enabled");
        this._focusEnabled = enabled === "true";
    }

    private handleShortcut(e: KeyboardEvent) {
        if (e.code === "KeyF") {
            e.stopPropagation();
            this.toggleFocus();
        }
    }

    private async toggleFocus() {
        this._focusEnabled = !this._focusEnabled;
        await setValueFromInline("focus-enabled", this._focusEnabled.toString());
        messages.sendToIsolated<CommandMessage>("command", {
            command: "toggle-focus",
            data: this._focusEnabled
        });
    }
}
