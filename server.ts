import path = require('path')
import fs = require('fs')
import http = require('http')
import https = require('https')

import express = require('express')
import { app } from "./appmodules/httpApp/app"
import { WebSocketServer } from "./appmodules/wssApp/websocketServer"

/*
//SSL FOR DEPLOYMENT
const deployment_options = {
    key: fs.readFileSync(path.join(__dirname, '../ssl/deployment/privkey.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../ssl/deployment/certificate.pem')),
    ca: fs.readFileSync(path.join(__dirname, '../ssl/deployment/ca.pem'))
}


//SSL SELF SIGN CERT FOR LOCAL TEST
const local_options = {
    key: fs.readFileSync(path.join(__dirname, '../ssl/selfsigned/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../ssl/selfsigned/cert.pem')),
}

//for certificate validation ZeroSSL//
const validationPath = path.join(__dirname, '/../.well-known')
app.use('/.well-known', express.static(validationPath))
*/

const port = 443

//const httpServer = http.createServer(app).listen(80)

/*
const httpsServer = https.createServer(local_options, app).listen(port, function () {
    console.log("Express server listening on port " + port)
})
*/

//const wssServer = new WebSocketServer(httpsServer)

const wssServer = new WebSocketServer(8080)
wssServer.start()
