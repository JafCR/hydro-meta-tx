const express = require('express')
const routes = require('./routes.js')
const bodyParser = require('body-parser')
const logger = require('./logger.js')
class Relayer {

    start(port,privateKey) {

        if(privateKey === undefined) {
            console.log('Private Key not defined. Error.')    
            return null
        }
        console.log('Starting Relayer at port:', port)
        const app = express()
        app.use(bodyParser.urlencoded({ extended: true }))
        app.use(bodyParser.json())
        app.all('*',(req,res,next)=>{
            logger.info(`NEW REQUEST ${req.method} ${req.originalUrl}`)
            logger.debug(`PARAMS: ${JSON.stringify(req.params)}`)
            req.privateKey = privateKey
            req.logger = logger
            req.next()

        })
        // app.use(bodyParser.raw())
        app.use(routes)
        return app.listen(port)

    }
}

module.exports = Relayer


