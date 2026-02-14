const { ccclass, property } = cc._decorator;

@ccclass
export default class FrameMovesScreenPinned extends cc.Component {
    @property topPercent: number = 0.02; // 2% - padding top
    @property sidePercent: number = 0.1; // 10% - padding left & 10% - padding right
    @property minScale: number = 0;

    private baseW = 0;
    private baseH = 0;

    onLoad() {
        const s = this.node.getContentSize();
        this.baseW = s.width;  // 872
        this.baseH = s.height; // 321

        this.apply();
        cc.view.on("canvas-resize", this.apply, this);
    }

    onDestroy() {
        cc.view.off("canvas-resize", this.apply, this);
    }

    private apply() {
        const design = cc.view.getDesignResolutionSize();
        const frame = cc.view.getFrameSize();

        const viewScale = Math.max(frame.width / design.width, frame.height / design.height);

        // how much width is actually available (in pixels)
        const availWpx = frame.width * (1 - this.sidePercent * 2);

        // convert to design units
        const availWDU = availWpx / viewScale;

        // reduction factor
        const fitK = Math.min(1, availWDU / this.baseW);

        // apply the same scale to X and Y
        this.node.scaleX = fitK;
        this.node.scaleY = fitK;

        // padding top 2% of screen height
        const topPx = frame.height / this.topPercent;
        const topDU = topPx / viewScale
        const y = design.height / 2 - topDU - (this.baseH * fitK) / 2;

        this.node.setPosition(0, y);
    }
}