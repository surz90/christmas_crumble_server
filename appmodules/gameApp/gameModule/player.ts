import WebSocket = require('ws')
import moment = require('moment')

import { PlayerAttributes, PlayerStatus } from "../../appTypes/appType"
import { DataPos } from './game'


export class Player {
    uuID!: string
    wss!: WebSocket
    isConnected: boolean = true //don't set this variable
    playerAttr!: PlayerAttributes
    dataPos!: DataPos

    constructor(uuID: string, wss: WebSocket) {
        this.uuID = uuID
        this.wss = wss
    }

    registerDclData(playerAttr: PlayerAttributes) {
        try {
            this.playerAttr = playerAttr
            console.log('success register player: ', playerAttr.dclID)
            return true
        }
        catch (err) {
            console.log('cannot register player: ', err)
            return false
        }
    }

    async sendMsg(data: any) {
        try {
            if (this.wss.readyState === WebSocket.OPEN) this.wss.send(JSON.stringify(data))
        }
        catch (err) {
            console.log(moment().format('DD-MM-YYYY HH:MM'), 'can not send data to player', this.uuID, this.playerAttr.dclID)
            console.log(err)
        }
    }
}