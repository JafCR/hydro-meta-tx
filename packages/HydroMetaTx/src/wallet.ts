import * as ethers from 'ethers'
import axios, { AxiosInstance } from 'axios'
import BigNumber from 'bignumber.js'
const logger = require('./logger.js')

ethers.errors.setLogLevel('error')

const factoryAbi = [
  'function deployWallet(address token, address to, uint256 value) returns (address)',
  'function deployWallet(uint fee, address token, address to, uint value, uint8 v, bytes32 r, bytes32 s) returns (address)',
  'function canDeploy(address owner) view returns (bool inexistent)',
  'function getCreate2Address(address owner) view returns (address)',
]

const tokenAbi = [
  'event Transfer(address indexed src, address indexed dst, uint value)',
  'function balanceOf(address owner) view returns (uint)',
]

const smartWalletAbi = require('./ABI/SmartWallet')

export default class Wallet {
  relayAPI: AxiosInstance
  address:any
  options: any
  keystore: any
  signer: any
  smartWalletAddress: string | undefined
  factoryContract: ethers.Contract
  factoryAddress: any
  provider: ethers.providers.Provider
  smartWalletContract: ethers.Contract | undefined
  ethersWallet:ethers.Wallet
  tokenAbi: any
  relayerAddress: string
  fee: any
  gasprice: any
  chainId:any



  constructor(opts: object) {
    this.options = opts
      // typeof _keystore === 'string' ? JSON.parse(_keystore) : _keystore
    // this.provider = ethers.getDefaultProvider(this.options.provider)
    this.fee = this.options.fee
    this.gasprice = this.options.gasprice
    this.factoryAddress = this.options.factoryAddress
    this.relayAPI = axios.create({
      baseURL: this.options.relayHost,
      timeout: 30000,
    })
    this.provider = new ethers.providers.JsonRpcProvider(this.options.providerAddress)
    logger.debug(`New Hydro Wallet instance. Factory: ${this.factoryAddress} `)

  }
  
  async _init() {
    this.ethersWallet = this.ethersWallet.connect(this.provider!)
    this.signer = ethers.utils.getAddress(this.ethersWallet.address)
    this.address = this.ethersWallet.address
    await this.getRelayer()
    this.factoryContract = new ethers.Contract(
      this.factoryAddress!,
      factoryAbi,
      this.ethersWallet,
    )
    await this.queryCreate2Address()
    // let network = await this.provider.getNetwork()
    // this.chainId = network.chainId

  }

  async initPrivateKey(privateKey:string) {
    this.ethersWallet = new ethers.Wallet(privateKey)
    await this._init()
  }
  
  async initKeyStore(_keystore: string, password:string) {
    this.keystore = _keystore
    this.ethersWallet = await ethers.Wallet.fromEncryptedJson(this.keystore,password)
    await this._init()  
  }
  
  get privateKey() {
    return this.ethersWallet.privateKey
  }
  

  async queryCreate2Address() {
    if (typeof this.smartWalletAddress === 'string') return this.smartWalletAddress
    this.smartWalletAddress = await this.factoryContract.getCreate2Address(this.signer)

    this.smartWalletContract = new ethers.Contract(
      this.smartWalletAddress!,
      smartWalletAbi,
      this.provider,
    )
    return this.smartWalletAddress
  }

  canDeploy() {
    return this.factoryContract.canDeploy(this.signer)
  }

  async transfer({
    token,
    decimals,
    to,
    value,
  }: {
    token: string
    decimals: number
    to: string
    value: string
    wallet: ethers.Wallet
  }): Promise<any> {
    await this.queryCreate2Address()
    logger.debug('Transfer: ', {token,decimals,to,value},{signer:this.signer, smartWalletAddress:this.smartWalletAddress})
    // Get current block number and calculate deadline block.
    let blockNumber = await this.provider.getBlockNumber()
    let deadline = blockNumber + 10

    let gaspriceInWei
    try {
      var txFee
      txFee = new BigNumber(this.fee).shiftedBy(decimals).toFixed()
      gaspriceInWei = ethers.utils.parseUnits(String(this.gasprice), 'gwei')
    } catch (e) {
      throw e
    }

    let relayer = this.relayerAddress
    let factory = this.factoryAddress
    
    let request: any = {
      token,
      gasprice: gaspriceInWei.toString(),
      to,
      value,
      fee: txFee,
      deadline,
      relayer,
      factory,
    }

    if (await this.canDeploy()) {
      const hash = ethers.utils.solidityKeccak256(
        [
          'string',
          'address',
          'address',
          'address',
          'uint',
          'uint',
          'uint',
          'uint',
        ],
        [
          'deployWalletPay',
          this.relayerAddress,
          request.token,
          request.to,
          request.gasprice,
          request.fee,
          request.value,
          request.deadline,
        ],
      )
      const sig = await this.ethersWallet.signMessage(ethers.utils.arrayify(hash))
      request.sig = sig
      
      let result = await  this.relayAPI.post('/deploySend', request)
      logger.debug('Transfer result: ', result.data)
      return result
    } else {
      request.smartWallet = this.smartWalletAddress
      request.nonce = ethers.utils
        .bigNumberify(
          await this.smartWalletContract!.store(
            ethers.utils.formatBytes32String('nonce'),
          ),
        )
        .toString()

      var hash = ethers.utils.solidityKeccak256(
        [
          'string',
          'address',
          'address',
          'address',
          'uint',
          'uint',
          'uint',
          'uint',
          'uint'
        ],
        [
          'pay',
          this.relayerAddress,
          request.to,
          request.token,
          request.value,
          request.fee,
          request.gasprice,
          request.nonce,
          request.deadline
        ],
      )
      const sig = await this.ethersWallet.signMessage(ethers.utils.arrayify(hash))

      request.sig = sig
      let result = await  this.relayAPI.post('/send', request)
      logger.debug('Transfer result: ', result.data)
      return result
    }
  }



  async getRelayer() {
    const response = await this.relayAPI.get('/relayerAddress')
    this.relayerAddress = response.data.relayer
    
  }
  async getRelayFee(
    token: string,
    estimatedGas: ethers.utils.BigNumber,
  ): Promise<{ fee: string; gwei: number }> {
    // token = token.toUpperCase()
    const response = await this.relayAPI.post('/calculateFee', {
      token,
      gas: estimatedGas.toString(),
    })
    const result = {
      fee: new BigNumber(response.data.amount).toPrecision(),
      gwei: Number(response.data.gwei),
    }
    return result
  }

  async calculateFee(
    walletOrPassword: ethers.Wallet | string,
    token: string,
    to: string = '0x0000000000000000000000000000000000000001',
    value: string = '0',
    gas?: string,
  ): Promise<{ gwei: number; gas: string; fee: string }> {
    const wallet = await this.getWallet(walletOrPassword)

    let estimatedGas = new ethers.utils.BigNumber(
      gas || (await this.calculateGas(wallet, token, to, value)),
    )
    const { fee, gwei } = await this.getRelayFee(token, estimatedGas)
    return { gwei, gas: estimatedGas.toString(), fee }
  }

  async calculateGas(
    walletOrPassword: string | ethers.Wallet,
    token: string,
    to: string = '0x0000000000000000000000000000000000000001',
    value = '0',
  ) {
    const wallet = await this.getWallet(walletOrPassword)
    if (await this.canDeploy()) {
      return this.calcDeploySendGas(wallet, token, to, value)
    } else {
      return this.calcSendGas(wallet, token, to, value)
    }
  }

  async calcDeploySendGas(
    walletOrPassword: string | ethers.Wallet,
    token: string,
    to: string,
    value: string,
  ) {
    const wallet = await this.getWallet(walletOrPassword)
    await this.queryCreate2Address()

    var request = {
      gasprice: '0',
      to,
      token,
      value,
      fee: '0',
    }
    var hash = ethers.utils.solidityKeccak256(
      ['address', 'address', 'address', 'address', 'uint', 'uint', 'uint'],
      [
        this.options.factory,
        this.options.relayAddress,
        token,
        request.to,
        request.gasprice,
        request.fee,
        request.value,
      ],
    )

    var sig = ethers.utils.splitSignature(
      await wallet.signMessage(ethers.utils.arrayify(hash)),
    )
    return this.factoryContract.estimate[
      'deployWallet(uint256,address,address,uint256,uint8,bytes32,bytes32)'
    ](request.fee, token, request.to, request.value, sig.v, sig.r, sig.s, {
      from: this.options.relayAddress,
      gasPrice: ethers.utils.parseUnits(request.gasprice, 'wei'),
    })
  }

  async calcSendGas(
    walletOrPassword: string | ethers.Wallet,
    token: string,
    to: string,
    value: string,
  ) {
    const wallet = await this.getWallet(walletOrPassword)
    await this.queryCreate2Address()

    var request = {
      gasprice: '0',
      to,
      value,
      nonce: ethers.utils
        .bigNumberify(
          await this.smartWalletContract!.store(
            ethers.utils.formatBytes32String('nonce'),
          ),
        )
        .toString(),
      fee: '0',
      token,
    }
    var hash = ethers.utils.solidityKeccak256(
      [
        'address',
        'address',
        'address',
        'address',
        'uint',
        'uint',
        'uint',
        'uint',
      ],
      [
        this.options.relayAddress,
        request.to,
        token,
        this.options.factory,
        request.value,
        request.fee,
        request.gasprice,
        request.nonce,
      ],
    )
    var sig = ethers.utils.splitSignature(
      await wallet.signMessage(ethers.utils.arrayify(hash)),
    )

    return this.smartWalletContract!.estimate[
      'pay(address,uint256,uint256,address,uint8,bytes32,bytes32)'
    ](request.to, request.value, request.fee, token, sig.v, sig.r, sig.s, {
      from: this.options.relayAddress,
      gasPrice: ethers.utils.parseUnits(request.gasprice, 'wei'),
    })
  }

  async estimateDirectTransfer(
    walletOrPassword: string | ethers.Wallet,
    token: string,
    to: string = '0x0000000000000000000000000000000000000001',
    value: string = '0',
    canDeploy?: boolean,
  ): Promise<string> {
    await this.queryCreate2Address()
    const wallet = await this.getWallet(walletOrPassword)
    if (typeof canDeploy === 'undefined') {
      canDeploy = await this.canDeploy()
    }
    if (canDeploy) {
      const factory = new ethers.Contract(
        this.options.factory,
        factoryAbi,
        wallet,
      )
      return (
        await factory.estimate['deployWallet(address,address,uint256)'](
          this.options.tokens[token].address,
          to,
          value,
        )
      ).toString()
    } else {
      const smartWallet = new ethers.Contract(
        this.smartWalletAddress!,
        smartWalletAbi,
        wallet,
      )
      return (
        await smartWallet.estimate['pay(address,uint256,address)'](
          to,
          value,
          this.options.tokens[token].address,
        )
      ).toString()
    }
  }

  async directTransfer({
    walletOrPassword,
    token,
    to,
    value,
    gwei,
    gas,
  }: {
    token: string
    to: string
    gwei: number
    value: string
    walletOrPassword: ethers.Wallet | string
    gas?: string
  }) {
    const wallet = await this.getWallet(walletOrPassword)
    const canDeploy = await this.canDeploy()
    if (typeof gas === 'undefined') {
      gas = await this.estimateDirectTransfer(
        wallet,
        token,
        to,
        value,
        canDeploy,
      )
    }
    await this.queryCreate2Address()

    if (canDeploy) {
      const factory = new ethers.Contract(
        this.options.factory,
        factoryAbi,
        wallet,
      )
      return await factory.functions['deployWallet(address,address,uint256)'](
        this.options.tokens[token].address,
        to,
        value,
        {
          gasPrice: ethers.utils.parseUnits(String(gwei), 'gwei'),
        },
      )
    } else {
      const smartWallet = new ethers.Contract(
        this.smartWalletAddress!,
        smartWalletAbi,
        wallet,
      )
      return await smartWallet.functions['pay(address,uint256,address)'](
        to,
        value,
        this.options.tokens[token].address,
        { gasPrice: ethers.utils.parseUnits(String(gwei), 'gwei') },
      )
    }
  }

  async getWallet(
    walletOrPassword: string | ethers.Wallet,
  ): Promise<ethers.Wallet> {
    if (typeof walletOrPassword === 'string') {
      try {
        return (
          await ethers.Wallet.fromEncryptedJson(
            JSON.stringify(this.keystore),
            walletOrPassword,
          )
        ).connect(this.provider)
      } catch (e) {
        throw 'Incorrect password'
      }
    } else {
      walletOrPassword = walletOrPassword.connect(this.provider)
      return walletOrPassword
    }
  }

  async estimateTransferEth(
    to: string = '0x0000000000000000000000000000000000000001',
    value: string = '0',
  ): Promise<string> {
    return (
      await this.provider.estimateGas({
        from: this.signer,
        to,
        value,
      })
    ).toString()
  }

  async transferEth({
    walletOrPassword,
    to,
    value,
    gas,
    gwei,
  }: {
    to: string
    value: string
    walletOrPassword: string | ethers.Wallet
    gas: number
    gwei: number
  }): Promise<ethers.providers.TransactionResponse> {
    const wallet = await this.getWallet(walletOrPassword)
    return await wallet.sendTransaction({
      to,
      value,
      gasLimit: gas,
      gasPrice: gwei,
    })
  }

  async getTokenBalance(address: string): Promise<string> {
    await this.queryCreate2Address()
    let tokenContract = new ethers.Contract(address, tokenAbi, this.provider)
    let balance = await tokenContract.balanceOf(this.smartWalletAddress)
    return balance.toString()
  }

  async getEthBalance(): Promise<string> {
    const balance = await this.provider.getBalance(this.signer)
    return balance.toString()
  }
}
