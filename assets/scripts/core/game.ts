const { ccclass } = cc._decorator

@ccclass
export default class Game extends cc.Component {
    protected onLoad(): void {
        cc.log("[Game] onLoad")
    }

    protected start(): void {
        cc.log("[Game] start")
    }
}