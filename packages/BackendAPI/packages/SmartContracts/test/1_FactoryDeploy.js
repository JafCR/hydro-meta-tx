// ARTIFACTS

var RelayRegistry = artifacts.require('RelayRegistry')
var Factory = artifacts.require('Factory')
var SmartWallet = artifacts.require('SmartWallet')
var TestERC20 = artifacts.require('TestERC20')
var Proxy = artifacts.require('Proxy')
const eth = require('ethereumjs-util')

var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
var BN = require('bignumber.js')
var sleep = require('sleep')

chai.use(chaiAsPromised)
expect = chai.expect
var should = require('chai').should()

var relayAccount
var relayInstance
var factoryInstance
var walletInstance
var SWTemplate

contract('Deployment Test', async accounts => {
  relayAccount = accounts[9]

  before(async () => {
    SWTemplate = await SmartWallet.new()
    console.log('Smart Wallet Template Address: ', SWTemplate.address)
  })

  it('01. Deploy RelayRegistry', async () => {
    relayInstance = await RelayRegistry.new(relayAccount)
    console.log(`Registry address: ${relayInstance.address}`)
    should.not.equal(relayInstance, undefined)
  })

  it('02. Deploy Factory', async () => {
    factoryInstance = await Factory.new(
      relayInstance.address,
      SWTemplate.address,
    )
    console.log(`Factory address: ${factoryInstance.address}`)
    should.not.equal(factoryInstance, undefined)

    let relayAddress = await factoryInstance.registry()
    expect(relayAddress).to.be.equal(relayInstance.address)
  })

  it('03. Deploy Wallet', async () => {
    let predictedAddress = await factoryInstance.getCreate2Address(
      accounts[0],
      {
        from: accounts[0],
      },
    )
    let tx = await factoryInstance.deployWallet()
    let walletAddress = tx.logs[0].args.addr
    console.log('Wallet    Address: ', walletAddress)
    console.log('Predicted Address: ', predictedAddress)

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

  it('04. Deploy ERC20 Token', async () => {
    let tokenInstance = await TestERC20.new()
    console.log('Token Address:', tokenInstance.address)
  })
})
