***Based on [https://github.com/Lamarkaz/Metacash-contracts](https://github.com/Lamarkaz/Metacash-contracts)***

# HYDRO META TRANSACTIONS

Hydro-Meta-Tx is an API module to run gasless transaction using Meta-Tx concept introduced by Lamarkaz team. This module was modified and updated to suit Hydro team requirements. 

There are two modules in this module:
* api - API module which will create ethers wallets and call  gasless transactions on SmartWallet contract.
* relayer - Backend process processing transactions from API module and executing them on blockchain as relayer account in the name of an account which used API module. 


## HOW TO INSTALL

`npm install hydro-meta-tx`

## HOW TO USE API

```
const HydroTxAPI = require('hydro-meta-tx').api

hydro = new HydroTxAPI.default({
    factoryAddress: factoryInstance.address,
    fee:'1000',
    gasprice:'10',
    providerAddress:'http://localhost:8545',
    relayHost: 'http://127.0.0.1:4000'
})

await hydro.init()

keyString = await fs.readFileSync('./test/keystring')
clientSmartWallet = await hydro.importSmartWallet(keyString.toString(), 'test test test')

let value = 100
let to = accounts[3]
let token = tokenInstance.address
let decimals = 0

let response = await clientSmartWallet.transfer({ token, decimals, to, value })


```


### HydroTxAPI.constructor(options)

Creates HydroTxAPI instance. This object allows to create and import existing instances of ethers wallet and SmartWallet
Following options are required:

* factoryAddress - address of Factory Smart Contract to use to deploy new Smart Contracts
* fee - default amount of tokens to be transfered for each transaction (Should be removed)
* gasprice - gas price value in [gwei]
* providerAddress - ethereum blockchain node address to be used as an input to

    `new ethers.providers.JsonRpcProvider(this.options.providerAddress)`

* relayHost - hostname and port number of relayer backend process

###  async createSmartWallet(password: string) 

Creates new Ethers wallet account and new Smart Wallet instance for this account.

* password - string used to encrypt new account keystore. It will be impossible to decrypt account keystore without it and access to Smart Wallet contract and tokens will be lost. 

Returns result object:

* result.keystore - encrypted ethers wallet keystore
* result.smartWallet - Hydro Smart Wallet instance to be used to call transfer function
* result.account - ethers wallet instance

###  async importSmartWallet(keystore: string, password: string) 

Creates Smart Wallet instance using provided keystore and password. New keystore can be generated using createSmartWallet function or createAccount function.

* keystore - ethers wallet keystore
* password - password used to decrypt keystore

Returns:

* Smart Wallet Instance

### async importAccount(keystore: string,password: string)

Returns ethers wallet instance based on provided keystore and password

 ### async createAccount(password: string)

 Creates new random blockchain account and returns ethers wallet instance and encrypted keystore

 Returns: 

 * result.account - ethers wallet instance
 * result.keystore - encrypted keystore


 ### SmartWallet.transfer({token,decimals,to,value,})

 Sends transfers transaction to relayerAPI. This function will sign function call message using this instance ethers wallet. 

 Input:

 * token - token address for which to execute a transfer
 * decimals - number of decimals of this token ( soon to be deprecated )
 * to - address of the receiving account
 * value - token amount to be transfered to *to* address 
 
 Returns answer from relayer backend server. 

## HOW TO USE RELAYER

```
const Relayer = require('hydro-meta-tx').relayer
let relayer = new Relayer()
const PORT = 4000
relayer.start(PORT)

```

This will start relayer process on this machine listening on local port 4000



