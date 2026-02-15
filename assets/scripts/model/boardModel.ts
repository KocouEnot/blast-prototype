export enum TileType {
    Blue = 0,
    Green = 1,
    Red = 2,
    Yellow = 3,
    Purple = 4,
}

export type Cell = TileType | null;

export default class BoardModel {
    private grid: Cell[][] = [];

    constructor(public readonly rows: number, public readonly cols: number) {
        this.grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
    }

    randomType(typesCount: number = 5): TileType {
        return Math.floor(Math.random() * typesCount) as TileType;
    }

    fillRandom(typesCount: number = 5): void {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c] = this.randomType(typesCount);
            }
        }
    }

    inBounds(r: number, c: number): boolean {
        return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }

    get(r: number, c: number): Cell {
        return this.grid[r][c];
    }

    set(r: number, c: number, v: Cell): void {
        this.grid[r][c] = v;
    }

    findCluster(sr: number, sc: number): Array<{ r: number; c: number }> {
        const start = this.get(sr, sc);
        if (start === null) return [];

        const visited = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
        const q: Array<{ r: number; c: number }> = [{ r: sr, c: sc }];
        visited[sr][sc] = true;

        const out: Array<{ r: number; c: number }> = [];

        while (q.length) {
            const { r, c } = q.shift()!;
            if (this.get(r, c) !== start) continue;
            out.push({ r, c });

            const n = [
                { r: r - 1, c },
                { r: r + 1, c },
                { r, c: c - 1 },
                { r, c: c + 1 },
            ];

            for (const p of n) {
                if (!this.inBounds(p.r, p.c)) continue;
                if (visited[p.r][p.c]) continue;
                if (this.get(p.r, p.c) !== start) continue;
                visited[p.r][p.c] = true;
                q.push(p);
            }
        }

        return out;
    }

    clearCells(cells: Array<{ r: number; c: number }>): void {
        for (const { r, c } of cells) this.set(r, c, null);
    }
}