const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const BN = require('bignumber.js')
const sleep = require('sleep')
const fs = require('fs')
const ethers = require('ethers')
const Contract = ethers.Contract

const HydroTxAPI = require('../index.js').api
const Relayer = require('../index.js').relayer

let relayer = new Relayer()
const RELAYER_PORT = 44444
var relayerInstance = relayer.start(RELAYER_PORT)

chai.use(chaiAsPromised)
expect = chai.expect
var hydro
var privateKey
var swAddress
var swKeystore

var dummyFactoryAddress = '0xDc5ceEE4A36133a4b31285675545CD230B09A5c4'

describe('Test', async function(accounts) {

  after(()=>{
    relayerInstance.close()
  })


  this.timeout(10000)
  before(async () => {})

  it('01. Deploy Hydro-Meta-Tx', async () => {
    hydro = new HydroTxAPI.default({
      factoryAddress: dummyFactoryAddress,
      fee:'1000',
      gasprice:'10',
      providerAddress:'http://localhost:8545',
      relayHost: `http://127.0.0.1:${RELAYER_PORT}`
    })
    expect(hydro.factoryAddress).to.be.equal(dummyFactoryAddress)
  })

  it('02. Create new Smart Wallet', async () => {
    let password = 'test test test'
    let {smartWallet} = await hydro.createSmartWallet(password)
    let relayerAddress = smartWallet.relayerAddress

    expect(relayerAddress).to.be.not.equal(undefined)
    console.log('     Relayer Address: ', relayerAddress)

    privateKey = smartWallet.privateKey
    swAddress = smartWallet.address
    swKeystore = smartWallet.keystore
    console.log('     Smart Wallet Private Key: ', privateKey  )
    console.log('     Smart Wallet Address    : ', swAddress  )
  })

  it('03. Deploy Smart Wallet From PrivateKey', async () => {
    let password = 'test test test'
    smartWallet = await hydro.importPrivateKey(privateKey)
    let relayerAddress = smartWallet.relayerAddress

    expect(relayerAddress).to.be.not.equal(undefined)
    console.log('     Relayer Address: ', relayerAddress)

    console.log('     Smart Wallet Private Key: ', privateKey  )
    console.log('     Smart Wallet Address    : ', swAddress  )

    expect (smartWallet.privateKey).to.be.equal(privateKey)
    expect (smartWallet.address).to.be.equal(swAddress)
  })

  it('04. Deploy Smart Wallet From Keystore', async () => {
    let password = 'test test test'
    smartWallet = await hydro.importKeyStore(swKeystore,password)
    let relayerAddress = smartWallet.relayerAddress

    expect(relayerAddress).to.be.not.equal(undefined)
    console.log('     Relayer Address: ', relayerAddress)

    console.log('     Smart Wallet Private Key: ', privateKey  )
    console.log('     Smart Wallet Address    : ', swAddress  )

    expect (smartWallet.privateKey).to.be.equal(privateKey)
    expect (smartWallet.address).to.be.equal(swAddress)
  })


})
