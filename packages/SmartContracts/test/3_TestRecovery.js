// ARTIFACTS

var TestRecovery = artifacts.require('TestRecovery')
const ethers = require('ethers')
const fs = require('fs')


var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
expect = chai.expect
var should = require('chai').should()

contract('Test Recovery', async accounts => {
  it('01. Deploy Recovery and Test Signature', async () => {
    let instance = await TestRecovery.new()

    let keyString = await fs.readFileSync('./test/keystring')
    let wallet = await ethers.Wallet.fromEncryptedJson(
      keyString.toString(),
      'test test test',
    )

    const hash = ethers.utils.solidityKeccak256(
      ['string', 'string'],
      [
        "test","test2"
      ],
    )

    const signature = await wallet.signMessage(ethers.utils.arrayify(hash))
    let sig = ethers.utils.splitSignature(signature)

    let signer = await instance.recover(hash, sig.v,sig.r,sig.s)
    console.log('Wallet address:', wallet.address)
    console.log('Recovered signer:', signer)

  })
})
