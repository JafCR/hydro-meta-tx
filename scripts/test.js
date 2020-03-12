const log = require('why-is-node-running') // should be your first require
const ethers = require('ethers')
const HYDRO_API = require('hydro-meta-tx').api
const HYDRO_RELAYER = require('hydro-meta-tx').relayer 


const INFURA_NETWORK = 'kovan'
const INFURA_TOKEN = '22451fcb5a704706b3a6da4a757a1a93'
// const INFURA_NETWORK = undefined
// const INFURA_TOKEN = undefined
const ownerPk = '0x52cc5ff4d4278a74fd5b1405ef9d52a5ef9a7e215973b13f466267870c67287b'
const RELAYER_PORT = 4321

// KOVAN NETWORK ADDRESSES
const REGISTRY_ADDRESS = '0x629FD9a6f179Ed46BCD55d9c209ab6cAa4eC8fe4'
const FACTORY_ADDRESS = '0x04F172096c1Fb1c90eFdFdEA31b85eA4a2532a45'
const TOKEN_ADDRESS = '0xF2cd21Db077Abbc3e6B503d978c828c7c012728a'

// LOCAL ADDRESSES
// const REGISTRY_ADDRESS = '0xe3a027E4c1abb207a3cdE3d6bb55aF7e4fA11650'
// const FACTORY_ADDRESS = '0x29FB6831a3519230AEB915Ff3fE6c48C789D9275'
// const TOKEN_ADDRESS = '0xA2986675d38673c58993EE63741093dC389c1534'


const tokenABI = [
    "function mint(address account, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)"
]
const registryABI = [
    "function triggerRelay(address relay, bool value)  public returns (bool)"
]


const PROVIDER_ADDRESS = 'http://localhost:8545'
async function RunTest() {

    // *********************THIS PART SHOULD BE MANAGED OUTISDE META-TX FUINCTIONALITY */
    // THERE ARE FEW THINGS WHICH HAVE TO BE SET BEFORE META-TX CAN BE USED
    // * deploying contracts. This can be done in truffle framework using migration script
    // * registering relalyer address in RelayerRegistry smart contract
    //   This can be done either in migration script in Truffle or outside. 
    //   Can be only done by contracts creator account
    // * Minting token - To be able to withdraw tokens they first have to be minted or transfered to Client's Smart Wallet. 

    // Create provide to use for out-of meta-tx actions.
       const provider = new ethers.providers.InfuraProvider(INFURA_NETWORK,INFURA_TOKEN)
    // const provider = new ethers.providers.JsonRpcProvider(PROVIDER_ADDRESS)

    // Create ethers owner Wallet. Owner must be the same account which was used by truffle framework to deploy contracts
    let ownerWallet = new ethers.Wallet(ownerPk,provider)

    // Create random account which will receive tokens. This is something which will be provided by the user when he wants to make a transfer/withdrawal
    console.log('Generating receiver account')
    let randomAccount = new ethers.Wallet.createRandom()


    // Here we create random blockchain account to work as relayer. 
    let relayerWallet = ethers.Wallet.createRandom()
    console.log('Create Relayer Wallet. Private key: ', relayerWallet.privateKey)

    // We have to fund our relayer or it will not be able to execute transactions on blockchain 
    console.log('Send some ether to relayer Address.')
    let tx = await ownerWallet.sendTransaction({
        to:relayerWallet.address,
        value:ethers.utils.parseEther('0.05')
    })
    let receipt = await tx.wait(1)

    // Create reallyer instance. This is a service which will listen to meta-tx transactions and execute them on chain
    // If INFURA Network parameters are defined then relayer will use infura provider. If not it will use local RPC provider. 
    let relayerOptions = {
        port:RELAYER_PORT,
        privateKey:relayerWallet.privateKey,
        providerAddress: PROVIDER_ADDRESS,
        infuraNetwork:INFURA_NETWORK,
        infuraAccessToken:INFURA_TOKEN
    }

    // Start Relayer Service
    let RELAYER = new HYDRO_RELAYER()
    await RELAYER.start(relayerOptions)

    // Add relayer address to Relayer Registry. It has to be done or Relayer backend service will be not able to execute meta-tx on blockchain.
    let registryContract = new ethers.Contract(REGISTRY_ADDRESS,registryABI,ownerWallet)
    console.log('Adding new Relayer to Registry. Relayer address: ', relayerWallet.address)
    tx = await registryContract.triggerRelay(relayerWallet.address,true)
    await tx.wait(1)

    // Deploy Meta-Tx instance. This instance creates smart wallets instances for your users. 
    // Just like with RELAYER IT will use infura network if INFURA PARAMETERS ARE PROVIDED. 
    let hydroOptions = {
        factoryAddress: FACTORY_ADDRESS,
        providerAddress: PROVIDER_ADDRESS,
        relayHost: 'http://127.0.0.1:'+ RELAYER_PORT,
        infuraNetwork:INFURA_NETWORK,
        infuraAccessToken:INFURA_TOKEN
    }
    const hydroInstance = new HYDRO_API.default(hydroOptions)


    // Create random account for our user. We don't have to use ethers to create this private key. The only which is important is privateKey and
    // we can get it from any other ethereum library 
    let clientWallet = ethers.Wallet.createRandom()
    console.log('Create Client Wallet. Private Key: ', clientWallet.privateKey)
    
    // Create Hydro-Meta-Tx Smart Wallet instance for our user. All Meta transactions will be signed with this privatekey
    let clientSmartWallet = await hydroInstance.importPrivateKey(clientWallet.privateKey)

    // This function returns Smart Wallet address for our user. This is the address we should monitor for any deposit transactions. 
    // This is the address which owns user's tokens. If we want to transfer any tokens in the name of our user then we have to mint 
    // tokens to this address
    let clientSWAddress = await clientSmartWallet.queryCreate2Address()
    console.log('New Hydro Smart Wallet Instance: ', clientSWAddress)



    // Mint tokens for our new Smart Wallet. Pay attention that we mint to Smart Wallet address and not to Users address.
    // This is not the part of normal Meta-Transaction scenario because user should have those tokens from somewhere else. 
    // We do it only as part of testing scenario
    let tokenContract = new ethers.Contract(TOKEN_ADDRESS,tokenABI,ownerWallet)
    // let nonce = await provider.getTransactionCount(ownerWallet.address,'pending') + 1
    console.log('Minting tokens to virtual client Smart Wallet address: ', clientSWAddress)
    tx = await tokenContract.mint(clientSWAddress,10000)
    await tx.wait(1)
    console.log('Checking balance.')
    let balance = await tokenContract.balanceOf(clientSWAddress)
    console.log('Client Smart Wallet Balance:', balance.toString())


    // This is how we call to execute transfer as meta-transaction. Transaction will be signed by client's private key and then
    // to our relayer service. 
    // First transfer deploys Smart Wallet on blockchain and transfer tokens. It will be more expensive because of deployment cost. 
    await clientSmartWallet.transfer({token:tokenContract.address,to:randomAccount.address,value:'100',fee:'10',gasprice:'1'})
    // Second transfer only makes transfer and it will be less expensive. 
    await clientSmartWallet.transfer({token:tokenContract.address,to:randomAccount.address,value:'100',fee:'10',gasprice:'1'})
    
    // This is just to check if transfer was successfull
    console.log('Checking balance.')
    balance = await tokenContract.balanceOf(randomAccount.address)
    console.log('Receiver Balance:', balance.toString())
    console.log('Provider polling:', RELAYER.provider.polling)

    console.log('Checking Balance  Relayer: ',relayerWallet.address)
    balance = await provider.getBalance(relayerWallet.address)
    console.log('Balance: ', balance.toString())

    // We call RELAYER.stop function to stop our relayer service. This test script will hang if it is not done
    await RELAYER.stop()

    // This is only to check if we have any listeners pending in our script. This is for debugging to see why script hangs. 
    // setTimeout(function () {
    //     log() // logs out active handles that are keeping node running
    //   }, 1000)

}


RunTest()