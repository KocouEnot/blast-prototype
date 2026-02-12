const { ccclass } = cc._decorator

@ccclass
export default class StartSceneController extends cc.Component {
    public onStartClick(): void {
        cc.director.loadScene('gameScene')
    }
}