const { ccclass, property } = cc._decorator;

@ccclass
export default class FixedPixelSizeButton extends cc.Component {
    @property
    paddingX: number = 60;

    @property
    paddingY: number = 60;

    private baseScaleX = 1;
    private baseScaleY = 1;
    private baseW = 0;
    private baseH = 0;

    onLoad() {
        this.baseScaleX = this.node.scaleX;
        this.baseScaleY = this.node.scaleY;

        const s = this.node.getContentSize();
        this.baseW = s.width;
        this.baseH = s.height;

        this.apply();
        cc.view.on("canvas-resize", this.apply, this);
    }

    onDestroy() {
        cc.view.off("canvas-resize", this.apply, this);
    }

    private apply() {
        const design = cc.view.getDesignResolutionSize();
        const frame = cc.view.getFrameSize();

        // NO_BORDER scale, which applies to the entire scene
        const viewScale = Math.max(frame.width / design.width, frame.height / design.height);

        // compensation so that the final size of the button on the screen remains constant
        const inv = 1 / viewScale;

        // “constant” size of the button on the screen in pixels (after compensation)
        const constWpx = this.baseW * this.baseScaleX;
        const constHpx = this.baseH * this.baseScaleY;

        // if it doesn’t fit, reduce it further
        const availW = Math.max(1, frame.width - this.paddingX * 2);
        const availH = Math.max(1, frame.height - this.paddingY * 2);

        const fitK = Math.min(1, availW / constWpx, availH / constHpx);

        this.node.scaleX = this.baseScaleX * inv * fitK;
        this.node.scaleY = this.baseScaleY * inv * fitK;
    }
}
