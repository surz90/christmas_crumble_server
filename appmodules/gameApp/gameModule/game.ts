import { RoleType, TeamListType, TeamType } from "../../appTypes/appType"
import { ServerMethod } from "../../wssApp/websocketServer"
import { GameMap } from "./gameMap"
import { Player } from "./player"

const gameloop = require('node-gameloop')

const gameUpdateTick = 10 //10 update every 1 sec

export type DataPos = {
    pos: { x: number, y: number, z: number },
    rot: { x: number, y: number, z: number, w: number }
    //rot: number
}
export type DataPlayer = {
    SANTA: {
        ATT1: DataPos | null,
        ATT2: DataPos | null,
        DEF: DataPos | null,
    },
    KRAMPUS: {
        ATT1: DataPos | null,
        ATT2: DataPos | null,
        DEF: DataPos | null
    }
}

export class Game {
    private isActive: boolean = false
    private isStart: boolean = false
    private isDestroySequence: boolean = false
    private connectedPlayer: { [key: string]: Player } = {}

    //workaround
    playerEnable = {
        SANTA: {
            ATT1: true,
            ATT2: true,
            DEF: true,
        },
        KRAMPUS: {
            ATT1: true,
            ATT2: true,
            DEF: true
        }
    }

    //gameloop
    private moveTick: any
    private endGameTick: any
    private randomDestroy: any

    private santaTeam: TeamListType = {
        ATT1: null,
        ATT2: null,
        DEF: null
    }
    private krampusTeam: TeamListType = {
        ATT1: null,
        ATT2: null,
        DEF: null
    }

    private teamPosData: DataPlayer = {
        SANTA: {
            ATT1: null,
            ATT2: null,
            DEF: null,
        },
        KRAMPUS: {
            ATT1: null,
            ATT2: null,
            DEF: null
        }
    }

    private gameMap: GameMap = new GameMap()

    constructor() {
        this.startMoveSync()
    }

    getMap() {
        return this.gameMap
    }

    startMoveSync() {
        this.moveTick = gameloop.setGameLoop((delta) => {
            for (let key in this.santaTeam) {
                if (this.santaTeam[key] !== null) {
                    this.teamPosData.SANTA[key] = this.santaTeam[key].dataPos
                }
            }
            for (let key in this.krampusTeam) {
                if (this.krampusTeam[key] !== null) {
                    this.teamPosData.KRAMPUS[key] = this.krampusTeam[key].dataPos
                }
            }

            for (let uuid in this.connectedPlayer) {
                //console.log('send data to ', this.connectedPlayer[uuid].playerAttr.dclID)
                this.connectedPlayer[uuid].sendMsg({
                    method: ServerMethod.UPDPOS,
                    data: this.teamPosData
                })
            }
            //console.log(this.teamPosData)
        }, 1000 / gameUpdateTick)
    }

    endGameMonitor() {
        let santaDisableCount = 0
        let krampusDisableCount = 0
        let winner: TeamType

        this.endGameTick = gameloop.setGameLoop((delta) => {
            santaDisableCount = 0
            //check santa team
            for (let key in this.playerEnable.SANTA) {
                if (this.playerEnable.SANTA[key] === false) {
                    santaDisableCount += 1
                }
            }
            krampusDisableCount = 0
            //check santa team
            for (let key in this.playerEnable.KRAMPUS) {
                if (this.playerEnable.KRAMPUS[key] === false) {
                    krampusDisableCount += 1
                }
            }

            //console.log('santa count: ', santaDisableCount, ' krampus count: ', krampusDisableCount)

            if (santaDisableCount === 3) {
                console.log('santa lose, krampus win')
                winner = TeamType.KRAMPUS
            }
            else if (krampusDisableCount === 3) {
                console.log('krampus lose, santa win')
                winner = TeamType.SANTA
            }

            if (winner === TeamType.SANTA || winner === TeamType.KRAMPUS) {
                console.log('sent data winner')
                for (let key in this.connectedPlayer) {
                    this.connectedPlayer[key].sendMsg({
                        method: ServerMethod.ENDGAME,
                        data: {
                            win: winner
                        }
                    })
                }

                //reset game 
                console.log('set game state')
                this.isStart = false
                this.isDestroySequence = false

                this.gameMap.initMap()
                this.gameMap.logMap()

                for (let key in this.santaTeam) {
                    this.santaTeam[key] = null
                    this.teamPosData.SANTA[key] = null
                    this.playerEnable.SANTA[key] = true
                }
                for (let key in this.krampusTeam) {
                    this.krampusTeam[key] = null
                    this.teamPosData.KRAMPUS[key] = null
                    this.playerEnable.KRAMPUS[key] = true
                }

                console.log('sent resetted game state to client')
                console.log(this.getPlayerActiveSummary())
                for (let key in this.connectedPlayer) {
                    this.connectedPlayer[key].sendMsg({
                        method: ServerMethod.UPDPLAYER,
                        data: this.getPlayerActiveSummary()
                    })
                    this.connectedPlayer[key].sendMsg({
                        method: ServerMethod.UPDBOARD,
                        data: this.getMap().getBoard()
                    })
                }

                console.log('disable destroy tick and end game tick')
                gameloop.clearGameLoop(this.randomDestroy)
                gameloop.clearGameLoop(this.endGameTick)
            }
        }, 1000 / (gameUpdateTick / 10))
    }

    startRandomCellDestroy() {
        this.randomDestroy = gameloop.setGameLoop((delta) => {
            if (this.isDestroySequence) {
                let randomCellDestroy = this.gameMap.destroyRandomCell()

                if (randomCellDestroy !== null) {
                    for (let key in this.connectedPlayer) {
                        this.connectedPlayer[key].sendMsg({
                            method: ServerMethod.RANDOMDESTROY,
                            data: randomCellDestroy
                        })
                    }
                }
            }
        }, 1000/ 0.05)
    }

    startGamePlay() {
        console.log('start the game !')
        this.isStart = true
        sleep(5000).then(() => {
            this.isDestroySequence = true
        })
        this.startRandomCellDestroy()
        this.endGameMonitor()
    }

    isGameStart() {
        return this.isStart
    }

    updateDataPos(_uuid, _dataPos) {
        this.connectedPlayer[_uuid].dataPos = _dataPos
    }

    getConnectedPlayer() {
        return this.connectedPlayer
    }

    getActivePlayer() {
        return {
            SANTA: this.santaTeam,
            KRAMPUS: this.krampusTeam
        }
    }

    isGameActive() {
        return this.isActive
    }

    playerJoin(_uuID: string, _team: TeamType, _role: RoleType) {
        if (this.isStart) return false
        console.log('is player Enable, ', this.playerEnable[TeamType[_team]][RoleType[_role]])
        if(this.playerEnable[TeamType[_team]][RoleType[_role]] === false) return false

        console.log('CHECK DUPLICATE: ')

        for (let key in this.santaTeam) {
            let santaPlayer = this.santaTeam[key]

            if (santaPlayer !== null && santaPlayer.uuID === _uuID) {
                console.log('THIS PLAYER IS ALREADY REGISTER AS SANTA ', key)
                //set player enable to false (disable the player)

                if (_team === TeamType.KRAMPUS) {
                    console.log('PLAYER REQUEST JOIN AS KRAMPUS, make santa slot available')
                    this.santaTeam[key] = null

                    this.playerEnable.SANTA.ATT1 = true
                    this.playerEnable.SANTA.ATT2 = true
                    this.playerEnable.SANTA.DEF = true
                }
                else {
                    if (RoleType[_role] === key) return false

                    this.santaTeam[key] = null
                    console.log('PLAYER REGISTERED AS SANTA, disable slot before')
                    this.playerEnable.SANTA[key] = false
                }
            }
        }
        for (let key in this.krampusTeam) {
            let krampusPlayer = this.krampusTeam[key]

            if (krampusPlayer !== null && krampusPlayer.uuID === _uuID) {
                console.log('THIS PLAYER IS ALREADY REGISTER AS KRAMPUS', key)
                //set player enable to false (disable the player)

                if (_team === TeamType.SANTA) {
                    console.log('PLAYER REQUEST JOIN AS SANTA, make krampus slot available')
                    this.krampusTeam[key] = null

                    this.playerEnable.KRAMPUS.ATT1 = true
                    this.playerEnable.KRAMPUS.ATT2 = true
                    this.playerEnable.KRAMPUS.DEF = true
                }
                else {
                    if (RoleType[_role] === key) return false

                    this.krampusTeam[key] = null
                    console.log('PLAYER REGISTERED AS KRAMPUS, disable slot before')
                    this.playerEnable.KRAMPUS[key] = false
                }
            }
        }

        console.log('CHECK DUPLICATE DONE')


        if (_team === TeamType.SANTA) {
            //if role already occupied
            if (this.santaTeam[RoleType[_role]] !== null) {
                return false
            }
            else if (this.playerEnable.SANTA[RoleType[_role]] === false) {
                return false
            }
            this.santaTeam[RoleType[_role]] = this.connectedPlayer[_uuID]
        }
        if (_team === TeamType.KRAMPUS) {
            if (this.krampusTeam[RoleType[_role]] !== null) return false
            else if (this.playerEnable.KRAMPUS[RoleType[_role]] === false) {
                return false
            }
            this.krampusTeam[RoleType[_role]] = this.connectedPlayer[_uuID]
        }
        return true
    }

    isPlayerComplete() {
        console.log('CHECK PLAYER COMPLETE')
        for (let key in this.santaTeam) {
            console.log(key)
            if (this.santaTeam[key] === null && this.playerEnable.SANTA[key] === true) return false
        }
        for (let key in this.krampusTeam) {
            console.log(key)
            if (this.krampusTeam[key] === null && this.playerEnable.KRAMPUS[key] === true) return false
        }
        return true
    }

    getPlayerActiveSummary() {
        let santaTeam = {}
        let krampusTeam = {}
        for (let key in this.santaTeam) {
            santaTeam[key] = {}
            if (this.santaTeam[key] !== null) santaTeam[key].dclID = this.santaTeam[key].playerAttr.dclID
            else santaTeam[key].dclID = ''

            santaTeam[key].enable = this.playerEnable.SANTA[key]
        }
        for (let key in this.krampusTeam) {
            krampusTeam[key] = {}
            if (this.krampusTeam[key] !== null) krampusTeam[key].dclID = this.krampusTeam[key].playerAttr.dclID
            else krampusTeam[key].dclID = ''

            krampusTeam[key].enable = this.playerEnable.KRAMPUS[key]
        }

        return {
            SANTA: santaTeam,
            KRAMPUS: krampusTeam
        }
    }

    logPlayerActive() {
        console.log('-----CURRENT PLAYER-----')
        for (let key in this.santaTeam) {
            if (this.santaTeam[key] !== null)
                console.log('santa ', key,
                    this.santaTeam[key].playerAttr.dclID,
                    this.santaTeam[key].isConnected,
                    this.playerEnable.SANTA[key]
                )
            else
                console.log('santa', key, null, null, this.playerEnable.SANTA[key])
        }
        for (let key in this.krampusTeam) {
            if (this.krampusTeam[key] !== null)
                console.log('krampus ', key,
                    this.krampusTeam[key].playerAttr.dclID,
                    this.krampusTeam[key].isConnected,
                    this.playerEnable.KRAMPUS[key]
                )
            else
                console.log('krampus', key, null, null, this.playerEnable.KRAMPUS[key])
        }
        console.log('------------------------')
    }

    disablePlayer(_uuID: string) {
        let team, role
        for (let key in this.santaTeam) {
            if (this.santaTeam[key] !== null && this.santaTeam[key].uuID === _uuID) {
                team = TeamType.SANTA
                role = key

                this.playerEnable.SANTA[key] = false

                for (let uuid in this.getConnectedPlayer()) {
                    this.getConnectedPlayer()[uuid].wss.send(JSON.stringify({
                        method: ServerMethod.PLAYERFALL,
                        data: {
                            team: TeamType.SANTA,
                            role: RoleType[key]
                        }
                    }))
                }
                break
            }
        }
        for (let key in this.krampusTeam) {
            if (this.krampusTeam[key] !== null && this.krampusTeam[key].uuID === _uuID) {
                team = TeamType.KRAMPUS
                role = key

                this.playerEnable.KRAMPUS[key] = false

                for (let uuid in this.getConnectedPlayer()) {
                    this.getConnectedPlayer()[uuid].wss.send(JSON.stringify({
                        method: ServerMethod.PLAYERFALL,
                        data: {
                            team: TeamType.KRAMPUS,
                            role: RoleType[key]
                        }
                    }))
                }
                break
            }
        }
    }

    removePlayer(_uuID: string) {
        for (let key in this.santaTeam) {
            if (this.santaTeam[key] !== null && this.santaTeam[key].uuID === _uuID) {
                this.santaTeam[key] = null

                if (!this.isStart) {
                    this.playerEnable.SANTA[key] = true
                }
                else {
                    this.playerEnable.SANTA[key] = false
                }
            }
        }
        for (let key in this.krampusTeam) {
            if (this.krampusTeam[key] !== null && this.krampusTeam[key].uuID === _uuID) {
                this.krampusTeam[key] = null

                if (!this.isStart) {
                    this.playerEnable.KRAMPUS[key] = true
                }
                else {
                    this.playerEnable.KRAMPUS[key] = false
                }
            }
        }
        delete (this.connectedPlayer[_uuID])
    }

    addPlayer(_uuID: string, _player: Player) {
        if (!this.connectedPlayer[_uuID]) {
            this.connectedPlayer[_uuID] = _player
        }
    }
}


function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}  