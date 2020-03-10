// ARTIFACTS

var RelayRegistry = artifacts.require('RelayRegistry')
var Factory = artifacts.require('Factory')
var SmartWallet = artifacts.require('SmartWallet')
var TestERC20 = artifacts.require('TestERC20')
var Proxy = artifacts.require('Proxy')
const eth = require('ethereumjs-util')
const HydroTxAPI = require('hydro-meta-tx').api
const fs = require('fs')
const ethers = require('ethers')

var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')

chai.use(chaiAsPromised)
expect = chai.expect
var should = require('chai').should()

var relayAccount
var rrInstance
var factoryInstance
var SWTemplate
var predictedAddress
var hydro
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
    hydro = new HydroTxAPI.default({
      factoryAddress: factoryInstance.address,
      fee:'1000',
      gasprice:'10',
      providerAddress:'http://localhost:8545',
      relayHost: 'http://127.0.0.1:4000'
    })

    walletRelayer = await hydro.importAccount(
      keyString.toString(),
      'test test test',
    )

    await rrInstance.triggerRelay(walletRelayer.address, true)
    let accepted = await rrInstance.relays(walletRelayer.address)
    expect(accepted).to.be.true
    console.log('   Relayer Address: ', walletRelayer.address)
    console.log('   Private Key: ', walletRelayer.privateKey)

    let wei = web3.utils.toWei('1', 'ether').toString()
    console.log('   Wei:', wei)
    await web3.eth.sendTransaction({
      from: accounts[4],
      to: walletRelayer.address,
      value: wei,
    })

    let balance = await web3.eth.getBalance(walletRelayer.address)
    console.log('   Balance Relayer: ', balance)
  })

  it('04. Create user wallet and generate Smart Wallet address', async () => {
    keyString = await fs.readFileSync('./test/keystring')
    clientSmartWallet = await hydro.importKeyStore(keyString.toString(), 'test test test')
    let signer = clientSmartWallet.address
    console.log('Signer: ', signer)
    // predictedAddress = await factoryInstance.getCreate2Address(signer)
    predictedAddress = await clientSmartWallet.queryCreate2Address()
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
    let decimals = 0

    let before = []
    let after = [] 
    before['wallet'] = await tokenInstance.balanceOf(predictedAddress)
    before['relayer'] = await tokenInstance.balanceOf(walletRelayer.address)
    before['receiver'] = await tokenInstance.balanceOf(accounts[3])
    
    let response = await clientSmartWallet.transfer({ token, decimals, to, value })
    console.log(response.data)
    value = value * 3
    response = await clientSmartWallet.transfer({ token, decimals, to, value })
    console.log(response.data)

    after['wallet'] = await tokenInstance.balanceOf(predictedAddress)
    after['relayer'] = await tokenInstance.balanceOf(walletRelayer.address)
    after['receiver'] = await tokenInstance.balanceOf(accounts[3])

    console.log('           Wallet | Relayer | Receiver')
    console.log(`Before:    ${before['wallet']}  ${before['relayer']}  ${before['receiver']}`)
    console.log(`After:     ${after['wallet']}  ${after['relayer']}  ${after['receiver']}`)

  })
 
})
