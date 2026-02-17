const { ccclass, property } = cc._decorator;

import BoosterButton from "../view/boosterButton";

@ccclass
export default class BoostersController extends cc.Component {
    @property([BoosterButton])
    boosters: BoosterButton[] = [];

    private active: BoosterButton | null = null;

    onLoad(): void {
        // subscribe to clicks of each button
        for (const b of this.boosters) {
            if (!b) continue;
            b.node.off("booster-click", this.onBoosterClick, this);
            b.node.on("booster-click", this.onBoosterClick, this);

            // Turn everything off at startup
            b.setActive(false);
        }
        this.active = null;
    }

    private onBoosterClick(btn: BoosterButton): void {
        if (btn.getCount && btn.getCount() <= 0) return;

        // If you click on the active one, turn it off.
        if (this.active === btn) {
            btn.setActive(false);
            this.active = null;

            this.node.emit("booster-changed", null);
            return;
        }

        // turn off the previous one
        if (this.active) this.active.setActive(false);

        // we turn on the new one
        btn.setActive(true);
        this.active = btn;

        this.node.emit("booster-changed", this.active);
    }

    public getActive(): BoosterButton | null {
        return this.active;
    }

    public clear(): void {
        if (this.active) this.active.setActive(false);
        this.active = null;
        this.node.emit("booster-changed", null);
    }

    public clearIfEmpty(btn: BoosterButton): void {
        if (!btn) return;
        if (btn.getCount && btn.getCount() <= 0) {
            if (this.active === btn) this.clear();
        }
    }
}