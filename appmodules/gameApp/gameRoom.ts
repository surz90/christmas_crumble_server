import { Game } from "./gameModule/game"

export const GameRoom = (function () {
    let gameRoomList: { [key: string]: Game } = {}

    return {
        listAllRoom() {
            let roomList: { [key: string]: any[] } = {}
            for (let key in gameRoomList) {
                roomList[key] = []
                roomList[key].push(gameRoomList[key].isGameActive())
            }
            return roomList
        },
        listAllRoomAndPlayer() {
            let roomAndPlayerList: { [key: string]: string[] } = {}

            for (let roomkey in gameRoomList) {

                let connectedPlayer = gameRoomList[roomkey].getConnectedPlayer()
                roomAndPlayerList[roomkey] = []

                for (let plyrkey in connectedPlayer) {
                    roomAndPlayerList[roomkey].push(connectedPlayer[plyrkey].playerAttr.dclID)
                }
            }

            return roomAndPlayerList
        },

        getAllRoom() {
            return gameRoomList
        },
        getRoom(room: string) {
            if (!gameRoomList[room]) {
                console.log('<game room> create new room: ', room)
                gameRoomList[room] = new Game()
            }
            else {
                console.log('<game room> player join room: ', room)
            }
            return gameRoomList[room]
        }
    }
})()