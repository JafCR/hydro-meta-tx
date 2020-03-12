
const Logger = require('./logger.js')
import * as ethers from 'ethers'
const logger = new Logger().getLogger()


export function relayerConstructor({port,privateKey,providerAddress}: Relayer.Constructor): boolean {

    let name = "Relayer Constructor"
    let result: boolean = true
    if (port === undefined || port <= 0) {
        result = false
        logger.fatal(name, "Port is not defined or is wrong. Port: ", port)
    }

    if (privateKey === undefined) {
        result = false
        logger.fatal(name, "Private key is not defined")
    }
    
    try{
        new ethers.Wallet(privateKey)
    }
    catch (e) {
        result = false
        logger.fatal(name, "Invalid private key", e)
    }

    if (providerAddress === undefined) {
        result = false
        logger.fatal(name, "Provider address is not defined")
    }

    try {
        // new ethers.providers.InfuraProvider(providerAddress)
        let provider = ethers.getDefaultProvider('ropsten')
        console.log(provider)
    } catch(e) {
        logger.fatal('Incorrect provider address: ', providerAddress,e)

    }


    return  result
}


export function hydroConstructor(request: Hydro.Constructor): boolean {

    let name = "Hydro Constructor"
    let result: boolean = true
    if (request.factoryAddress === undefined) {
        result = false
        logger.error(name, "factoryAddress is not defined")
    }

    if (request.providerAddress === undefined) {
        result = false
        logger.error(name, "providerAddress is not defined")
    }

    if (request.relayHost === undefined) {
        result = false
        logger.error(name, "relayHost is not defined")
    }

    return result
}

export function walletConstructor(request: Wallet.Constructor): boolean {
    let name = "Wallet Constructor"
    let result: boolean = true
    if (request.factoryAddress === undefined) {
        result = false
        logger.error(name, "factoryAddress is not defined")
    }

    if (request.providerAddress === undefined) {
        result = false
        logger.error(name, "providerAddress is not defined")
    }

    if (request.relayHost === undefined) {
        result = false
        logger.error(name, "relayHost is not defined")
    }

    return result
}

export function deploySend(request: Routes.TransferRequest): boolean {
    let name = "/deploySend"
    let result: boolean = true
    if (request.fee === undefined) {
        logger.error(name, 'Fee is not defined')
        result = false
    }

    if (request.gasprice === undefined || parseInt(request.gasprice) == 0) {
        logger.error(name, 'Gas price is not defined or zero')
        result = false
    }

    if (request.to === undefined) {
        logger.error(name, 'Gas price is not defined or zero')
        result = false
    }

    try {
        ethers.utils.getAddress(request.to)
    }
    catch (e) {

        result = false
        logger.error(name, 'Wrong _to_ address.')
    }

    if (request.token == undefined) {
        result = false
        logger.error(name, 'Token is not defined')
    }

    try {
        ethers.utils.getAddress(request.token)
    }
    catch (e) {

        result = false
        logger.error(name, 'Wrong _token_ address.')
    }

    if (request.value === undefined || parseInt(request.value) == 0) {
        result = false
        logger.error(name, 'Value is not defined')
    }

    return result
}