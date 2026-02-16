const { ccclass, property } = cc._decorator;

import { TileType } from "../model/boardModel";
import TileView from "./tileView";
import BoardLogic, { CellPos, ShuffleMapping, GravityMove, GravitySpawn } from "../core/boardLogic";

@ccclass
export default class BoardView extends cc.Component {
    @property(cc.Prefab)
    tilePrefab: cc.Prefab = null;

    @property(cc.Node)
    cellsContainer: cc.Node = null;

    @property(cc.Node)
    maskNode: cc.Node = null;

    @property(cc.Label)
    movesLabel: cc.Label = null;

    @property(cc.Node)
    gameOverOverlay: cc.Node = null;

    @property(cc.Node)
    gameOverDim: cc.Node = null;

    @property(cc.Label)
    gameOverLabel: cc.Label = null;

    @property(cc.Label)
    scoreLabel: cc.Label = null;

    // how much higher than the top row new ones start (in pixels)
    @property
    spawnAboveTop: number = 112;

    @property
    cols: number = 9;

    @property
    rows: number = 10;

    @property
    rowGap: number = 3;

    @property
    colGap: number = 0;

    @property
    overlapY: number = 0;

    // animation
    @property
    shakeDuration: number = 0.12;

    @property
    shakeOffset: number = 10; // px

    @property
    removeDuration: number = 0.12;

    @property
    fallDuration: number = 0.18;

    @property
    startMoves: number = 40;

    @property
    gameOverFade: number = 0.25;

    @property
    targetScore: number = 300;

    @property
    shuffleDuration: number = 0.25;

    private logic: BoardLogic = null;

    private nodes: (cc.Node | null)[][] = [];
    private isBusy: boolean = false;

    // geometry
    private cellSize: number = 0;
    private stepX: number = 0;
    private stepY: number = 0;
    private boardWidth: number = 0;
    private boardHeight: number = 0;
    private startX: number = 0;

    start() {
        if (!this.tilePrefab || !this.cellsContainer) {
            cc.error("[BoardView] tilePrefab/cellsContainer not assigned");
            return;
        }
        if (this.node.width <= 0) {
            cc.error("[BoardView] board_root width is 0");
            return;
        }

        this.rowGap = Math.max(0, this.rowGap);
        this.colGap = Math.max(0, this.colGap);
        this.overlapY = Math.max(0, this.overlapY);

        // overlay init
        if (this.gameOverOverlay) this.gameOverOverlay.active = false;
        if (this.gameOverDim) this.gameOverDim.opacity = 0;
        if (this.gameOverLabel) {
            this.gameOverLabel.node.opacity = 255;
            this.gameOverLabel.string = "GAME OVER";
        }

        // logic init
        this.logic = new BoardLogic();
        this.logic.init({
            rows: this.rows,
            cols: this.cols,
            colorsCount: 5,
            startMoves: this.startMoves,
            targetScore: this.targetScore,
        });

        this.updateMovesLabel();
        this.updateScoreLabel();

        this.buildViewFromModel();
    }

    private updateMovesLabel(): void {
        if (!this.movesLabel || !this.logic) return;
        this.movesLabel.string = String(this.logic.getMovesLeft());
    }

    private updateScoreLabel(): void {
        if (!this.scoreLabel || !this.logic) return;
        this.scoreLabel.string = `${this.logic.getCurrentScore()}/${this.logic.getTargetScore()}`;
    }

    private buildViewFromModel(): void {
        this.cellsContainer.removeAllChildren();

        this.computeLayout();

        this.nodes = Array.from({ length: this.rows }, () =>
            Array.from({ length: this.cols }, () => null)
        );

        // draw from bottom to top
        for (let r = this.rows - 1; r >= 0; r--) {
            for (let c = 0; c < this.cols; c++) {
                const type = this.logic.getType(r, c) as TileType;
                const node = this.createTileNode(r, c, type);
                node.setPosition(this.cellPos(r, c));
                this.nodes[r][c] = node;
            }
        }
    }

    private computeLayout(): void {
        this.boardWidth = this.node.width;

        const totalColGaps = (this.cols - 1) * this.colGap;
        this.cellSize = (this.boardWidth - totalColGaps) / this.cols;

        if (this.cellSize <= 0) {
            cc.error("[BoardView] cellSize <= 0. Decrease colGap or increase board_root width.");
            return;
        }

        const gridWidth = this.cols * this.cellSize + (this.cols - 1) * this.colGap;
        this.startX = -gridWidth / 2 + this.cellSize / 2;

        this.stepX = this.cellSize + this.colGap;

        // overlap reduces vertical pitch
        this.stepY = (this.cellSize + this.rowGap) - this.overlapY;

        this.boardHeight = this.cellSize + (this.rows - 1) * this.stepY;

        if (this.maskNode) {
            this.maskNode.width = this.boardWidth;
            this.maskNode.height = this.boardHeight;
            this.maskNode.setPosition(0, 0);
        }

        this.node.height = this.boardHeight;
        this.cellsContainer.width = this.boardWidth;
        this.cellsContainer.height = this.boardHeight;
        this.cellsContainer.setPosition(0, 0);
    }

    private cellPos(r: number, c: number): cc.Vec2 {
        const x = this.startX + c * this.stepX;
        const y = this.boardHeight / 2 - this.cellSize / 2 - r * this.stepY;
        return cc.v2(x, y);
    }

    private createTileNode(r: number, c: number, type: TileType): cc.Node {
        const tileNode = cc.instantiate(this.tilePrefab);
        tileNode.parent = this.cellsContainer;

        tileNode.setContentSize(this.cellSize, this.cellSize);

        const view = tileNode.getComponent(TileView);
        if (!view) {
            cc.error("[BoardView] Tile prefab has no TileView component");
            return tileNode;
        }

        view.setGridPos(r, c);
        view.setType(type);

        tileNode.off(cc.Node.EventType.TOUCH_END);
        tileNode.on(cc.Node.EventType.TOUCH_END, () => this.onTileClick(view.row, view.col), this);

        return tileNode;
    }

    private shakeBoard(): Promise<void> {
        const n = this.cellsContainer;
        n.stopAllActions();

        const startX = n.x;
        const startY = n.y;

        return new Promise<void>((resolve) => {
            cc.tween(n)
                .to(this.shakeDuration * 0.25, { x: startX - this.shakeOffset })
                .to(this.shakeDuration * 0.25, { x: startX + this.shakeOffset })
                .to(this.shakeDuration * 0.25, { x: startX - this.shakeOffset * 0.6 })
                .to(this.shakeDuration * 0.25, { x: startX })
                .call(() => {
                    n.setPosition(startX, startY);
                    resolve();
                })
                .start();
        });
    }

    private async onTileClick(r: number, c: number): Promise<void> {
        if (this.isBusy) return;
        if (!this.logic) return;

        const res = this.logic.handleClick(r, c);

        if (res.kind === "ignored") return;

        if (res.kind === "shake") {
            await this.shakeBoard();
            return;
        }

        this.isBusy = true;
        try {
            // UI: moves/score update immediately (logic уже обновила)
            this.updateMovesLabel();
            this.updateScoreLabel();

            // 1) анимация удаления (view)
            await this.animateRemoveCluster(res.cluster);

            // 2) гравитация + refill (logic) -> анимация падения/спавна (view)
            const gravity = this.logic.applyGravityAndRefill();
            await this.animateGravityAndRefill(gravity.moves, gravity.spawns);

            // 3) shuffle (logic) -> shuffle animation (view)
            const resShuffle = this.logic.ensurePlayableOrGameOver(3);

            for (const mapping of resShuffle.shuffles) {
                await this.animateShuffle(mapping);
            }

            // 4) overlay
            if (this.logic.getIsWin()) {
                this.showOverlay("YOU WIN");
                return;
            }
            if (this.logic.getIsGameOver() || resShuffle.ended) {
                this.showOverlay("GAME OVER");
                return;
            }
        } finally {
            this.isBusy = false;
        }
    }

    private showOverlay(text: string): void {
        if (!this.gameOverOverlay || !this.gameOverDim || !this.gameOverLabel) return;

        this.gameOverLabel.string = text;

        const p = this.gameOverOverlay.parent;
        if (p) this.gameOverOverlay.setSiblingIndex(p.childrenCount - 1);
        this.gameOverOverlay.zIndex = 9999;

        this.gameOverOverlay.active = true;

        this.gameOverDim.stopAllActions();
        this.gameOverDim.opacity = 0;

        this.gameOverLabel.node.opacity = 255;

        cc.tween(this.gameOverDim)
            .to(this.gameOverFade, { opacity: 180 })
            .start();
    }

    private async animateRemoveCluster(cluster: CellPos[]): Promise<void> {
        const tweens: Promise<void>[] = [];

        for (const { r, c } of cluster) {
            const node = this.nodes[r][c];
            this.nodes[r][c] = null;
            if (!node) continue;

            tweens.push(
                new Promise<void>((resolve) => {
                    if (!cc.isValid(node)) return resolve();
                    cc.tween(node)
                        .to(this.removeDuration, { scale: 0 })
                        .call(() => {
                            if (cc.isValid(node)) node.destroy();
                            resolve();
                        })
                        .start();
                })
            );
        }

        await Promise.all(tweens);
    }

    private async animateGravityAndRefill(moves: GravityMove[], spawns: GravitySpawn[]): Promise<void> {
        const tweens: Promise<void>[] = [];

        // 1) перемещения вниз
        for (const m of moves) {
            const node = this.nodes[m.fromR][m.c];
            this.nodes[m.fromR][m.c] = null;
            this.nodes[m.toR][m.c] = node;

            if (!node || !cc.isValid(node)) continue;

            const view = node.getComponent(TileView);
            if (view) view.setGridPos(m.toR, m.c);

            const target = this.cellPos(m.toR, m.c);

            tweens.push(
                new Promise<void>((resolve) => {
                    if (!cc.isValid(node)) return resolve();
                    cc.tween(node)
                        .to(this.fallDuration, { x: target.x, y: target.y })
                        .call(resolve)
                        .start();
                })
            );
        }

        // 2) спавн новых (падают внутри маски)
        for (const s of spawns) {
            const node = this.createTileNode(s.r, s.c, s.type);
            this.nodes[s.r][s.c] = node;

            const topY = this.boardHeight / 2 - this.cellSize / 2;
            const spawnX = this.startX + s.c * this.stepX;
            const spawnY = topY + Math.max(0, this.spawnAboveTop);

            node.setPosition(spawnX, spawnY);
            node.scale = 1;

            const target = this.cellPos(s.r, s.c);

            tweens.push(
                new Promise<void>((resolve) => {
                    if (!cc.isValid(node)) return resolve();
                    cc.tween(node)
                        .to(this.fallDuration, { x: target.x, y: target.y })
                        .call(resolve)
                        .start();
                })
            );
        }

        await Promise.all(tweens);

        // восстановим порядок отрисовки
        this.reorderByRows();
    }

    private async animateShuffle(mapping: ShuffleMapping): Promise<void> {
        const tweens: Promise<void>[] = [];

        // соберём новые позиции нод
        const nextNodes: (cc.Node | null)[][] = Array.from({ length: this.rows }, () =>
            Array.from({ length: this.cols }, () => null)
        );

        for (const m of mapping) {
            const node = this.nodes[m.fromR][m.fromC];
            if (!node) continue;

            nextNodes[m.toR][m.toC] = node;

            const view = node.getComponent(TileView);
            if (view) view.setGridPos(m.toR, m.toC);

            const target = this.cellPos(m.toR, m.toC);

            tweens.push(
                new Promise<void>((resolve) => {
                    if (!cc.isValid(node)) return resolve();
                    cc.tween(node)
                        .to(this.shuffleDuration, { x: target.x, y: target.y })
                        .call(resolve)
                        .start();
                })
            );
        }

        await Promise.all(tweens);

        // применяем новую матрицу
        this.nodes = nextNodes;

        // восстановим порядок отрисовки: снизу вверх
        this.reorderByRows();
    }

    private reorderByRows(): void {
        if (!this.cellsContainer) return;

        // sibling index: сначала нижние ряды, затем верхние
        for (let r = this.rows - 1; r >= 0; r--) {
            for (let c = 0; c < this.cols; c++) {
                const node = this.nodes[r][c];
                if (node) node.setSiblingIndex(this.cellsContainer.childrenCount - 1);
            }
        }
    }
}