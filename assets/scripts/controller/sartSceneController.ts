const { ccclass } = cc._decorator

@ccclass
export default class StartSceneController extends cc.Component {
    public onStartClick(): void {
        cc.director.loadScene('gameScene')
    }

    onLoad() {
        cc.view.setResizeCallback(() => {
            cc.view.setDesignResolutionSize(1280, 720, cc.ResolutionPolicy.NO_BORDER);
        });
        cc.view.setDesignResolutionSize(1280, 720, cc.ResolutionPolicy.NO_BORDER);
    }

}