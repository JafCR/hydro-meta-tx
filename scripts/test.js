const ethers = require('ethers')
const HYDRO_API = require('hydro-meta-tx').api
const HYDRO_RELAYER = require('hydro-meta-tx').relayer 

// const INFURA_NETWORK = 'kovan'
// const INFURA_TOKEN = '22451fcb5a704706b3a6da4a757a1a93'
const INFURA_NETWORK = undefined
const INFURA_TOKEN = undefined
const ownerPk = '0x52cc5ff4d4278a74fd5b1405ef9d52a5ef9a7e215973b13f466267870c67287b'
const RELAYER_PORT = 4321

// const REGISTRY_ADDRESS = '0x629FD9a6f179Ed46BCD55d9c209ab6cAa4eC8fe4'
// const FACTORY_ADDRESS = '0x04F172096c1Fb1c90eFdFdEA31b85eA4a2532a45'
// const TOKEN_ADDRESS = '0xF2cd21Db077Abbc3e6B503d978c828c7c012728a'
const REGISTRY_ADDRESS = '0xe3a027E4c1abb207a3cdE3d6bb55aF7e4fA11650'
const FACTORY_ADDRESS = '0x29FB6831a3519230AEB915Ff3fE6c48C789D9275'
const TOKEN_ADDRESS = '0xA2986675d38673c58993EE63741093dC389c1534'

const PROVIDER_ADDRESS = 'http://localhost:8545'
async function RunTest() {

    // const provider = new ethers.providers.InfuraProvider(INFURA_NETWORK,INFURA_TOKEN)
    const provider = new ethers.providers.JsonRpcProvider(PROVIDER_ADDRESS)
    const tokenABI = [
        "function mint(address account, uint256 amount) public returns (bool)",
        "function balanceOf(address account) public view returns (uint256)"
    ]
    const registryABI = [
        "function triggerRelay(address relay, bool value)  public returns (bool)"
    ]

    let ownerWallet = new ethers.Wallet(ownerPk,provider)

    let relayerWallet = ethers.Wallet.createRandom()
    console.log('Create Relayer Wallet. Private key: ', relayerWallet.privateKey)
    let relayerOptions = {
        port:RELAYER_PORT,
        privateKey:relayerWallet.privateKey,
        providerAddress: PROVIDER_ADDRESS,
        infuraNetwork:INFURA_NETWORK,
        infuraAccessToken:INFURA_TOKEN
    }
    let RELAYER = new HYDRO_RELAYER()
    let relayerInstance = await RELAYER.start(relayerOptions)


    let hydroOptions = {
        factoryAddress: FACTORY_ADDRESS,
        providerAddress: PROVIDER_ADDRESS,
        relayHost: 'http://127.0.0.1:'+RELAYER_PORT,
        infuraNetwork:INFURA_NETWORK,
        infuraAccessToken:INFURA_TOKEN
    }
    const hydroInstance = new HYDRO_API.default(hydroOptions)

    let clientWallet = ethers.Wallet.createRandom()
    console.log('Create Client Wallet. Private Key: ', clientWallet.privateKey)
    
    let clientSmartWallet = await hydroInstance.importPrivateKey(clientWallet.privateKey)
    let clientSWAddress = await clientSmartWallet.queryCreate2Address()
    console.log('New Hydro Smart Wallet Instance: ', clientSWAddress)


    let registryContract = new ethers.Contract(REGISTRY_ADDRESS,registryABI,ownerWallet)
    console.log('Adding new Relayer to Registry. Relayer address: ', relayerWallet.address)
    await registryContract.triggerRelay(relayerWallet.address,true)

    let tokenContract = new ethers.Contract(TOKEN_ADDRESS,tokenABI,ownerWallet)
    console.log('Minting tokens to virtual client Smart Wallet address: ', clientSWAddress)
    await tokenContract.mint(clientSWAddress,10000)
    console.log('Checking balance.')
    let balance = await tokenContract.balanceOf(clientSWAddress)
    console.log('Client Smart Wallet Balance:', balance.toString())

    console.log('Send some ether to relayer Address.')
    await ownerWallet.sendTransaction({
        to:relayerWallet.address,
        value:ethers.utils.parseEther('0.1')
    })
    console.log('Checking Balance of New Relayer: ',relayerWallet.address)
    balance = await provider.getBalance(relayerWallet.address)
    console.log('Balance: ', balance.toString())
    
    console.log('Generating receiver account')
    let randomAccount = new ethers.Wallet.createRandom()
    await clientSmartWallet.transfer({token:tokenContract.address,to:randomAccount.address,value:'100',fee:'10',gasprice:'1'})
    await clientSmartWallet.transfer({token:tokenContract.address,to:randomAccount.address,value:'100',fee:'10',gasprice:'1'})
    
    console.log('Checking balance.')
    balance = await tokenContract.balanceOf(randomAccount.address)
    console.log('Receiver Balance:', balance.toString())
    
    await relayerInstance.close()
}


RunTest()