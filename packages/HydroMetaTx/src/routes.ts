const exp = require('express')
const router = exp.Router()
const LoggerR = require('./logger.js')
const ethers = require('ethers')

const loggerRoutes = new LoggerR().getLogger()

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

function relayerWallet(privateKey:string) {
  const provider = new ethers.providers.JsonRpcProvider()
  provider.pollingInterval = 500
  return new ethers.Wallet(privateKey, provider)
}

async function getChainId(privateKey:string) {

  let rw = relayerWallet(privateKey)
  let network = await rw.provider.getNetwork()
  return network.chainId

}


router.get('/relayerAddress', async function(req, res) {
  let result = {relayer:relayerWallet(req.privateKey).address}
  loggerRoutes.debug('Response', result)
  res.send(result)
})

router.post('/deploySend', async function(req, res) {
  let request = req.body
  let sig = ethers.utils.splitSignature(request.sig)
  let factory = request.factory

  let factoryContract = new ethers.Contract(factory, factoryAbi, relayerWallet(req.privateKey))

  factoryContract.on('Deployed', async (addr:string, owner:string) => {
    let result = {
      contract: addr,
      owner: owner,
    }
    loggerRoutes.debug('Response:', result)
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
    loggerRoutes.error(e)
    loggerRoutes.error(tx)
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
    loggerRoutes.debug('Response:', result)
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
    loggerRoutes.error(e)
    loggerRoutes.error(tx)
  }
})

module.exports = router
