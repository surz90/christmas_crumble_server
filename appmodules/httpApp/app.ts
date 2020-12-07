import moment = require('moment')
import express = require('express')
import path = require('path')
import { GameRoom } from '../gameApp/gameRoom'

export const app = express()


app.all('*', function (req, res, next) {
    if ((req.protocol !== 'https')) {
        res.redirect('https://' + req.get('Host') + req.url)
    } else
        next()
})

app.get('/', function (req, res) {
    res.send("GAME JAM 2020")
})

app.get('/allgames', function (req, res) {
    res.send(GameRoom.listAllRoom())
})

app.get('/allplayers', function (req, res) {
    res.send(GameRoom.listAllRoomAndPlayer())
})

app.get('/gamestates', function (req, res) {
})
