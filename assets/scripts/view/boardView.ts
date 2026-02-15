const { ccclass, property } = cc._decorator;

import BoardModel, { TileType } from "../model/boardModel";
import TileView from "./tileView";

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

    private model: BoardModel = null;
    private nodes: (cc.Node | null)[][] = [];
    private isBusy: boolean = false;

    // geometry
    private cellSize: number = 0;
    private stepX: number = 0;
    private stepY: number = 0;
    private boardWidth: number = 0;
    private boardHeight: number = 0;
    private startX: number = 0;

    private movesLeft: number = 0;
    private isGameOver: boolean = false;


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
        this.movesLeft = this.startMoves;
        this.updateMovesLabel();

        this.isGameOver = false;

        if (this.gameOverOverlay) {
            this.gameOverOverlay.active = false;
        }

        if (this.gameOverDim) {
            this.gameOverDim.opacity = 0;
        }

        if (this.gameOverLabel) {
            this.gameOverLabel.node.opacity = 255;
            this.gameOverLabel.string = "GAME OVER";
        }

        this.build();
    }

    private updateMovesLabel(): void {
        if (this.movesLabel) this.movesLabel.string = String(this.movesLeft);
    }

    private build(): void {
        this.cellsContainer.removeAllChildren();

        this.model = new BoardModel(this.rows, this.cols);
        this.model.fillRandom(5);

        this.computeLayout();

        this.nodes = Array.from({ length: this.rows }, () => Array.from({ length: this.cols }, () => null));

        // draw from bottom to top: the top ones are always on top of the bottom ones
        for (let r = this.rows - 1; r >= 0; r--) {
            for (let c = 0; c < this.cols; c++) {
                const type = this.model.get(r, c) as TileType;
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
        // we shake the cellsContainer (inside the mask) so as not to break the layout/mask
        const n = this.cellsContainer;

        // if we're already shaking, restart
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
        if (this.isGameOver) return;
        if (this.movesLeft <= 0) return;


        const t = this.model.get(r, c);
        if (t === null) return;

        const cluster = this.model.findCluster(r, c);

        if (cluster.length < 3) {
            await this.shakeBoard();
            return;
        }

        this.isBusy = true;

        // we spend a turn only on a valid explosion
        this.movesLeft -= 1;
        this.updateMovesLabel();

        if (this.movesLeft <= 0) {
            this.showGameOver();
        }

        await this.removeCluster(cluster);
        await this.applyGravityAndRefill();

        this.isBusy = false;
    }

    private showGameOver(): void {
        if (this.isGameOver) return;
        this.isGameOver = true;

        if (!this.gameOverOverlay || !this.gameOverDim || !this.gameOverLabel) return;

        // ensure that the overlay is on top of the UICanvas
        const p = this.gameOverOverlay.parent;
        if (p) this.gameOverOverlay.setSiblingIndex(p.childrenCount - 1);
        this.gameOverOverlay.zIndex = 9999;

        this.gameOverOverlay.active = true;

        this.gameOverDim.stopAllActions();
        this.gameOverDim.opacity = 0;

        // label the label bright
        this.gameOverLabel.node.opacity = 255;

        cc.tween(this.gameOverDim)
            .to(this.gameOverFade, { opacity: 180 })
            .start();
    }

    private async removeCluster(
        cluster: Array<{ r: number; c: number }>
    ): Promise<void> {
        this.model.clearCells(cluster);

        const tweens: Promise<void>[] = [];

        for (const { r, c } of cluster) {
            const node = this.nodes[r][c];
            this.nodes[r][c] = null;
            if (!node) continue;

            tweens.push(
                new Promise<void>((resolve) => {
                    cc.tween(node)
                        .to(this.removeDuration, { scale: 0 })
                        .call(() => {
                            node.destroy();
                            resolve();
                        })
                        .start();
                })
            );
        }

        await Promise.all(tweens);
    }

    private async applyGravityAndRefill(): Promise<void> {
        const moveTweens: Promise<void>[] = [];

        // 1) move existing ones down
        for (let c = 0; c < this.cols; c++) {
            let write = this.rows - 1;

            for (let r = this.rows - 1; r >= 0; r--) {
                const cell = this.model.get(r, c);
                if (cell === null) continue;

                if (r !== write) {
                    // модель
                    this.model.set(write, c, cell);
                    this.model.set(r, c, null);

                    // вью
                    const node = this.nodes[r][c];
                    this.nodes[write][c] = node;
                    this.nodes[r][c] = null;

                    if (node) {
                        const view = node.getComponent(TileView);
                        if (view) view.setGridPos(write, c);

                        const target = this.cellPos(write, c);

                        moveTweens.push(
                            new Promise<void>((resolve) => {
                                cc.tween(node)
                                    .to(this.fallDuration, { x: target.x, y: target.y })
                                    .call(resolve)
                                    .start();
                            })
                        );
                    }
                }

                write--;
            }

            // 2) spawn new ones into empty ones [0..write]
            for (let r = write; r >= 0; r--) {
                const type = this.model.randomType(5);
                this.model.set(r, c, type);

                const node = this.createTileNode(r, c, type);
                this.nodes[r][c] = node;

                // starting position - above the upper limit so that it “falls”
                const topY = this.boardHeight / 2 - this.cellSize / 2;
                const spawnX = this.startX + c * this.stepX;

                // start just above the top row, but this will be cut off by the mask and will not fit into the UI
                const spawnY = topY + Math.max(0, this.spawnAboveTop);

                node.setPosition(spawnX, spawnY);
                node.scale = 1;

                const target = this.cellPos(r, c);

                moveTweens.push(
                    new Promise<void>((resolve) => {
                        cc.tween(node)
                            .to(this.fallDuration, { x: target.x, y: target.y })
                            .call(resolve)
                            .start();
                    })
                );
            }
        }

        await Promise.all(moveTweens);
    }
}