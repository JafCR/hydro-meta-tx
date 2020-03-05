// ARTIFACTS

var RelayRegistry = artifacts.require('RelayRegistry')
var Factory = artifacts.require('Factory')
var SmartWallet = artifacts.require('SmartWallet')
var TestERC20 = artifacts.require('TestERC20')
var Proxy = artifacts.require('Proxy')
const eth = require('ethereumjs-util')
const Metacash = require('../../BackendAPI/lib/index.js')
const fs = require('fs')
const ethers = require('ethers')

var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
var BN = require('bignumber.js')
var sleep = require('sleep')

chai.use(chaiAsPromised)
expect = chai.expect
var should = require('chai').should()

var relayAccount
var rrInstance
var factoryInstance
var clientWallet
var SWTemplate
var predictedAddress
var metacash
var tokenInstance

contract('Deployment Test', async accounts => {
  relayAccount = accounts[9]

  before(async () => {
    SWTemplate = await SmartWallet.new()
    console.log('   Smart Wallet Template Addres: ', SWTemplate.address)
  })

  it('01. Deploy RelayRegistry', async () => {
    rrInstance = await RelayRegistry.new(relayAccount)
    console.log(`   Registry address: ${rrInstance.address}`)
    should.not.equal(rrInstance, undefined)
  })

  it('02. Deploy Factory', async () => {
    factoryInstance = await Factory.new(rrInstance.address, SWTemplate.address)

    // Make sure that Factory has been created.
    console.log(`   Factory address: ${factoryInstance.address}`)
    should.not.equal(factoryInstance, undefined)

    // Check if relay registry is correct.
    let rrAddress = await factoryInstance.registry()
    expect(rrAddress).to.be.equal(rrInstance.address)
  })

  it('03. Add Relayer to Relayer Registry', async () => {
    keyString = await fs.readFileSync('./test/keystringRelayer')
    let keystore = JSON.parse(keyString.toString())
    let adr = '0x' + keystore.address
    console.log('   Relayer Address: ', ethers.utils.getAddress(adr))

    // Create Metacash instance.
    metacash = new Metacash.default({
      factory: factoryInstance.address,
      relayer: adr,
    })

    walletRelayer = await metacash.decryptWallet(
      keyString.toString(),
      'test test test',
    )

    await rrInstance.triggerRelay(walletRelayer.address, true)
    let accepted = await rrInstance.relays(walletRelayer.address)
    expect(accepted).to.be.true
    console.log('   Relayer Address: ', walletRelayer.address)
    console.log('   Private Key: ', walletRelayer.privateKey)

    let wei = web3.utils.toWei('1', 'ether').toString()
    console.log('Wei:', wei)
    await web3.eth.sendTransaction({
      from: accounts[4],
      to: walletRelayer.address,
      value: wei,
    })

    let balance = await web3.eth.getBalance(walletRelayer.address)
    console.log('Balance Relayuer: ', balance)
  })

  it('04. Create user wallet and generate Smart Wallet address', async () => {
    keyString = await fs.readFileSync('./test/keystring')
    clientWallet = await metacash.import(keyString.toString(), 'test test test')

    console.log('   Client Address: ', clientWallet.keystore.address)
    predictedAddress = await clientWallet.queryCreate2Address()
    console.log('   Smart Wallet Predicted Address: ', predictedAddress)
  })

  it('05. Deploy ERC20 Token and Mint 100 000 tokens to predicted address', async () => {
    let tokensToMint = '100000'
    tokenInstance = await TestERC20.new()
    console.log('   Token Address:', tokenInstance.address)
    await tokenInstance.mint(predictedAddress, tokensToMint)

    let balance = await tokenInstance.balanceOf(predictedAddress)
    console.log('   Balance: ', balance.toNumber())
    expect(balance.toString()).to.be.equal(tokensToMint)
  })

  it('06. Ask Relayer to deploy and transfer tokens from client accounts to some other account.', async () => {
    let value = 100
    let to = accounts[3]
    let token = tokenInstance.address
    let decimals = 1

    let provider = new ethers.providers.JsonRpcProvider()
    let keyString = await fs.readFileSync('./test/keystring')
    let wallet = await metacash.decryptWallet(
      keyString.toString(),
      'test test test',
    )
    wallet = wallet.connect(provider)

    await clientWallet.transfer({ token, decimals, to, value, wallet })
  })

  return
  it('05. Create Token Instance and Mint 1000 tokens to predicted Smart Wallet Address ', async () => {
    predictedAddress = await factoryInstance.getCreate2Address(accounts[0], {
      from: accounts[0],
    })
    let tx = await factoryInstance.deployWallet()
    let walletAddress = tx.logs[0].args.addr
    console.log('   Wallet    Address: ', walletAddress)
    console.log('   Predicted Address: ', predictedAddress)

    expect(walletAddress).to.be.equal(predictedAddress)

    let instance = await SmartWallet.at(walletAddress)

    let factory = await instance.store(web3.utils.fromAscii('factory'))
    console.log('Factory:', factory)

    factory = await instance.factory()
    console.log('Factory:', factory)

    let registry = await instance.registry()
    console.log('Registry:', registry)
    expect(registry).to.be.equal(relayInstance.address)

    // should.not.equal(walletInstance, undefined)

    // let relayAddress = await walletInstance.registry()
    // expect(relayAddress).to.be.equal(relayInstance.address)
  })
})
