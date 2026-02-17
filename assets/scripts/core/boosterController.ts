const { ccclass, property } = cc._decorator;

import BoosterButton from "../view/boosterButton";

@ccclass
export default class BoostersController extends cc.Component {
    @property([BoosterButton])
    boosters: BoosterButton[] = [];

    private active: BoosterButton | null = null;

    onLoad(): void {
        // подписываемся на клики каждой кнопки
        for (const b of this.boosters) {
            if (!b) continue;
            b.node.off("booster-click", this.onBoosterClick, this);
            b.node.on("booster-click", this.onBoosterClick, this);

            // на старте всё выключаем
            b.setActive(false);
        }
        this.active = null;
    }

    private onBoosterClick(btn: BoosterButton): void {
        // если кликнули по активному — выключаем
        if (this.active === btn) {
            btn.setActive(false);
            this.active = null;
            return;
        }

        // выключаем предыдущий
        if (this.active) {
            this.active.setActive(false);
        }

        // включаем новый
        btn.setActive(true);
        this.active = btn;
    }

    public getActive(): BoosterButton | null {
        return this.active;
    }

    public clear(): void {
        if (this.active) this.active.setActive(false);
        this.active = null;
    }
}