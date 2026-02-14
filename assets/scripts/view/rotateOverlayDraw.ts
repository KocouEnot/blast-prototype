const { ccclass, property } = cc._decorator;

@ccclass
export default class RotateOverlayDraw extends cc.Component {
    @property
    alpha: number = 140;

    private g: cc.Graphics = null;

    onLoad() {
        this.g = this.getComponent(cc.Graphics);
        this.redraw();
        cc.view.on("canvas-resize", this.redraw, this);
    }

    onDestroy() {
        cc.view.off("canvas-resize", this.redraw, this);
    }

    private redraw() {
        if (!this.g) return;

        // The widget will stretch the node so that its size = screen/canvas size
        const s = this.node.getContentSize();

        this.g.clear();
        this.g.fillColor = new cc.Color(0, 0, 0, this.alpha);
        this.g.rect(-s.width / 2, -s.height / 2, s.width, s.height);
        this.g.fill();
    }
}