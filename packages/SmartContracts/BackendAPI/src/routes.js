const express = require('express')
const router = express.Router()

const ethers = require('ethers')

const factoryAbi = [
  'function deployWalletPay2(uint fee, address token, address to, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s)  public returns (address addr)',
  // 'function deployWalletPay(uint fee, address token, address to, uint value, uint8 v, bytes32 r, bytes32 s) returns (address)',
  'function deployWallet(uint fee, address token, address to, uint value, uint8 v, bytes32 r, bytes32 s) returns (address)',
  'function canDeploy(address owner) view returns (bool inexistent)',
  'function getCreate2Address(address owner) view returns (address)',
]
const privateKey =
  '0x52cc5ff4d4278a74fd5b1405ef9d52a5ef9a7e215973b13f466267870c67287b'

const provider = new ethers.providers.JsonRpcProvider()
// const ganache = require('ganache-cli')
// const provider = new ethers.providers.Web3Provider(ganache.provider())

var relayerWallet = new ethers.Wallet(privateKey, provider)

router.get('/test', async function(req, res) {
  res.send({ type: 'GET' })
})

router.post('/deploySend', async function(req, res) {
  console.log(req.body)
  let request = req.body
  let sig = ethers.utils.splitSignature(request.sig)
  let factory = request.factory
  let balance = await relayerWallet.getBalance()
  console.log(balance.toString())

  let factoryContract = new ethers.Contract(factory, factoryAbi, relayerWallet)
  console.log('Gas Price: ', request.gasprice)

  let tx = await factoryContract.deployWalletPay2(
    request.fee,
    request.token,
    request.to,
    request.value,
    request.deadline,
    sig.v,
    sig.r,
    sig.s,
    { gasPrice: ethers.utils.parseUnits(request.gasprice, 'wei') },
  )

  let receipt = await tx.wait(1)
  console.log(receipt.events)
  res.send({ result: true })
  console.log('/deploySend')
})

module.exports = router
