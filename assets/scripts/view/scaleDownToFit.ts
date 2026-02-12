const { ccclass, property } = cc._decorator;

@ccclass
export default class ScaleDownToFit extends cc.Component {
    @property
    padding: number = 40; // отступы от краёв экрана

    onLoad() {
        this.apply();
        cc.view.on("canvas-resize", this.apply, this);
    }

    onDestroy() {
        cc.view.off("canvas-resize", this.apply, this);
    }

    private apply() {
        const win = cc.winSize;

        // реальный размер ноды (с учётом детей) до скейла
        const size = this.node.getContentSize();

        const maxW = Math.max(1, win.width - this.padding * 2);
        const maxH = Math.max(1, win.height - this.padding * 2);

        const scaleX = maxW / size.width;
        const scaleY = maxH / size.height;

        // только уменьшаем, никогда не увеличиваем
        const scale = Math.min(1, scaleX, scaleY);

        this.node.scaleX = scale;
        this.node.scaleY = scale;
    }
}
