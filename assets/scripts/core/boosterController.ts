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
        if (btn.getCount && btn.getCount() <= 0) return;

        // если кликнули по активному — выключаем
        if (this.active === btn) {
            btn.setActive(false);
            this.active = null;

            this.node.emit("booster-changed", null); // <-- ДОБАВЬ
            return;
        }

        // выключаем предыдущий
        if (this.active) this.active.setActive(false);

        // включаем новый
        btn.setActive(true);
        this.active = btn;

        this.node.emit("booster-changed", this.active); // <-- ДОБАВЬ
    }

    public getActive(): BoosterButton | null {
        return this.active;
    }

    public clear(): void {
        if (this.active) this.active.setActive(false);
        this.active = null;
        this.node.emit("booster-changed", null); // <-- ДОБАВЬ
    }

    public clearIfEmpty(btn: BoosterButton): void {
        if (!btn) return;
        if (btn.getCount && btn.getCount() <= 0) {
            if (this.active === btn) this.clear();
        }
    }
}