const { ccclass, property } = cc._decorator;

import { BoardModel } from "../model/boardModel";
import TileView from "./tileView";

@ccclass
export default class BoardView extends cc.Component {

    @property(cc.Prefab)
    tilePrefab: cc.Prefab = null;

    private model: BoardModel;

    private readonly COLS = 9;
    private readonly ROWS = 10;

    onLoad() {
        this.model = new BoardModel(this.ROWS, this.COLS);
        this.model.generate();

        this.draw();
    }

    private draw() {

        const grid = this.model.getGrid();

        const boardWidth = this.node.width;
        const cellSize = boardWidth / this.COLS;

        const overlapY = 11;
        const stepY = cellSize - overlapY;

        const boardHeight = cellSize + (this.ROWS - 1) * stepY;
        this.node.height = boardHeight;

        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {

                const tileNode = cc.instantiate(this.tilePrefab);
                tileNode.parent = this.node;

                tileNode.setContentSize(cellSize, cellSize);

                const x = -boardWidth / 2 + cellSize / 2 + c * cellSize;
                const y = boardHeight / 2 - cellSize / 2 - r * stepY;

                tileNode.setPosition(x, y);

                const view = tileNode.getComponent(TileView);
                view.setType(grid[r][c].type);
            }
        }
    }
}