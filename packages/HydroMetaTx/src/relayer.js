const express = require('express')
const router = require('./routes.js')
const bodyParser = require('body-parser')

class Relayer {

    start(port) {
        const app = express()
        app.use(bodyParser.urlencoded({ extended: true }))
        app.use(bodyParser.json())
        // app.use(bodyParser.raw())
        app.get('*',(req,res)=>{
            console.log('GET REQUEST')
            console.log(req.originalUrl)
            console.log(req.params)
            req.next()
        })
        app.post('*',(req,res)=>{
            console.log('POST REQUEST')
            console.log(req.originalUrl)
            console.log(req.body)
            req.next()
        })
        app.use(router)
        app.listen(port)
    }
}

module.exports = Relayer


