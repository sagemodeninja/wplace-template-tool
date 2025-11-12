import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import styles from "./switch.scss";

@customElement("switch-button")
export class SwitchButton extends LitElement {
    static styles = styles;

    @property({ type: Boolean, reflect: true })
    public checked: boolean;

    public render() {
        return html`
            <div id="control" @click=${this.toggle}></div>
            <span id="label">
                <slot></slot>
            </span>
        `;
    }

    private toggle(event: Event) {
        event.stopPropagation();
        this.checked = !this.checked;
        this.dispatchEvent(new Event("change"));
    }
}
