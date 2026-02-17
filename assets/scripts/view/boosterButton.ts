const { ccclass, property } = cc._decorator;

@ccclass
export default class BoosterButton extends cc.Component {
    // glowLeft/glowCenter/glowRight (копии твоих left/center/right)
    @property([cc.Node])
    glowParts: cc.Node[] = [];

    @property(cc.Label)
    countLabel: cc.Label = null;

    // You can add a slight glow/transparency
    @property
    glowOpacityOn: number = 230;

    @property
    glowFadeDuration: number = 0.08;

    // pressing effect (indentation)
    @property
    pressedScale: number = 0.95;

    @property
    pressDuration: number = 0.06;

    @property
    boosterId: string = ''; // teleport or bomb

    @property
    startCount: number = 5;

    private _isActive: boolean = false;
    private _baseScaleX: number = 1;
    private _baseScaleY: number = 1;
    private count: number = 0;

    onLoad(): void {
        this._baseScaleX = this.node.scaleX;
        this._baseScaleY = this.node.scaleY;

        this.count = this.startCount;
        this.refreshCount();

        // starting state glow
        this.setGlow(false, true);

        // click on the button container
        this.node.off(cc.Node.EventType.TOUCH_END);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onClick, this);
    }

    public isActive(): boolean {
        return this._isActive;
    }

    public setActive(active: boolean): void {
        if (this._isActive === active) return;
        this._isActive = active;

        this.animatePress(active);
        this.setGlow(active, false);
    }

    public toggle(): void {
        this.setActive(!this._isActive);
    }

    private onClick(): void {
        if (this.count <= 0) return;
        this.node.emit("booster-click", this);
    }

    private animatePress(active: boolean): void {
        this.node.stopAllActions();

        const targetX = this._baseScaleX * (active ? this.pressedScale : 1);
        const targetY = this._baseScaleY * (active ? this.pressedScale : 1);

        cc.tween(this.node)
            .to(this.pressDuration, { scaleX: targetX, scaleY: targetY })
            .start();
    }

    private setGlow(active: boolean, immediate: boolean): void {
        if (!this.glowParts || this.glowParts.length === 0) return;

        const targetOpacity = active ? this.glowOpacityOn : 0;

        for (const n of this.glowParts) {
            if (!n || !cc.isValid(n)) continue;

            n.stopAllActions();

            // glow should be visible as a node (active=true), and intensity via opacity
            n.active = true;

            if (immediate || this.glowFadeDuration <= 0) {
                n.opacity = targetOpacity;
            } else {
                cc.tween(n)
                    .to(this.glowFadeDuration, { opacity: targetOpacity })
                    .start();
            }
        }
    }

    public getCount(): number {
        return this.count;
    }

    public consumeOne(): boolean {
        if (this.count <= 0) return false;
        this.count -= 1;
        this.refreshCount();
        return true;
    }

    private refreshCount(): void {
        if (this.countLabel) this.countLabel.string = String(this.count);

        // If you run out, you can visually "light up" it, but it's not necessary
        if (this.count <= 0) {
            this.setActive(false);
            this.node.opacity = 140; // optional
        } else {
            this.node.opacity = 255;
        }
    }
}