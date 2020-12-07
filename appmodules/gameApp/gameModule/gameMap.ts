
export enum CellState {
    DISABLE,
    NORMAL,
    DESTROYED
}

export class GameMap {
    map: CellState[][] = new Array(9)

    cellsDisable: number[] = [
        11, 13, 15,
        18, 20, 21, 24, 26,
        37, 40, 43,
        54, 56, 59, 60, 62,
        65, 67, 69]

    cellsDestroy: number[] = []

    cellsNormal: number[] = []

    constructor() {
        this.initMap()
    }

    initMap() {
        this.cellsDestroy = []
        this.cellsNormal = []
        for (let row = 0; row < this.map.length; row++) {
            this.map[row] = new Array(9)
            for (let col = 0; col < this.map[row].length; col++) {
                this.map[row][col] = CellState.NORMAL
            }
        }

        for (let cellNum in this.cellsDisable) {
            this.setCell(this.cellsDisable[cellNum], CellState.DISABLE)
        }

        for (let row = 0; row < this.map.length; row++) {
            for (let col = 0; col < this.map[row].length; col++) {

                if (this.map[row][col] === CellState.NORMAL) {
                    this.cellsNormal.push(this.RCToCellNum(row, col))
                }
            }
        }

        this.logMap()
    }

    private setCell(cellNum: number, cellStat: CellState) {
        let RC = this.cellNumToRC(cellNum)
        console.log('set cell', RC.row, RC.col, CellState[cellStat])
        this.map[RC.row][RC.col] = cellStat
    }

    getBoard() {
        return {
            dis: this.cellsDisable,
            des: this.cellsDestroy
        }
    }

    getCell(cellNum: number) {
        let RC = this.cellNumToRC(cellNum)
        return this.map[RC.row][RC.col]
    }

    destroyRandomCell() {
        if (this.cellsNormal.length > 0) {
            let arrNumToDestroy = randomInteger(0, this.cellsNormal.length)
            let cellNum = this.cellsNormal[arrNumToDestroy]

            console.log('cell to destroy: ', arrNumToDestroy, cellNum)

            this.destroyCell(cellNum)

            return cellNum
        }
        else return null
    }

    disableCell(cellNum: number) {
        let RC = this.cellNumToRC(cellNum)
        this.map[RC.row][RC.col] = CellState.DISABLE
    }

    destroyCell(cellNum: number) {
        let RC = this.cellNumToRC(cellNum)

        if (this.map[RC.row][RC.col] === CellState.NORMAL) {
            sleep(1000).then(() => {
                this.map[RC.row][RC.col] = CellState.DESTROYED
                this.cellsDestroy.push(cellNum)

                const search_index = this.cellsNormal.indexOf(cellNum)
                if (search_index >= 0) {
                    this.cellsNormal.splice(search_index, 1)
                }

                console.log('destroy cell after 1000ms')
                this.logMap()
            })
            console.log('destroy valid')
            return true
        }
        else return false
    }
    repairCell(cellNum: number) {
        let RC = this.cellNumToRC(cellNum)

        if (this.map[RC.row][RC.col] === CellState.DESTROYED) {
            sleep(1000).then(() => {

                const search_index = this.cellsDestroy.indexOf(cellNum)
                if (search_index >= 0) {
                    this.cellsDestroy.splice(search_index, 1)
                }

                this.map[RC.row][RC.col] = CellState.NORMAL

                console.log('repair cell after 1000ms')
                this.logMap()
            })
            return true
        }
        else return false
    }

    logMap() {
        let toPrint = ''
        for (let row = 0; row < this.map.length; row++) {
            for (let col = 0; col < this.map[row].length; col++) {
                toPrint += (this.map[row][col].toString() + ' ')
            }
            toPrint += '\n'
        }
        console.log(toPrint)
        console.log('cell destroyed: ', this.cellsDestroy)
        console.log('cell normal: ', this.cellsNormal)
    }

    cellNumToRC(cellNum: number) {
        return {
            row: Math.floor(cellNum / 9),
            col: cellNum % 9
        }
    }

    RCToCellNum(row: number, col: number) {
        return (9 * row + col)
    }
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}  

function randomInteger(min, max) {
    return Math.floor(Math.random() * (max - min) + min)
}