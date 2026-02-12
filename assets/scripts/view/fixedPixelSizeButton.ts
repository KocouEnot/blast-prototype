const { ccclass, property } = cc._decorator;

@ccclass
export default class FixedPixelSizeButton extends cc.Component {
    @property
    paddingX: number = 24;

    @property
    paddingY: number = 24;

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
        const design = cc.view.getDesignResolutionSize(); // то, что ты выставляешь в setDesignResolutionSize
        const frame = cc.view.getFrameSize();            // реальный размер окна (px)

        // NO_BORDER scale, который применяется ко всей сцене
        const viewScale = Math.max(frame.width / design.width, frame.height / design.height);

        // компенсация, чтобы итоговый размер кнопки на экране оставался постоянным
        const inv = 1 / viewScale;

        // “константный” размер кнопки на экране в пикселях (после компенсации)
        const constWpx = this.baseW * this.baseScaleX;
        const constHpx = this.baseH * this.baseScaleY;

        // если не влезает — уменьшаем дополнительно
        const availW = Math.max(1, frame.width - this.paddingX * 2);
        const availH = Math.max(1, frame.height - this.paddingY * 2);

        const fitK = Math.min(1, availW / constWpx, availH / constHpx);

        this.node.scaleX = this.baseScaleX * inv * fitK;
        this.node.scaleY = this.baseScaleY * inv * fitK;
    }
}
