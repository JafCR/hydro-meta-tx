var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
var BN = require('bignumber.js')
var sleep = require('sleep')
const fs = require('fs')
var ethers = require('ethers')
var Contract = ethers.Contract

var Metacash = require('../lib/index.js')

chai.use(chaiAsPromised)
expect = chai.expect
var should = require('chai').should()
var keyString
var walletRelayer
describe('Test', async function(accounts) {
  this.timeout(10000)
  before(async () => {})

  it('01. Test1', async () => {
    let metacash = new Metacash.default({
      factory: '0xfF31D05ADFfe69793C6E29Ec87d299262Dd89a82',
    })
    // console.log(metacash)

    keyString = await fs.readFileSync('./test/keystringRelayer')
    walletRelayer = await metacash.decryptWallet(
      keyString.toString(),
      'test test test',
    )

    console.log('Wallet Relayer:', keyString.toString())
  })

  it('01. Test1', async () => {
    let metacash = new Metacash.default({
      factory: '0xfF31D05ADFfe69793C6E29Ec87d299262Dd89a82',
    })
    // console.log(metacash)
    keyString = await fs.readFileSync('./test/keystring')
    // keyString = JSON.parse(keyString)
    console.log('Keystring: ', keyString.toString())
    let w = await metacash.import(keyString.toString(), 'test test test')
    let canDeploy = await w.canDeploy()
    await console.log(canDeploy)

    let adr = await w.queryCreate2Address()
    console.log('User address:', adr)

    // Execute transfer with signature\
    let token = '0xbf6d0EC63A461644620A0D409e4E50423C76b2De'
    let decimals = 1
    let to = '0x1817cEE4F51DA37a10ae31b35b27921f96c82942'
    let value = 100
    let wallet = await metacash.decryptWallet(
      keyString.toString(),
      'test test test',
    )
    let request = await w.transfer({ token, decimals, to, value, wallet })
    console.log('Request: ', request)
    let r = request

    let provider = new ethers.providers.JsonRpcProvider('http://localhost:8545')
    const factoryAbi = [
      'function deployWallet(uint fee, address token, address to, uint value, uint8 v, bytes32 r, bytes32 s) returns (address)',
      'function canDeploy(address owner) view returns (bool inexistent)',
      'function getCreate2Address(address owner) view returns (address)',
    ]
    let factory = '0xfF31D05ADFfe69793C6E29Ec87d299262Dd89a82'
    // let txWallet = new ethers.Wallet(
    //   '0x6ea1359d6a9b3c1a5b27be937cc67c08bc1c6387e739cc272846c017e3225341',
    //   provider,
    // )
    let txWallet = ethers.Wallet.fromMnemonic(
      'radar screen inform wet siren invest crater size spread arm area remember',
    )
    console.log(provider)
    txWallet = txWallet.connect(provider)
    // let balance = await txWallet.getBalance()
    let balance = await provider.getBalance(txWallet.address)

    console.log(balance.toString())

    let factoryContract = new Contract(factory, factoryAbi, txWallet)
    let sig = ethers.utils.splitSignature(request.sig)

    let wadr = await factoryContract.deployWallet(
      r.fee,
      r.token,
      r.to,
      r.value,
      sig.v,
      sig.r,
      sig.s,
    )
  })
})
