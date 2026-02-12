const { ccclass } = cc._decorator;

@ccclass
export default class CoverBackground extends cc.Component {
    private _sprite: cc.Sprite = null;

    onLoad() {
        this._sprite = this.getComponent(cc.Sprite);
        this.applyCover();
        cc.view.on("canvas-resize", this.applyCover, this);
    }

    onDestroy() {
        cc.view.off("canvas-resize", this.applyCover, this);
    }

    private applyCover() {
        if (!this._sprite || !this._sprite.spriteFrame) return;

        const win = cc.winSize;

        const img = this._sprite.spriteFrame.getOriginalSize();

        const scale = Math.max(win.width / img.width, win.height / img.height);

        this.node.setPosition(0, 0);
        this.node.setContentSize(img.width, img.height);
        this.node.scaleX = scale;
        this.node.scaleY = scale;
    }
}
