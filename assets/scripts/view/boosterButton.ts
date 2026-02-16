const { ccclass, property } = cc._decorator;

@ccclass
export default class BoosterButton extends cc.Component {
    @property
    pressedScale: number = 0.92; // "вдавливание"

    @property
    activeGlowOpacity: number = 140; // подсветка (alpha)

    @property(cc.Node)
    glowNode: cc.Node = null; // нода подсветки (sprite/overlay), optional

    private isActive: boolean = false;
    private baseScale: number = 1;

    onLoad() {
        this.baseScale = this.node.scale;

        // стартовое состояние
        if (this.glowNode) this.glowNode.opacity = 0;

        this.node.on(cc.Node.EventType.TOUCH_END, this.onClick, this);
    }

    onDestroy() {
        this.node.off(cc.Node.EventType.TOUCH_END, this.onClick, this);
    }

    public getActive(): boolean {
        return this.isActive;
    }

    public setActive(v: boolean): void {
        if (this.isActive === v) return;
        this.isActive = v;
        this.applyVisual(v);
    }

    public toggle(): void {
        this.setActive(!this.isActive);
    }

    private onClick(): void {
        // наружу отдаём событие, чтобы менеджер мог снять активность с других
        this.node.emit("booster-toggle", this);
    }

    private applyVisual(active: boolean): void {
        this.node.stopAllActions();
        if (this.glowNode) this.glowNode.stopAllActions();

        const targetScale = active ? this.baseScale * this.pressedScale : this.baseScale;

        cc.tween(this.node)
            .to(0.08, { scale: targetScale })
            .start();

        if (this.glowNode) {
            cc.tween(this.glowNode)
                .to(0.08, { opacity: active ? this.activeGlowOpacity : 0 })
                .start();
        }
    }
}