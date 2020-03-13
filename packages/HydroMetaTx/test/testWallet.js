const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const BN = require('bignumber.js')
const sleep = require('sleep')
const fs = require('fs')
const ethers = require('ethers')
const Contract = ethers.Contract

const HydroTxAPI = require('../index.js').api
const Relayer = require('../index.js').relayer

const port = 4444
const pk = '0x52cc5ff4d4278a74fd5b1405ef9d52a5ef9a7e215973b13f466267870c67287b'
let providerAddress ="http://localhost:8545"
let infuraNetwork = 'kovan'
let infuraAccessToken = '22451fcb5a704706b3a6da4a757a1a93'
const loggerOptions = {
  prefix:"",
  directory:"",
  // level:"debug"
  level:"info"
}
var relayerInstance

chai.use(chaiAsPromised)
expect = chai.expect
var hydro
var privateKey
var signer
var swaddress
var swKeystore
var relayer

var factoryAddress = '0x68e7FAFC6fFe9151D87122dB0dA1cF67902406A0'

describe('Test', async function(accounts) {

  this.timeout(10000)

  after(()=>{
    relayer.stop()
  })

  before(async () => {
  relayer = new Relayer()
  console.log(relayer)
  console.log(Relayer)
  let instance = await relayer.start({privateKey:pk,providerAddress,port:port},{})
  // console.log(instance)

  })

  it('01. Deploy Hydro-Meta-Tx', async () => {
    hydro = new HydroTxAPI.default({
      factoryAddress: factoryAddress,
      providerAddress:'http://localhost:8545',
      relayHost: `http://127.0.0.1:${port}`
    })
    expect(hydro.factoryAddress).to.be.equal(factoryAddress)
  })

  it('02. Create new Smart Wallet', async () => {
    let password = 'test test test'
    let {smartWallet} = await hydro.createSmartWallet(password)
    let relayerAddress = smartWallet.relayerAddress

    console.log('     Relayer Address         : ', relayerAddress)
    expect(relayerAddress).to.be.not.equal(undefined)

    privateKey = smartWallet.privateKey
    signer = smartWallet.address
    swKeystore = smartWallet.keystore
    swaddress = smartWallet.smartWalletAddress
    console.log('     Smart Wallet Private Key: ', privateKey  )
    console.log('     Smart Wallet Signer     : ', signer  )
    console.log('     Smart Wallet Address    : ', swaddress  )
  })

  it('03. Deploy Smart Wallet From PrivateKey', async () => {
    let password = 'test test test'
    smartWallet = await hydro.importPrivateKey(privateKey)
    let relayerAddress = smartWallet.relayerAddress

    expect(relayerAddress).to.be.not.equal(undefined)
    console.log('     Relayer Address         : ', relayerAddress)

    console.log('     Smart Wallet Private Key: ', privateKey  )
    console.log('     Smart Wallet Signer     : ', signer  )
    console.log('     Smart Wallet Address    : ', swaddress  )

    expect (smartWallet.privateKey).to.be.equal(privateKey)
    expect (smartWallet.address).to.be.equal(signer)
    expect (smartWallet.smartWalletAddress).to.be.equal(swaddress)
  })

  it('04. Deploy Smart Wallet From Keystore', async () => {
    let password = 'test test test'
    smartWallet = await hydro.importKeyStore(swKeystore,password)
    let relayerAddress = smartWallet.relayerAddress

    expect(relayerAddress).to.be.not.equal(undefined)
    console.log('     Relayer Address         : ', relayerAddress)

    console.log('     Smart Wallet Private Key: ', privateKey  )
    console.log('     Smart Wallet Signer     : ', signer  )
    console.log('     Smart Wallet Address    : ', swaddress  )

    expect (smartWallet.privateKey).to.be.equal(privateKey)
    expect (smartWallet.address).to.be.equal(signer)
    expect (smartWallet.smartWalletAddress).to.be.equal(swaddress)
  })


})
