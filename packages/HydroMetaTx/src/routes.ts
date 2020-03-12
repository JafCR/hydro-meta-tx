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

function relayerWallet(provider:any,privateKey:string) {
  // provider.pollingInterval = 500
  return new ethers.Wallet(privateKey, provider)
}

async function getChainId(provider:any, privateKey:string) {

  let rw = relayerWallet(provider,privateKey)
  let network = await rw.provider.getNetwork()
  return network.chainId

}


router.get('/relayerAddress', async function(req, res) {
  let result = {relayer:relayerWallet(req.provider,req.privateKey).address}
  req.logger.debug('Response', result)
  res.send(result)
})

router.post('/deploySend', async function(req, res) {
  let request = req.body
  let sig = ethers.utils.splitSignature(request.sig)
  let factory = request.factory

  let factoryContract = new ethers.Contract(factory, factoryAbi, relayerWallet(req.provider,req.privateKey))

  factoryContract.once('Deployed', async (addr:string, owner:string) => {
    let result = {
      contract: addr,
      owner: owner,
    }
    req.logger.debug('Response:', result)
    factoryContract.removeAllListeners('Deployed')
    res.send(result)
  })
  var tx
  let _chainId = await getChainId(req.provider,req.privateKey)
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
    req.logger.error(e)
    req.logger.error(tx)
  }
})

router.post('/send', async function(req, res) {
  let request = req.body
  let sig = ethers.utils.splitSignature(request.sig)
  let smartWallet = request.smartWallet

  let smartWalletContract = new ethers.Contract(
    smartWallet,
    SmartWalletABI,
    relayerWallet(req.provider,req.privateKey),
  )
  smartWalletContract.once('Paid', (from, to, token, value, fee) => {
    let result = {
      from,
      to,
      token,
      value,
      fee,
    }
    req.logger.debug('Response:', result)
    smartWalletContract.removeAllListeners("Paid")
    res.send(result)
  })
  var tx
  let _chainId = await getChainId(req.provider,req.privateKey)
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
    req.logger.error(e)
    req.logger.error(tx)
  }
})

module.exports = router
