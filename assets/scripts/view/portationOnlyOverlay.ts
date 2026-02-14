const { ccclass, property } = cc._decorator;

@ccclass
export default class PortraitOnlyOverlay extends cc.Component {
    @property(cc.Node)
    rotateOverlay: cc.Node = null;

    onLoad() {
        this.apply();
        cc.view.on("canvas-resize", this.apply, this);
    }

    onDestroy() {
        cc.view.off("canvas-resize", this.apply, this);
    }

    private apply() {
        const frame = cc.view.getFrameSize();
        const isLandscape = frame.width > frame.height;

        if (this.rotateOverlay) this.rotateOverlay.active = isLandscape;

        if (isLandscape) cc.director.pause();
        else cc.director.resume();
    }
}