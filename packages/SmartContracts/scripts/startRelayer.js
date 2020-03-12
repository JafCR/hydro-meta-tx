const Relayer = require('hydro-meta-tx').relayer
const port = 4000
let relayer = new Relayer()
let privateKey = '0x52cc5ff4d4278a74fd5b1405ef9d52a5ef9a7e215973b13f466267870c67287b'
let providerAddress ="http://localhost:8545"
let infuraNetwork = 'kovan'
let infuraAccessToken = '22451fcb5a704706b3a6da4a757a1a93'
const loggerOptions = {
    prefix:"",
    directory:"",
    // level:"debug"
    level:"info"
}

async function StartProvider() {

    await relayer.start({port,privateKey,providerAddress,infuraNetwork,infuraAccessToken}, loggerOptions)
    // await relayer.start({port,privateKey,providerAddress}, loggerOptions)
}

StartProvider()
