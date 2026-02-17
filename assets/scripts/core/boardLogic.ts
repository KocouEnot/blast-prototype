const { ccclass } = cc._decorator;

import BoardModel, { TileType } from "../model/boardModel";

export type CellPos = { r: number; c: number };


export type GravityMove = {
    fromR: number;
    toR: number;
    c: number;
};

export type GravitySpawn = {
    r: number;
    c: number;
    type: TileType;
};

export type ClickResult =
    | { kind: "ignored" }
    | { kind: "shake" }
    | {
        kind: "explode";
        cluster: CellPos[];
        movesLeft: number;
        currentScore: number;
        targetScore: number;
        isWin: boolean;
        isGameOver: boolean;
    };

export type ShuffleMove = { fromR: number; fromC: number; toR: number; toC: number };

export type ShuffleMapping = ShuffleMove[];

export type BombResult =
    | { kind: "ignored" }
    | { kind: "bomb"; cluster: CellPos[] };

@ccclass
export default class BoardLogic {
    private model: BoardModel = null;

    private rows: number = 0;
    private cols: number = 0;
    private colorsCount: number = 5;

    private movesLeft: number = 0;
    private startMoves: number = 0;

    private currentScore: number = 0;
    private targetScore: number = 0;

    private isGameOver: boolean = false;
    private isWin: boolean = false;

    private shuffleCount: number = 0;
    private maxShuffles: number = 3;

    public init(params: {
        rows: number;
        cols: number;
        colorsCount: number;
        startMoves: number;
        targetScore: number;
    }): void {
        this.rows = params.rows;
        this.cols = params.cols;
        this.colorsCount = params.colorsCount;

        this.startMoves = params.startMoves;
        this.movesLeft = this.startMoves;

        this.targetScore = params.targetScore;
        this.currentScore = 0;

        this.isGameOver = false;
        this.isWin = false;

        this.model = new BoardModel(this.rows, this.cols);
        this.model.fillRandom(this.colorsCount);

        this.shuffleCount = 0;
        this.maxShuffles = 3;
    }

    public reset(): void {
        this.init({
            rows: this.rows,
            cols: this.cols,
            colorsCount: this.colorsCount,
            startMoves: this.startMoves,
            targetScore: this.targetScore,
        });
    }

    // ===== getters for View =====
    public getRows(): number { return this.rows; }
    public getCols(): number { return this.cols; }

    public getMovesLeft(): number { return this.movesLeft; }
    public getCurrentScore(): number { return this.currentScore; }
    public getTargetScore(): number { return this.targetScore; }

    public getIsGameOver(): boolean { return this.isGameOver; }
    public getIsWin(): boolean { return this.isWin; }

    public getType(r: number, c: number): TileType | null {
        return this.model.get(r, c) as any;
    }

    public canInteract(): boolean {
        return !this.isGameOver && !this.isWin && this.movesLeft > 0;
    }

    // ===== rules =====
    private calcScore(clusterSize: number): number {
        // 3->5, 4->7, 5->9...
        return 2 * clusterSize - 1;
    }

    public handleClick(r: number, c: number): ClickResult {
        if (!this.canInteract()) return { kind: "ignored" };

        const t = this.model.get(r, c);
        if (t === null) return { kind: "ignored" };

        const cluster = this.model.findCluster(r, c) as CellPos[];

        if (!cluster || cluster.length < 3) {
            return { kind: "shake" };
        }

        // valid explode -> spend move
        this.movesLeft -= 1;

        // score
        const gained = this.calcScore(cluster.length);
        this.currentScore = Math.min(this.targetScore, this.currentScore + gained);

        // win / lose flags (lose means: moves became 0, but we still allow view to animate)
        if (this.currentScore >= this.targetScore) {
            this.isWin = true;
        }
        if (this.movesLeft <= 0 && !this.isWin) {
            this.isGameOver = true;
        }

        // clear in model
        this.model.clearCells(cluster);

        return {
            kind: "explode",
            cluster,
            movesLeft: this.movesLeft,
            currentScore: this.currentScore,
            targetScore: this.targetScore,
            isWin: this.isWin,
            isGameOver: this.isGameOver,
        };
    }

    /**
     * Applies gravity + refill in MODEL only.
     * Returns instructions for VIEW: moves + spawns.
     */
    public applyGravityAndRefill(): { moves: GravityMove[]; spawns: GravitySpawn[] } {
        const moves: GravityMove[] = [];
        const spawns: GravitySpawn[] = [];

        for (let c = 0; c < this.cols; c++) {
            let write = this.rows - 1;

            for (let r = this.rows - 1; r >= 0; r--) {
                const cell = this.model.get(r, c);
                if (cell === null) continue;

                if (r !== write) {
                    // move cell down
                    this.model.set(write, c, cell);
                    this.model.set(r, c, null);

                    moves.push({ fromR: r, toR: write, c });
                }

                write--;
            }

            // spawn new [0..write]
            for (let r = write; r >= 0; r--) {
                const type = this.model.randomType(this.colorsCount) as TileType;
                this.model.set(r, c, type);
                spawns.push({ r, c, type });
            }
        }

        return { moves, spawns };
    }

    public hasAnyCluster(minSize: number = 3): boolean {
        const visited: boolean[][] = Array.from({ length: this.rows }, () =>
            Array.from({ length: this.cols }, () => false)
        );

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (visited[r][c]) continue;

                const t = this.model.get(r, c) as TileType | null;
                if (t === null) {
                    visited[r][c] = true;
                    continue;
                }

                // BFS flood fill
                let count = 0;
                const q: Array<{ r: number; c: number }> = [{ r, c }];
                visited[r][c] = true;

                while (q.length) {
                    const cur = q.pop()!;
                    count++;

                    if (count >= minSize) return true;

                    const neigh = [
                        { r: cur.r - 1, c: cur.c },
                        { r: cur.r + 1, c: cur.c },
                        { r: cur.r, c: cur.c - 1 },
                        { r: cur.r, c: cur.c + 1 },
                    ];

                    for (const n of neigh) {
                        if (n.r < 0 || n.r >= this.rows || n.c < 0 || n.c >= this.cols) continue;
                        if (visited[n.r][n.c]) continue;

                        const nt = this.model.get(n.r, n.c) as TileType | null;
                        if (nt === t) {
                            visited[n.r][n.c] = true;
                            q.push(n);
                        }
                    }
                }
            }
        }

        return false;
    }

    private shuffleFilledGridWithMapping(): ShuffleMapping {
        const positions: Array<{ r: number; c: number }> = [];
        const types: TileType[] = [];

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                positions.push({ r, c });
                types.push(this.model.get(r, c) as TileType);
            }
        }

        // shuffle positions (where types/nodes will move)
        const dest = positions.slice();
        for (let i = dest.length - 1; i > 0; i--) {
            const j = (Math.random() * (i + 1)) | 0;
            const tmp = dest[i];
            dest[i] = dest[j];
            dest[j] = tmp;
        }

        // mapping oldPos -> newPos
        const mapping: ShuffleMapping = [];
        for (let i = 0; i < positions.length; i++) {
            mapping.push({
                fromR: positions[i].r,
                fromC: positions[i].c,
                toR: dest[i].r,
                toC: dest[i].c,
            });
        }

        // we apply shuffling to the model (the type "moves" along with the node)
        const newGrid: TileType[][] = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
        for (let i = 0; i < mapping.length; i++) {
            const m = mapping[i];
            newGrid[m.toR][m.toC] = types[i];
        }
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.model.set(r, c, newGrid[r][c]);
            }
        }

        return mapping;
    }

    public ensurePlayableOrGameOver(minSize: number = 3): { shuffles: ShuffleMapping[]; ended: boolean } {
        const shuffles: ShuffleMapping[] = [];

        if (this.hasAnyCluster(minSize)) return { shuffles, ended: false };

        while (!this.hasAnyCluster(minSize)) {
            if (this.shuffleCount >= this.maxShuffles) {
                this.isGameOver = true;
                return { shuffles, ended: true };
            }

            const mapping = this.shuffleFilledGridWithMapping();
            this.shuffleCount += 1;
            shuffles.push(mapping);

            // After shuffle, we'll check again; if there are still no moves, the cycle will continue.
        }

        return { shuffles, ended: false };
    }

    public swapCells(r1: number, c1: number, r2: number, c2: number): void {
        const a = this.model.get(r1, c1) as TileType | null;
        const b = this.model.get(r2, c2) as TileType | null;

        if (a === null || b === null) return;

        this.model.set(r1, c1, b);
        this.model.set(r2, c2, a);
    }

    public clearCells(cells: CellPos[]): void {
        for (const { r, c } of cells) {
            const v = this.getType(r, c);
            if (v === null || v === undefined) continue;

            (this.model as any).set(r, c, null);
        }
    }

    public getBombCluster(centerR: number, centerC: number): CellPos[] {
        // If you click on empty space, ignore
        const t = this.getType(centerR, centerC);
        if (t === null || t === undefined) return [];

        const res: CellPos[] = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const r = centerR + dr;
                const c = centerC + dc;
                if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) continue;

                const v = this.getType(r, c);
                if (v === null || v === undefined) continue; // don't add empty ones
                res.push({ r, c });
            }
        }
        return res;
    }

    public applyBomb(centerR: number, centerC: number): BombResult {
        if (this.isGameOver || this.isWin) return { kind: "ignored" };

        const cluster = this.getBombCluster(centerR, centerC);
        if (cluster.length === 0) return { kind: "ignored" };

        // we clean
        this.clearCells(cluster);

        // +3 for each tile
        const gained = 3 * cluster.length;
        this.currentScore = Math.min(this.targetScore, this.currentScore + gained);

        if (!this.isWin && this.currentScore >= this.targetScore) {
            this.isWin = true;
            this.isGameOver = true; // Let's continue blocking (like you have now)
        }

        return { kind: "bomb", cluster };
    }

    public getRandomPlayableCluster(minSize: number = 3): CellPos[] | null {
        const starts: CellPos[] = [];

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const t = this.getType(r, c);
                if (t === null || t === undefined) continue;

                const cluster = this.findCluster(r, c);
                if (cluster.length >= minSize) {
                    starts.push({ r, c });
                }
            }
        }

        if (starts.length === 0) return null;

        const pick = starts[(Math.random() * starts.length) | 0];
        const res = this.findCluster(pick.r, pick.c);
        return res.length >= minSize ? res : null;
    }

    public findCluster(startR: number, startC: number): CellPos[] {
        const startType = this.getType(startR, startC);
        if (startType === null || startType === undefined) return [];

        const visited: boolean[][] = Array.from({ length: this.rows }, () =>
            Array.from({ length: this.cols }, () => false)
        );

        const stack: CellPos[] = [{ r: startR, c: startC }];
        const result: CellPos[] = [];

        while (stack.length > 0) {
            const { r, c } = stack.pop()!;

            if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) continue;
            if (visited[r][c]) continue;

            const t = this.getType(r, c);
            if (t !== startType) continue;

            visited[r][c] = true;
            result.push({ r, c });

            // 4 directions
            stack.push({ r: r + 1, c });
            stack.push({ r: r - 1, c });
            stack.push({ r, c: c + 1 });
            stack.push({ r, c: c - 1 });
        }

        return result;
    }

}