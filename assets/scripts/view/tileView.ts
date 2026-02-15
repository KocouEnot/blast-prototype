const { ccclass, property } = cc._decorator;
import { TileType } from "../model/boardModel";

@ccclass
export default class TileView extends cc.Component {
    @property(cc.Sprite)
    sprite: cc.Sprite = null;

    @property([cc.SpriteFrame])
    frames: cc.SpriteFrame[] = []; // 0..4

    public row: number = 0;
    public col: number = 0;

    public setGridPos(r: number, c: number): void {
        this.row = r;
        this.col = c;
    }

    public setType(type: TileType): void {
        const frame = this.frames[type];
        if (!frame) {
            cc.error(`[TileView] frame missing for type=${type}. Check frames[] in tile prefab.`);
            return;
        }
        this.sprite.spriteFrame = frame;
    }
}