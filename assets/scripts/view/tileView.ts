const { ccclass, property } = cc._decorator;
import { TileType } from "../model/boardModel";

@ccclass
export default class TileView extends cc.Component {

    @property(cc.Sprite)
    sprite: cc.Sprite = null;

    public setType(type: TileType) {
        // позже подключим atlas
        // сейчас просто заглушка
    }
}