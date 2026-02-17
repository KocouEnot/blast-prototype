const { ccclass, property } = cc._decorator;

import { TileType } from "../model/boardModel";
import TileView from "./tileView";
import BoardLogic, { CellPos, ShuffleMapping, GravityMove, GravitySpawn } from "../core/boardLogic";
import BoosterController from "../core/boosterController";
import BoosterButton from "../view/boosterButton";

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

    @property(BoosterController)
    boosterController: BoosterController = null;

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

    @property
    tileSelectScale: number = 0.92;

    @property
    hintIdleSeconds: number = 5;

    @property
    hintPulseScale: number = 1.08;

    @property
    hintPulseDuration: number = 0.22;

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

    private teleportFirst: { r: number; c: number } | null = null;

    private hintTimer: number | null = null;
    private hintNodes: cc.Node[] = [];
    private hintActive: boolean = false;


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

        this.resetHintTimer();

        if (this.boosterController) {
            this.boosterController.node.off("booster-changed", this.onBoosterChanged, this);
            this.boosterController.node.on("booster-changed", this.onBoosterChanged, this);
        }
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

        this.stopHint();
        this.resetHintTimer();

        const activeBooster = this.boosterController ? this.boosterController.getActive() : null;
        const boosterId = activeBooster ? activeBooster.boosterId : null;

        if (boosterId === "teleport") {
            await this.handleTeleportClick(r, c);
            // Important: After the booster, we also restart the timer
            this.resetHintTimer();
            return;
        }

        if (boosterId === "bomb") {
            await this.handleBombClick(r, c);
            this.resetHintTimer();
            return;
        }

        const res = this.logic.handleClick(r, c);

        if (res.kind === "ignored") return;

        if (res.kind === "shake") {
            await this.shakeBoard();
            return;
        }

        this.isBusy = true;

        let shouldResetHint = true;

        try {
            this.updateMovesLabel();
            this.updateScoreLabel();

            await this.animateRemoveCluster(res.cluster);

            const gravity = this.logic.applyGravityAndRefill();
            await this.animateGravityAndRefill(gravity.moves, gravity.spawns);

            const resShuffle = this.logic.ensurePlayableOrGameOver(3);
            for (const mapping of resShuffle.shuffles) {
                await this.animateShuffle(mapping);
            }

            if (this.logic.getIsWin()) {
                this.showOverlay("YOU WIN");
                shouldResetHint = false;
                return;
            }

            if (this.logic.getIsGameOver() || resShuffle.ended) {
                this.showOverlay("GAME OVER");
                shouldResetHint = false;
                return;
            }
        } finally {
            this.isBusy = false;

            if (shouldResetHint) {
                this.resetHintTimer(); // ✅ now isBusy is false, the timer is actually set
            }
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

        // 1) moving down
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

        // 2) spawn new ones (fall inside the mask)
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

        // let's restore the drawing order
        this.reorderByRows();
    }

    private async animateShuffle(mapping: ShuffleMapping): Promise<void> {
        const tweens: Promise<void>[] = [];

        // Let's collect new node positions
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

        // we apply a new matrix
        this.nodes = nextNodes;

        // Let's restore the drawing order: from bottom to top
        this.reorderByRows();
    }

    private reorderByRows(): void {
        if (!this.cellsContainer) return;

        // sibling index: bottom rows first, then top rows
        for (let r = this.rows - 1; r >= 0; r--) {
            for (let c = 0; c < this.cols; c++) {
                const node = this.nodes[r][c];
                if (node) node.setSiblingIndex(this.cellsContainer.childrenCount - 1);
            }
        }
    }

    private onBoosterChanged(activeBtn: BoosterButton | null): void {
        // If you turn off the booster or switch to another one, reset the tile selection
        if (!activeBtn || activeBtn.boosterId !== "teleport") {
            this.clearTeleportSelection();
        }
    }

    private setTileSelected(r: number, c: number, selected: boolean): void {
        const node = this.nodes[r][c];
        if (!node || !cc.isValid(node)) return;

        node.stopAllActions();
        const targetScale = selected ? this.tileSelectScale : 1;

        cc.tween(node)
            .to(0.08, { scale: targetScale })
            .start();
    }

    private clearTeleportSelection(): void {
        if (!this.teleportFirst) return;
        this.setTileSelected(this.teleportFirst.r, this.teleportFirst.c, false);
        this.teleportFirst = null;
    }

    private async handleTeleportClick(r: number, c: number): Promise<void> {
        if (this.isBusy) return;
        if (!this.logic.canInteract || (this.logic as any).canInteract && !(this.logic as any).canInteract()) {
        }

        // you can't select empty
        const t = this.logic.getType(r, c);
        if (t === null) return;

        // 1) If the first tile is not selected, select it
        if (!this.teleportFirst) {
            this.teleportFirst = { r, c };
            this.setTileSelected(r, c, true);
            return;
        }

        // 2) Click on the same tile to deselect it.
        if (this.teleportFirst.r === r && this.teleportFirst.c === c) {
            this.clearTeleportSelection();
            return;
        }

        // 3) second tile - we do a swap
        const a = this.teleportFirst;
        this.isBusy = true;

        try {
            // we remove the visual of the first choice
            this.setTileSelected(a.r, a.c, false);

            // logic: change types in the model
            this.logic.swapCells(a.r, a.c, r, c);

            // view: Animating the node reordering
            await this.animateSwapNodes(a.r, a.c, r, c);

            // spend 1 booster for a successful swap
            const active = this.boosterController ? this.boosterController.getActive() : null;
            if (active) {
                active.consumeOne();                 // -1
                this.boosterController.clear();       // auto-off + will call booster-changed -> deselect
                this.boosterController.clearIfEmpty(active); // if it became 0 (just in case)
            }

            // reset
            this.teleportFirst = null;

            this.resetHintTimer();
        } finally {
            this.isBusy = false;

            this.resetHintTimer();

        }
    }

    private async animateSwapNodes(r1: number, c1: number, r2: number, c2: number): Promise<void> {
        const n1 = this.nodes[r1][c1];
        const n2 = this.nodes[r2][c2];
        if (!n1 || !n2) return;

        // updating the nodes matrix
        this.nodes[r1][c1] = n2;
        this.nodes[r2][c2] = n1;

        // updating gridPos inside TileView
        const v1 = n1.getComponent(TileView);
        const v2 = n2.getComponent(TileView);
        if (v1) v1.setGridPos(r2, c2);
        if (v2) v2.setGridPos(r1, c1);

        const p1 = this.cellPos(r1, c1);
        const p2 = this.cellPos(r2, c2);

        await Promise.all([
            new Promise<void>((resolve) => {
                if (!cc.isValid(n1)) return resolve();
                cc.tween(n1).to(0.18, { x: p2.x, y: p2.y }).call(resolve).start();
            }),
            new Promise<void>((resolve) => {
                if (!cc.isValid(n2)) return resolve();
                cc.tween(n2).to(0.18, { x: p1.x, y: p1.y }).call(resolve).start();
            }),
        ]);

        this.reorderByRows();
    }

    private async handleBombClick(r: number, c: number): Promise<void> {
        if (this.isBusy) return;
        if (!this.logic) return;

        // we apply the bomb to logic
        const res = this.logic.applyBomb(r, c);
        if (res.kind === "ignored") return;

        this.isBusy = true;

        // UI: Update points immediately (leave moves alone)
        this.updateScoreLabel();

        // 3x3 removal animation
        await this.animateRemoveCluster(res.cluster);

        // gravity + new
        const gravity = this.logic.applyGravityAndRefill();
        await this.animateGravityAndRefill(gravity.moves, gravity.spawns);

        // If after the move there are no available explosions >=3, we do a shuffle up to 3, otherwise GameOver
        const resShuffle = this.logic.ensurePlayableOrGameOver(3);
        for (const mapping of resShuffle.shuffles) {
            await this.animateShuffle(mapping);
        }

        // spend 1 bomb and turn off
        const active = this.boosterController ? this.boosterController.getActive() : null;
        if (active) {
            active.consumeOne();
            this.boosterController.clear();        // auto-off
            this.boosterController.clearIfEmpty(active);
        }

        // overlays
        if (this.logic.getIsWin()) {
            this.showOverlay("YOU WIN");
            this.isBusy = false;
            return;
        }
        if (this.logic.getIsGameOver() || resShuffle.ended) {
            this.showOverlay("GAME OVER");
            this.isBusy = false;
            return;
        }

        this.isBusy = false;

        this.resetHintTimer();

    }

    private resetHintTimer(): void {
        if (this.hintTimer !== null) {
            this.unschedule(this.onHintTimer);
            this.hintTimer = null;
        }

        if (!this.logic) return;
        if (this.isBusy) return;
        if (this.logic.getIsGameOver?.() && this.logic.getIsGameOver()) return;
        if (this.logic.getIsWin?.() && this.logic.getIsWin()) return;

        // scheduleOnce can't be conveniently canceled without a reference, so we use schedule + unschedule
        this.scheduleOnce(this.onHintTimer, this.hintIdleSeconds);
        this.hintTimer = 1;
    }

    private onHintTimer = (): void => {
        this.hintTimer = null;

        if (!this.logic) return;
        if (this.isBusy) return;
        if (this.logic.getIsGameOver?.() && this.logic.getIsGameOver()) return;
        if (this.logic.getIsWin?.() && this.logic.getIsWin()) return;

        this.showHint();
    };

    private showHint(): void {
        if (!this.logic) return;
        if (this.hintActive) return;

        const cluster = this.logic.getRandomPlayableCluster(3);
        if (!cluster || cluster.length < 3) return;

        this.hintActive = true;
        this.hintNodes = [];

        // we collect nodes
        for (const { r, c } of cluster) {
            const node = this.nodes?.[r]?.[c];
            if (!node || !cc.isValid(node)) continue;
            this.hintNodes.push(node);
        }

        if (this.hintNodes.length < 3) {
            this.hintActive = false;
            this.hintNodes = [];
            return;
        }

        // pulsation
        for (const n of this.hintNodes) {
            n.stopAllActions();
            n.scale = 1;

            cc.tween(n)
                .repeatForever(
                    cc.tween()
                        .to(this.hintPulseDuration, { scale: this.hintPulseScale })
                        .to(this.hintPulseDuration, { scale: 1 })
                )
                .start();
        }
    }

    private stopHint(): void {
        if (!this.hintActive) return;

        for (const n of this.hintNodes) {
            if (!n || !cc.isValid(n)) continue;
            n.stopAllActions();
            n.scale = 1;
        }

        this.hintNodes = [];
        this.hintActive = false;
    }

}