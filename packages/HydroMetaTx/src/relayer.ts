const express = require('express')
const routes = require('./routes.js')
const bodyParser = require('body-parser')
const Logger = require('./logger.js')

import * as Verify from './verify.js'
import { ethers } from 'ethers'
class Relayer {

    logger:any

    async getProvider({providerAddress,infuraNetwork,infuraAccessToken}):Promise<any> {
        var provider:any 
        this.logger.debug("Relayer","Provider configuration",{providerAddress,infuraNetwork,infuraAccessToken})

        if(infuraNetwork) {
            provider = new ethers.providers.InfuraProvider(infuraNetwork,infuraAccessToken)
        }
        else {
            provider = new ethers.providers.JsonRpcProvider(providerAddress)
        }
        
        let network = await provider.getNetwork()
        console.log('Network: ', network)
        return provider
    }

    async start({port,privateKey,providerAddress,infuraNetwork,infuraAccessToken}:Relayer.Constructor,loggerOptions:Logger.Options):Promise<Express.Application> {
        this.logger = new Logger(loggerOptions).getLogger()
        let verified = Verify.relayerConstructor({port,privateKey,providerAddress,infuraNetwork,infuraAccessToken})
        if (!verified) {
            throw('Relayer Constructor Error') 
        }
        var provider = await this.getProvider({providerAddress,infuraNetwork,infuraAccessToken})

        console.log('Starting Relayer at port:', port)
        const app = express()
        app.use(bodyParser.urlencoded({ extended: true }))
        app.use(bodyParser.json())
        app.all('*',(req,res,next)=>{
            this.logger.info(`NEW REQUEST ${req.method} ${req.originalUrl}`)
            this.logger.debug(`PARAMS: ${JSON.stringify(req.params)}`)
            this.logger.debug(`BODY: ${JSON.stringify(req.body)}`)
            req.provider = provider
            req.privateKey = privateKey
            req.logger = this.logger
            req.next()

        })
        // app.use(bodyParser.raw())
        app.use(routes)
        return app.listen(port)

    }
}

module.exports = Relayer


