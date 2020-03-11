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

function relayerWallet(privateKey) {

  const provider = new ethers.providers.JsonRpcProvider()
  provider.pollingInterval = 500
  return new ethers.Wallet(privateKey, provider)

}

async function getChainId(privateKey) {

  let rw = relayerWallet(privateKey)
  let network = await rw.provider.getNetwork()
  return network.chainId

}


router.get('/relayerAddress', async function(req, res) {
  console.log('Response: ', {relayer:relayerWallet(req.privateKey).address})
  res.send({ relayer: relayerWallet(req.privateKey).address })
})

router.post('/deploySend', async function(req, res) {
  let request = req.body
  let sig = ethers.utils.splitSignature(request.sig)
  let factory = request.factory

  let factoryContract = new ethers.Contract(factory, factoryAbi, relayerWallet(req.privateKey))

  factoryContract.on('Deployed', async (addr, owner) => {
    let result = {
      contract: addr,
      owner: owner,
    }
    console.log('Response:', result)
    res.send(result)
  })
  var tx
  let _chainId = await getChainId(req.privateKey)
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
        chainId: _chainId,
      },
    )
  } catch (e) {
    console.log(e)
    console.log(tx)
  }
})

router.post('/send', async function(req, res) {
  let request = req.body
  let sig = ethers.utils.splitSignature(request.sig)
  let smartWallet = request.smartWallet

  let smartWalletContract = new ethers.Contract(
    smartWallet,
    SmartWalletABI,
    relayerWallet(req.privateKey),
  )

  smartWalletContract.on('Paid', (from, to, token, value, fee) => {
    let result = {
      from,
      to,
      token,
      value,
      fee,
    }
    console.log('Response:', result)
    res.send(result)
  })
  var tx
  let _chainId = await getChainId(req.privateKey)
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
        chainId: _chainId
      },
    )
  } catch (e) {
    console.log(e)
    console.log(tx)
  }
})

module.exports = router
