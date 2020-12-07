import WebSocket = require('ws')
import https = require('https')
import moment = require('moment')

import { GameRoom } from '../gameApp/gameRoom'
import { Game } from '../gameApp/gameModule/game'
import { Player } from '../gameApp/gameModule/player'
import { RoleType, TeamType } from '../appTypes/appType'
import { GameMap } from '../gameApp/gameModule/gameMap'

const { v4: uuidv4 } = require('uuid')


const _HEARTBEATMS: number = 5000

export class WebSocketServer {
    wss: WebSocket.Server
    //server: https.Server

    _HB_INTERVAL: number = _HEARTBEATMS

    /*
    constructor(server: https.Server) {
        this.server = server
        this.wss = new WebSocket.Server({ server })
    }
    */
    constructor(server) {
        this.wss = new WebSocket.Server({ port: 8080 })
    }
    noop() { }
    heartBeat(player: Player) {
        player.isConnected = true
    }
    initHeartBeat(ws: WebSocket, player: Player, game: Game, uuID: string) {
        console.log(player.playerAttr.dclID, 'initiate Heart Beat')
        const interval = setInterval(() => {
            if (player.isConnected) {
                player.isConnected = false
                ws.ping(this.noop)
            }
            else {
                console.log(player.playerAttr.dclID, 'player not alive, terminate connection')
                clearInterval(interval)
                ws.terminate()
                game.removePlayer(uuID)
                game.logPlayerActive()

                player.sendMsg({
                    method: ServerMethod.UPDPLAYER,
                    data: game.getPlayerActiveSummary()
                })
            }
        }, this._HB_INTERVAL)
    }

    async sendMsg(ws: WebSocket, dataMsg: any) {
        ws.send(JSON.stringify(dataMsg))
    }

    start() {
        this.wss.on('connection', (ws, request) => {
            const uuID: string = uuidv4()
            console.log(moment().format('DD-MM-YYYY HH:MM:SS'), '<wss> client trying to connect: ', uuID)
            let room: string = ''
            let game: Game | null = null
            let player = new Player(uuID, ws)

            let initRes = {
                method: ServerMethod.INIT,
                data: uuID
            }
            this.sendMsg(ws, initRes)

            //disconnect if client not response in 2 second
            const initTimeout = setTimeout(() => {
                console.log(moment().format('DD-MM-YYYY HH:MM:SS'), '<wss> no reg msg,drop connecition', uuID)
                ws.close()
            }, 4000)

            ws.on('pong', () => { this.heartBeat(player) })

            ws.on('message', (msgStr: any) => {
                let msg: any = null, method: any = null, data: any = null
                //console.log(moment().format('DD-MM-YYYY HH:MM:SS'), '<wss> raw data', msgStr)

                try {
                    msg = JSON.parse(msgStr)
                    method = msg.method
                    data = msg.data
                }
                catch (err) {
                    console.log(moment().format('DD-MM-YYYY HH:MM:SS'), '<wss> can not parse message', err, uuID)
                    return
                }

                if (method === ClientMethod.REGISTER) {
                    clearTimeout(initTimeout)
                    let registerDate = moment().valueOf()
                    console.log(moment().format('DD-MM-YYYY HH:MM:SS'), '<wss> player register', data.dclID, data.ethAdd, data.realm, data.sceneID)
                    
                    room = data.realm
                    game = GameRoom.getRoom(room)

                    let register = player.registerDclData({
                        dclID: data.dclID,
                        ethAdd: data.ethAdd,
                        realm: data.realm
                    })
                    if (register) {
                        game.addPlayer(uuID, player)
                        this.initHeartBeat(ws, player, game, uuID)
                    }

                    //update player
                    player.sendMsg({
                        method: ServerMethod.UPDPLAYER,
                        data: game.getPlayerActiveSummary()
                    })
                    //update board
                    player.sendMsg({
                        method: ServerMethod.UPDBOARD,
                        data: game.getMap().getBoard()
                    })

                    if (game.isGameStart()) {
                        player.sendMsg({
                            method: ServerMethod.NEWGAME,
                            data: {}
                        })
                    }

                    game.logPlayerActive()
                }
                else {
                    if(room !== '' && game !== null)
                        this.interpretMsg(ws, uuID, msg, game)
                }
            })

        })
    }
    interpretMsg(ws: WebSocket, uuID: string, msg: any, game: Game) {
        let method = msg.method
        let data = msg.data

        switch (method) {
            case ClientMethod.JOIN:
                console.log(data)
                if (game.playerJoin(uuID, data.team, data.role)) {

                    for (let uuid in game.getConnectedPlayer()) {
                        game.getConnectedPlayer()[uuid].wss.send(JSON.stringify({
                            method: ServerMethod.UPDPLAYER,
                            data: game.getPlayerActiveSummary()
                        }))
                    }

                    game.logPlayerActive()
                }
                else {
                    console.log('FAILED REGISTER PLAYER')
                    game.logPlayerActive()
                }

                console.log(game.getPlayerActiveSummary())

                if (game.isPlayerComplete()) {
                    game.startGamePlay()

                    for (let uuid in game.getConnectedPlayer()) {
                        game.getConnectedPlayer()[uuid].wss.send(JSON.stringify({
                            method: ServerMethod.NEWGAME,
                            data: {}
                        }))
                    }
                }

                break

            case ClientMethod.REQGAMESTATE:

                break

            case ClientMethod.MOVEDATA:
                game.updateDataPos(uuID, data)

                break

            case ClientMethod.DESTROY:
                let playerThrow = game.getConnectedPlayer()[uuID].playerAttr.dclID

                let row = Math.floor((data.x - 1.5) / 5)
                let col = Math.floor((data.z - 1.5) / 5)
                let cellNum = RcToCellNum(row, col)

                console.log('get destroy data', playerThrow, data, cellNum)
                game.getMap().logMap()
                if (game.getMap().destroyCell(cellNum)) {
                    console.log('destroy cell: ', cellNum)
                    for (let id in game.getConnectedPlayer()) {
                        if (id !== uuID) {
                            game.getConnectedPlayer()[id].sendMsg({
                                method: ServerMethod.DESTROY,
                                data: {
                                    player: playerThrow,
                                    coor: data
                                }
                            })
                        }
                    }
                }

                break

            case ClientMethod.REPAIR:
                let playerRepair = game.getConnectedPlayer()[uuID].playerAttr.dclID

                let rowR = Math.floor((data.x - 1.5) / 5)
                let colR = Math.floor((data.z - 1.5) / 5)
                let cellNumR = RcToCellNum(rowR, colR)

                console.log('get repair data', playerRepair, data, cellNumR)
                game.getMap().logMap()

                if (game.getMap().repairCell(cellNumR)) {
                    console.log('repair cell: ', cellNumR)
                    for (let id in game.getConnectedPlayer()) {
                        if (id !== uuID) {
                            game.getConnectedPlayer()[id].sendMsg({
                                method: ServerMethod.REPAIR,
                                data: {
                                    player: playerRepair,
                                    coor: data
                                }
                            })
                        }
                    }
                }
                break

            case ClientMethod.FALL:
                let playerFall = game.getConnectedPlayer()[uuID].playerAttr.dclID
                console.log('player fall', playerFall)

                game.disablePlayer(uuID)
                console.log(game.getPlayerActiveSummary())
                break

            case ClientMethod.EMPTYFIRE:

                break

            case ClientMethod.CANCELJOIN:

                break
        }
    }
}


function RcToCellNum(row: number, col: number) {
    return (9 * row + col)
}

export enum ClientMethod {
    REGISTER = 'REG',
    REQGAMESTATE = 'REQ',
    JOIN = 'JOIN',
    RECONNECT = 'RECONN',
    CANCELJOIN = 'CANCELJOIN',

    DESTROY = 'DR',
    REPAIR = 'REP',
    FALL = 'FL',
    EMPTYFIRE = 'EF',

    MOVEDATA = 'D'
}

export enum ServerMethod {
    MESSAGE = 'MESSAGE',

    UPDPLAYER = 'UPDPLAYER',
    UPDBOARD = 'UPDBOARD',
    UPDTURN = 'UPDTURN',

    RESET = 'RESET',
    NEWGAME = 'NEWGAME',
    ENDGAME = 'ENDGAME',
    INIT = 'INIT',

    UPDPOS = 'UP',

    PLAYERFALL = 'FA',

    DESTROY = 'DR',
    RANDOMDESTROY = 'RD',
    REPAIR = 'REP'
}