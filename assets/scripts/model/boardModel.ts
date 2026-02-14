export enum TileType {
    Red,
    Blue,
    Green,
    Yellow,
    Purple
}

export interface TileData {
    row: number;
    col: number;
    type: TileType;
}

export class BoardModel {

    private grid: TileData[][] = [];

    constructor(
        private rows: number,
        private cols: number
    ) { }

    public generate(): void {
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];

            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c] = {
                    row: r,
                    col: c,
                    type: this.randomType()
                };
            }
        }
    }

    private randomType(): TileType {
        return Math.floor(Math.random() * 5);
    }

    public getGrid(): TileData[][] {
        return this.grid;
    }
}