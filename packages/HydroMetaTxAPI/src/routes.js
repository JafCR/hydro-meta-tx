const express = require('express')
const router = express.Router()

const ethers = require('ethers')

const factoryAbi = [
  'function deployWalletPay(uint fee, address token, address to, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s)  public returns (address addr)',
  'event Deployed(address indexed addr, address indexed owner)',
  'function deployWallet(uint fee, address token, address to, uint value, uint8 v, bytes32 r, bytes32 s) returns (address)',
  'function canDeploy(address owner) view returns (bool inexistent)',
  'function getCreate2Address(address owner) view returns (address)',
]

const SmartWalletABI = [
  'function deployWalletPay(uint fee, address token, address to, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s)  public returns (address addr)',
  'function pay(address to, uint value, uint fee, address tokenContract, uint deadline, uint8 v, bytes32 r, bytes32 s) public returns (bool)',
  'event Paid(address from, address to, address tokenContract, uint value,uint fee)'
]

const privateKey =
  '0x52cc5ff4d4278a74fd5b1405ef9d52a5ef9a7e215973b13f466267870c67287b'

const provider = new ethers.providers.JsonRpcProvider()
provider.pollingInterval = 500

var relayerWallet = new ethers.Wallet(privateKey, provider)
console.log('Address: ', relayerWallet.address)

router.get('/relayerAddress', async function(req, res) {
  console.log(relayerWallet.address)
  res.send({ relayer: relayerWallet.address })
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

  factoryContract.on('Deployed', (addr, owner) => {
    console.log('Deployed: ', owner, addr)
    let result = {
      contract: addr,
      owner: owner,
    }
    res.send(result)
  })
  var tx
  try {
    tx = await factoryContract.deployWalletPay(
      request.fee,
      request.token,
      request.to,
      request.value,
      request.deadline,
      sig.v,
      sig.r,
      sig.s,
      {
        gasPrice: ethers.utils.parseUnits(request.gasprice, 'wei'),
        chainId: 158372674,
      },
    )
  } catch (e) {
    console.log(e)
    console.log(tx)
  }
})

router.post('/send', async function(req, res) {
  console.log(req.body)
  let request = req.body
  let sig = ethers.utils.splitSignature(request.sig)
  let smartWallet = request.smartWallet

  let smartWalletContract = new ethers.Contract(
    smartWallet,
    SmartWalletABI,
    relayerWallet,
  )

  smartWalletContract.on('Paid', (from, to, token, value, fee) => {
    console.log(`From: ${from} To: ${to} Token:${token} Value:${value} Fee: ${fee}`)
    let result = {
      from,
      to,
      token,
      value,
      fee,
    }
    res.send(result)
  })
  var tx
  console.log('Nonce: ', request.nonce)
  try {
    tx = await smartWalletContract.pay(
      request.to,
      request.value,
      request.fee,
      request.token,
      request.deadline,
      sig.v,
      sig.r,
      sig.s,
      {
        gasPrice: ethers.utils.parseUnits(request.gasprice, 'wei'),
        chainId: 158372674,
      },
    )
  } catch (e) {
    console.log(e)
    console.log(tx)
  }
})

module.exports = router
