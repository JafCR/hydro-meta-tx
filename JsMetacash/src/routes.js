const express = require('express')
const router = express.Router()

const ethers = require('ethers')

const factory = '0xfF31D05ADFfe69793C6E29Ec87d299262Dd89a82'
const factoryAbi = [
  'function deployWalletPay(uint fee, address token, address to, uint value, uint8 v, bytes32 r, bytes32 s) returns (address)',
  'function deployWallet(uint fee, address token, address to, uint value, uint8 v, bytes32 r, bytes32 s) returns (address)',
  'function canDeploy(address owner) view returns (bool inexistent)',
  'function getCreate2Address(address owner) view returns (address)',
]
const privateKey =
  '0xa8dd4ec9307f3473d65991ddd1935e582cf0a122b9740c6bc06bd08a994e1b8a'
const provider = new ethers.providers.JsonRpcProvider()

var relayerWallet = new ethers.Wallet(privateKey, provider)

const bodyParser = require('body-parser')

router.get('/test', function(req, res) {
  res.send({ type: 'GET' })
  console.log('test request')
})

router.post('/deploySend', async function(req, res) {
  console.log(req.body)
  let request = req.body
  let sig = ethers.utils.splitSignature(request.sig)
  console.log(sig)
  let balance = await relayerWallet.getBalance()
  console.log(balance.toString())

  let factoryContract = new ethers.Contract(factory, factoryAbi, relayerWallet)
  await factoryContract.deployWallet(
    request.fee,
    request.token,
    request.to,
    request.value,
    sig.v,
    sig.r,
    sig.s,
  )
  res.send({ result: true })
  console.log('/deploySend')
})

module.exports = router
