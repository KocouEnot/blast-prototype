const { ccclass, property } = cc._decorator;

import BoosterButton from "./boosterButton";

@ccclass
export default class BoostersPanel extends cc.Component {
    private active: BoosterButton = null;

    onLoad() {
        // слушаем всплывающее событие от детей
        this.node.on("booster-toggle", this.onBoosterToggle, this);
    }

    onDestroy() {
        this.node.off("booster-toggle", this.onBoosterToggle, this);
    }

    private onBoosterToggle(btn: BoosterButton): void {
        // если нажали активный — выключаем
        if (this.active === btn) {
            btn.setActive(false);
            this.active = null;
            return;
        }

        // выключаем прошлый
        if (this.active) this.active.setActive(false);

        // включаем новый
        btn.setActive(true);
        this.active = btn;
    }

    public clearSelection(): void {
        if (!this.active) return;
        this.active.setActive(false);
        this.active = null;
    }

    public getActive(): BoosterButton | null {
        return this.active;
    }
}