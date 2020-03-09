**Based on** [https://github.com/Lamarkaz/Metacash-contracts](https://github.com/Lamarkaz/Metacash-contracts) 


Hydro-Meta-Tx is an API module to run gasless transaction using Meta-Tx concept introduced by Lamarkaz team. This module was modified and updated to suit Hydro team requirements. 

There are two modules in this module:
* api - API module which will create ethers wallets and call  gasless transactions on SmartWallet contract.
* relayer - Backend process processing transactions from API module and executing them on blockchain as relayer account in the name of an account which used API module. 


**How to install**

`npm install hydro-meta-tx`

**How to use API**

```
const HydroTxAPI = require('hydro-meta-tx').api

hydro = new HydroTxAPI.default({
    factoryAddress: factoryInstance.address,
    fee:'1000',
    gasprice:'10',
    providerAddress:'http://localhost:8545',
    relayHost: 'http://127.0.0.1:4000'
})

keyString = await fs.readFileSync('./test/keystring')
clientSmartWallet = await hydro.importSmartWallet(keyString.toString(), 'test test test')

let value = 100
let to = accounts[3]
let token = tokenInstance.address
let decimals = 0

let response = await clientSmartWallet.transfer({ token, decimals, to, value })
```
__HydroTxAPI.constructor(options)__

Creates HydroTxAPI instance. This object allows to create and import existing instances of ethers wallet and SmartWallet
Following options are required:

* factoryAddress - address of Factory Smart Contract to use to deploy new Smart Contracts
* fee - default amount of tokens to be transfered for each transaction (Should be removed)
* gasprice - gas price value in [gwei]
* providerAddress - ethereum blockchain node address to be used as an input to

    `new ethers.providers.JsonRpcProvider(this.options.providerAddress)`

* relayHost - hostname and port number of relayer backend process


### How to use Relayer

```
const Relayer = require('hydro-meta-tx').relayer
let relayer = new Relayer()
const PORT = 4000
relayer.start(PORT)

```

This will start relayer process on this machine listening on local port 4000