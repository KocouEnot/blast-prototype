const { ccclass } = cc._decorator

@ccclass
export default class StartSceneController extends cc.Component {

    onLoad() {
        // recalculation when resizing
        cc.view.setResizeCallback(() => {
            cc.view.setDesignResolutionSize(1080, 1920, cc.ResolutionPolicy.NO_BORDER);
        });

        // sets virtual resolution
        cc.view.setDesignResolutionSize(1080, 1920, cc.ResolutionPolicy.NO_BORDER);
    }

}