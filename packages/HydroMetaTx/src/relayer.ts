const express = require('express')
const routes = require('./routes.js')
const bodyParser = require('body-parser')
const Logger = require('./logger.js')

import * as Verify from './verify.js'
class Relayer {

    logger:any
    start({port,privateKey,providerAddress}:Relayer.Constructor,loggerOptions:Logger.Options):Express.Application {
        this.logger = new Logger(loggerOptions).getLogger()
        let verified = Verify.relayerConstructor({port,privateKey,providerAddress})
        if (!verified) {
            throw('Relayer Constructor') 
        }

        console.log('Starting Relayer at port:', port)
        const app = express()
        app.use(bodyParser.urlencoded({ extended: true }))
        app.use(bodyParser.json())
        app.all('*',(req,res,next)=>{
            this.logger.info(`NEW REQUEST ${req.method} ${req.originalUrl}`)
            this.logger.debug(`PARAMS: ${JSON.stringify(req.params)}`)
            this.logger.debug(`BODY: ${JSON.stringify(req.body)}`)
            req.privateKey = privateKey
            req.next()

        })
        // app.use(bodyParser.raw())
        app.use(routes)
        return app.listen(port)

    }
}

module.exports = Relayer


